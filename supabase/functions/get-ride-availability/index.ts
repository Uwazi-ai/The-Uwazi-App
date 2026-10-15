// Public ride availability. Returns no personal data.
// Only ride_service_days are bookable, at their wave times. Waves seat
// ride_settings.seats_per_slot riders; an early wave goes to one site.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { allDays, dayOfWeek, loadServiceDays, siteFitsWave, waveLoads, waveTooSoon } from "../_shared/rides.ts";
import { miles, openSites, type OpenSite } from "../_shared/ride-sites.ts";
import { pollingPlaceFor } from "../_shared/kceb-precincts.ts";
import { checkEligibility, LOOKUP_FAILED_MSG, OUT_OF_AREA_MSG, type Eligibility } from "../_shared/ride-eligibility.ts";

const Body = z.object({
  ride_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
  address: z.string().trim().min(5).max(200).optional(),
  site_id: z.string().uuid().optional(),
}).strict();

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const raw = req.method === "POST" ? await req.json().catch(() => ({})) : Object.fromEntries(new URL(req.url).searchParams);
  const p = Body.safeParse(raw);
  if (!p.success) return json({ error: "Please check the day and ZIP." }, 400);
  const { ride_day, zip, address, site_id } = p.data;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [{ data: s }, svc, loads, elig] = await Promise.all([
    db.from("ride_settings").select("*").eq("id", true).single(),
    loadServiceDays(db),
    waveLoads(db),
    address && zip ? checkEligibility(address, zip, db) : Promise.resolve(null as Eligibility | null),
  ]);
  if (!s) return json({ error: "Rides are not open yet." }, 503);
  // KCEB area only. Out of area is refused before any day is shown.
  if (elig?.status === "out_of_area") return json({ error: OUT_OF_AREA_MSG, code: "out_of_area" }, 400);
  const geo = elig?.status === "eligible" ? elig : null;
  const seats = s.seats_per_slot;

  const days = allDays(s);
  const sitesByDay = new Map<string, OpenSite[]>();
  const early = days.filter((d) => d !== s.election_day);
  const lists = await Promise.all(early.map((d) => openSites(db, d)));
  early.forEach((d, i) => sitesByDay.set(d, lists[i]));

  const wavesFor = (day: string, onlySite?: string) => {
    const sd = svc.get(day);
    if (!sd) return [];
    const isEarly = day !== s.election_day;
    let sites = isEarly ? sitesByDay.get(day) ?? [] : null;
    if (sites && onlySite) sites = sites.filter((x) => x.id === onlySite);
    return sd.waves
      .filter((w) => {
        if (!sites) return true;
        const fit = sites.filter((x) => siteFitsWave(x, w));
        const lock = loads.get(`${day} ${w}`)?.site_id;
        // A wave set to another site is hidden from this rider.
        return lock ? fit.some((x) => x.id === lock) : fit.length > 0;
      })
      .map((w) => {
        const seats_left = Math.max(0, seats - (loads.get(`${day} ${w}`)?.count ?? 0));
        const soon = waveTooSoon(day, w);
        return { hour: w, seats_left, too_soon: soon, bookable: !soon && seats_left > 0 };
      });
  };

  let earliest: { day: string; hour: string } | null = null;
  let seatsTotal = 0;
  let seatsTaken = 0;
  const dayList = days.map((day) => {
    const kind = day === s.election_day ? "election_day" : "early";
    const sd = svc.get(day);
    const sitesOpen = kind === "election_day" || (sitesByDay.get(day) ?? []).length > 0;
    let status: "open" | "full" | "no_driver" | "closed" = "closed";
    if (sd) {
      seatsTotal += sd.waves.length * seats;
      const taken = sd.waves.map((w) => loads.get(`${day} ${w}`)?.count ?? 0);
      seatsTaken += taken.reduce((a, b) => a + Math.min(b, seats), 0);
      const first = wavesFor(day).find((h) => h.bookable);
      if (first && !earliest) earliest = { day, hour: first.hour };
      if (first) status = "open";
      else if (taken.every((n) => n >= seats)) status = "full";
    } else if (sitesOpen) status = "no_driver";
    return { day, dow: dayOfWeek(day), kind, open: status === "open", status, note: sd?.note ?? null };
  });

  let sites: unknown = undefined;
  if (ride_day && ride_day !== s.election_day) {
    sites = (sitesByDay.get(ride_day) ?? [])
      .map((x) => ({
        id: x.id,
        name: x.name,
        address: x.address,
        open: x.open.slice(0, 5),
        close: x.close.slice(0, 5),
        distance_mi: geo && x.lat != null && x.lon != null ? Math.round(miles(geo.lat, geo.lon, x.lat, x.lon) * 10) / 10 : null,
      }))
      .sort((a, b) => (a.distance_mi ?? 1e9) - (b.distance_mi ?? 1e9) || a.name.localeCompare(b.name));
  }

  // Election Day polling place from the KCEB precinct map. Null means a coordinator picks it.
  const precinct_key = geo?.precinct_key ?? null;
  const place = await pollingPlaceFor(db, precinct_key);

  return json({
    sms_live: s.sms_live === true,
    precinct_key,
    election_day_place: place ? { name: place.name, address: place.address } : null,
    days: dayList,
    hours: ride_day ? wavesFor(ride_day, site_id) : undefined,
    sites,
    eligibility: elig?.status ?? null,
    eligibility_message: elig?.status === "lookup_failed" ? LOOKUP_FAILED_MSG : null,
    earliest_bookable: earliest,
    seats_total: seatsTotal,
    seats_left: Math.max(0, seatsTotal - seatsTaken),
    ride_line_phone: s.ride_line_phone ?? null,
    early_start: s.early_start,
    early_end: s.early_end,
    election_day: s.election_day,
  });
});
