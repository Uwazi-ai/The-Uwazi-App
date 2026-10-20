// Coordinator-only phone ride intake. Same seat, site hours and destination
// rules as create-ride-request, but pickups under 24 hours away are allowed.
// Never accepts or stores vote choices.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { loadServiceDays, siteFitsWave, waveLoads, WAVE_FULL_MSG, WAVE_SITE_MSG } from "../_shared/rides.ts";
import { sendRideSms } from "../_shared/ride-sms.ts";
import { miles, openSites } from "../_shared/ride-sites.ts";
import { pollingPlaceFor } from "../_shared/kceb-precincts.ts";
import { checkEligibility, LOOKUP_FAILED_MSG, OUT_OF_AREA_MSG } from "../_shared/ride-eligibility.ts";
import { startRiderConfirmation } from "../_shared/rider-emails.ts";

const NEEDS = ["wheelchair", "walker", "service_animal", "child_seat", "extra_time", "language_help", "other"] as const;

const Body = z.object({
  first_name_last_initial: z.string().trim().regex(/^[A-Za-z][A-Za-z'\- ]{0,40} [A-Za-z]\.?$/),
  phone: z.string().trim().max(20),
  email: z.string().trim().toLowerCase().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).optional(),
  pickup_address: z.string().trim().min(5).max(200),
  zip: z.string().trim().regex(/^\d{5}$/),
  ride_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickup_time: z.string().regex(/^\d{2}:\d{2}$/),
  round_trip: z.boolean().default(true),
  needs: z.array(z.enum(NEEDS)).max(7).default([]),
  texts_ok: z.boolean().default(false),
  destination_site_id: z.string().uuid().optional(),
  ward: z.string().regex(/^\d{1,3}$/).optional(),
  precinct: z.string().regex(/^\d{1,3}$/).optional(),
}).strict();

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Central time "now" as minutes since epoch in local wall clock terms.
function centralNow(): Date {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
  return new Date(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: claims } = await userClient.auth.getClaims(auth.slice(7));
  const uid = claims?.claims?.sub;
  if (!uid) return json({ error: "Please sign in." }, 401);
  const { data: isCoord } = await userClient.rpc("is_ride_coordinator", { _user_id: uid });
  if (!isCoord) return json({ error: "This is for ride coordinators." }, 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Please check your details.", fields: parsed.error.flatten().fieldErrors }, 400);
  const b = parsed.data;

  const digits = b.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (!/^[2-9]\d{9}$/.test(digits)) return json({ error: "Please enter a 10 digit phone number." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: settings } = await db.from("ride_settings").select("*").eq("id", true).single();
  if (!settings) return json({ error: "Rides are not open yet." }, 503);

  const isElectionDay = b.ride_day === settings.election_day;
  const isEarly = b.ride_day >= settings.early_start && b.ride_day <= settings.early_end;
  if (!isElectionDay && !isEarly) return json({ error: "Pick a day during early voting or Election Day." }, 400);

  // Locked schedule: only ride_service_days, only their wave times.
  const svc = (await loadServiceDays(db)).get(b.ride_day);
  if (!svc || !svc.waves.includes(b.pickup_time)) return json({ error: "That pickup time is not available. Pick another time." }, 400);

  const pickup = new Date(`${b.ride_day}T${b.pickup_time}:00`);
  // Coordinators may book last minute, but not a pickup that already passed.
  if (pickup.getTime() + 36e5 <= centralNow().getTime()) return json({ error: "That pickup time has passed. Pick a later time." }, 400);

  const wave = (await waveLoads(db, b.ride_day)).get(`${b.ride_day} ${b.pickup_time}`) ?? { count: 0, site_id: null };
  const turnAway = async () => {
    await db.from("ride_turnaways").insert({ ride_day: b.ride_day, pickup_time: b.pickup_time, source: "phone" });
    return json({ error: WAVE_FULL_MSG, code: "full" }, 409);
  };
  if (wave.count >= settings.seats_per_slot) return await turnAway();
  // The budget covers scheduled driver blocks, so no ride is referred for cost.
  const referred = false;

  // Destination: only verified sites, never invented.
  let site: { id: string; name: string; address: string } | null = null;
  const siteCols = "id,name,address";
  // KCEB area only: Kansas City city limits inside Jackson County.
  const elig = await checkEligibility(b.pickup_address, b.zip, db);
  if (elig.status === "out_of_area") return json({ error: OUT_OF_AREA_MSG, code: "out_of_area" }, 400);
  // Geocoder failed: never guess. The coordinator confirms the address by phone.
  if (isEarly) {
    // Only the KCEB early sites, open at pickup and 1 hour after.
    const open = (await openSites(db, b.ride_day)).filter((x) => siteFitsWave(x, b.pickup_time))
      // An early wave goes to one site: the first booking sets it.
      .filter((x) => !wave.site_id || x.id === wave.site_id);
    if (b.destination_site_id) {
      const pick = open.find((x) => x.id === b.destination_site_id);
      if (!pick) return json({ error: wave.site_id ? WAVE_SITE_MSG : "That voting place is not open at that time. Pick another place or time." }, wave.site_id ? 409 : 400);
      site = pick;
    } else if (open.length && elig.status === "eligible") {
      site = open
        .map((x) => ({ x, d: x.lat != null && x.lon != null ? miles(elig.lat, elig.lon, x.lat, x.lon) : 1e9 }))
        .sort((a, c) => a.d - c.d)[0].x;
    } else if (open.length) {
      return json({ error: "Please pick a voting place." }, 400);
    } else {
      return json({ error: wave.site_id ? WAVE_SITE_MSG : "No early voting place is open at that time. Pick another day or time." }, wave.site_id ? 409 : 400);
    }
  } else if (b.destination_site_id) {
    const { data } = await db.from("voter_guide_sites").select(siteCols).eq("id", b.destination_site_id)
      .eq("verification_status", "verified").eq("site_type", "polling").maybeSingle();
    site = data;
  } else if (elig.status === "eligible" && elig.precinct_key) {
    // Election Day: precinct from the KCEB map. No match keeps needs_destination.
    site = await pollingPlaceFor(db, elig.precinct_key);
  } else if (b.ward && b.precinct) {
    const { data } = await db.from("voter_guide_sites").select(siteCols).eq("site_type", "polling")
      .eq("verification_status", "verified").eq("precinct_key", `${Number(b.ward)}-${Number(b.precinct)}`).limit(1).maybeSingle();
    site = data;
  }

  const { data: row, error } = await db.from("ride_requests").insert({
    first_name_last_initial: b.first_name_last_initial,
    phone: digits,
    email: b.email ?? null,
    pickup_address: b.pickup_address,
    zip: b.zip,
    destination_site_id: site?.id ?? null,
    needs_destination: !site,
    ride_day: b.ride_day,
    pickup_time: b.pickup_time,
    round_trip: b.round_trip,
    needs: b.needs,
    texts_ok: settings.sms_live === true && b.texts_ok,
    source: "phone",
    status: referred ? "referred" : "requested",
  }).select("id,ride_code,card_token").single();
  if (error?.message?.includes("wave_full")) return await turnAway();
  if (error?.message?.includes("wave_site")) return json({ error: WAVE_SITE_MSG, code: "wave_site" }, 409);
  if (error || !row) {
    console.error("ride insert failed");
    return json({ error: "We could not save your ride. Please call the ride line." }, 500);
  }
  await db.from("ride_events").insert({
    request_id: row.id,
    event_type: referred ? "referred" : "requested",
    to_status: referred ? "referred" : "requested",
    actor: uid,
    note: `phone request entered by coordinator${site ? "" : ". needs destination"}`,
  });

  if (b.email) startRiderConfirmation(db, row.id);
  await sendRideSms(db, referred ? "referred" : "request_received", {
    id: row.id, ride_code: row.ride_code, card_token: row.card_token, phone: digits, texts_ok: settings.sms_live === true && b.texts_ok,
    ride_day: b.ride_day, pickup_time: b.pickup_time, needs_destination: !site, site,
  }, uid);

  return json({
    ride_code: row.ride_code,
    card_token: row.card_token,
    destination: site ? { name: site.name, address: site.address } : null,
    needs_destination: !site,
    referred,
  });
});

