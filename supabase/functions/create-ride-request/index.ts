// Public ride request intake for Rides to the Polls. Only this function writes
// ride_requests from the public. Never accepts or stores vote choices.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const NEEDS = ["wheelchair", "walker", "service_animal", "child_seat", "extra_time", "language_help", "other"] as const;

const Body = z.object({
  first_name_last_initial: z.string().trim().regex(/^[A-Za-z][A-Za-z'\- ]{0,40} [A-Za-z]\.?$/),
  phone: z.string().trim().max(20),
  pickup_address: z.string().trim().min(5).max(200),
  zip: z.string().trim().regex(/^\d{5}$/),
  ride_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickup_time: z.string().regex(/^\d{2}:00$/),
  round_trip: z.boolean().default(true),
  needs: z.array(z.enum(NEEDS)).max(7).default([]),
  texts_ok: z.boolean().default(false),
  source: z.enum(["web", "phone"]).default("web"),
  destination_site_id: z.string().uuid().optional(),
  ward: z.string().regex(/^\d{1,3}$/).optional(),
  precinct: z.string().regex(/^\d{1,3}$/).optional(),
}).strict();

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ride:" + v));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Central time "now" as minutes since epoch in local wall clock terms.
function centralNow(): Date {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
  return new Date(s);
}

async function countyFips(address: string, zip: string): Promise<{ state: string; county: string } | null> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(
      `${address} ${zip}`,
    )}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Counties&format=json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const c = j?.result?.addressMatches?.[0]?.geographies?.Counties?.[0];
    if (!c) return null;
    return { state: c.STATE === "29" ? "MO" : c.STATE === "20" ? "KS" : c.STATE, county: `${c.STATE}${c.COUNTY}` };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Please check your details.", fields: parsed.error.flatten().fieldErrors }, 400);
  const b = parsed.data;

  const digits = b.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (!/^[2-9]\d{9}$/.test(digits)) return json({ error: "Please enter a 10 digit phone number." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Rate limits: 3 per phone per day, 10 per IP per hour.
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const [phoneHash, ipHash] = await Promise.all([sha(digits), sha(ip)]);
  const dayAgo = new Date(Date.now() - 864e5).toISOString();
  const hourAgo = new Date(Date.now() - 36e5).toISOString();
  const [{ count: pc }, { count: ic }] = await Promise.all([
    db.from("ride_rate_limits").select("id", { count: "exact", head: true }).eq("phone_hash", phoneHash).gte("created_at", dayAgo),
    db.from("ride_rate_limits").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo),
  ]);
  if ((pc ?? 0) >= 3 || (ic ?? 0) >= 10) return json({ error: "Too many requests. Please call the ride line." }, 429);
  await db.from("ride_rate_limits").insert({ phone_hash: phoneHash, ip_hash: ipHash });

  const { data: settings } = await db.from("ride_settings").select("*").eq("id", true).single();
  if (!settings) return json({ error: "Rides are not open yet." }, 503);

  const isElectionDay = b.ride_day === settings.election_day;
  const isEarly = b.ride_day >= settings.early_start && b.ride_day <= settings.early_end;
  if (!isElectionDay && !isEarly) return json({ error: "Pick a day during early voting or Election Day." }, 400);

  const dow = new Date(`${b.ride_day}T12:00:00Z`).getUTCDay();
  const hour = Number(b.pickup_time.slice(0, 2));
  // Pickup windows leave room for the ride home.
  const okHour = dow >= 1 && dow <= 5 ? hour >= 11 && hour <= 16 : dow === 6 ? hour >= 8 && hour <= 10 : false;
  const { data: blocks } = await db.from("driver_blocks").select("start_time,end_time").eq("day_of_week", dow).eq("active", true);
  const inBlock = (blocks ?? []).some((x) => b.pickup_time + ":00" >= x.start_time && b.pickup_time + ":00" < x.end_time);
  if (!okHour || !inBlock) return json({ error: "That pickup time is not available. Pick another hour." }, 400);

  const pickup = new Date(`${b.ride_day}T${b.pickup_time}:00`);
  if (pickup.getTime() - centralNow().getTime() < 24 * 36e5) {
    return json({ error: "Rides must be booked at least 24 hours ahead." }, 400);
  }

  const { count: slotCount } = await db.from("ride_requests").select("id", { count: "exact", head: true })
    .eq("ride_day", b.ride_day).eq("pickup_time", b.pickup_time + ":00").neq("status", "cancelled").neq("status", "referred");
  if ((slotCount ?? 0) >= settings.seats_per_slot) return json({ error: "That hour is full. Pick another hour." }, 409);

  const { count: funded } = await db.from("ride_requests").select("id", { count: "exact", head: true })
    .in("status", ["requested", "booked", "riding", "completed"]);
  const referred = (funded ?? 0) >= settings.funded_cap;

  // Destination: only verified sites, never invented.
  let site: { id: string; name: string; address: string } | null = null;
  const siteCols = "id,name,address";
  if (b.destination_site_id) {
    const { data } = await db.from("voter_guide_sites").select(siteCols).eq("id", b.destination_site_id)
      .eq("verification_status", "verified").eq("site_type", isElectionDay ? "polling" : "early").maybeSingle();
    site = data;
  } else if (isElectionDay && b.ward && b.precinct) {
    const { data } = await db.from("voter_guide_sites").select(siteCols).eq("site_type", "polling")
      .eq("verification_status", "verified").eq("precinct_key", `${Number(b.ward)}-${Number(b.precinct)}`).limit(1).maybeSingle();
    site = data;
  } else if (isEarly) {
    const geo = await countyFips(b.pickup_address, b.zip);
    if (geo) {
      const { data } = await db.from("voter_guide_sites").select(siteCols).eq("site_type", "early")
        .eq("verification_status", "verified").eq("county_fips", geo.county).order("name").limit(1).maybeSingle();
      site = data;
    }
  }

  const { data: row, error } = await db.from("ride_requests").insert({
    first_name_last_initial: b.first_name_last_initial,
    phone: digits,
    pickup_address: b.pickup_address,
    zip: b.zip,
    destination_site_id: site?.id ?? null,
    needs_destination: !site,
    ride_day: b.ride_day,
    pickup_time: b.pickup_time,
    round_trip: b.round_trip,
    needs: b.needs,
    texts_ok: b.texts_ok,
    source: b.source,
    status: referred ? "referred" : "requested",
  }).select("id,ride_code").single();
  if (error || !row) {
    console.error("ride insert failed", error);
    return json({ error: "We could not save your ride. Please call the ride line." }, 500);
  }
  await db.from("ride_events").insert({
    request_id: row.id,
    event_type: referred ? "referred" : "requested",
    to_status: referred ? "referred" : "requested",
    note: site ? null : "needs destination",
  });

  return json({
    ride_code: row.ride_code,
    destination: site ? { name: site.name, address: site.address } : null,
    needs_destination: !site,
    referred,
  });
});
