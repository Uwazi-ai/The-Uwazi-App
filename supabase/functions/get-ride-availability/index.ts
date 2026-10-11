// Public ride availability. Returns no personal data.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { ACTIVE_STATUSES, allDays, dayOfWeek, inBlocks, pickupHours, tooSoon } from "../_shared/rides.ts";
import { geocode, JACKSON_FIPS, miles, openSites, siteFits, type OpenSite } from "../_shared/ride-sites.ts";

const Body = z.object({
  ride_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
  address: z.string().trim().min(5).max(200).optional(),
  site_id: z.string().uuid().optional(),
});

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const raw = req.method === "POST" ? await req.json().catch(() => ({})) : Object.fromEntries(new URL(req.url).searchParams);
  const p = Body.safeParse(raw);
  if (!p.success) return json({ error: "Please check the day and ZIP." }, 400);
  const { ride_day, zip, address, site_id } = p.data;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [{ data: s }, { data: blocks }, { data: reqs }, geo] = await Promise.all([
    db.from("ride_settings").select("*").eq("id", true).single(),
    db.from("driver_blocks").select("day_of_week,start_time,end_time,active").eq("active", true),
    db.from("ride_requests").select("ride_day,pickup_time,status").in("status", ACTIVE_STATUSES),
    address && zip ? geocode(address, zip) : Promise.resolve(null),
  ]);
  if (!s) return json({ error: "Rides are not open yet." }, 503);

  // Site hours rule applies to Jackson County voters and to anyone not yet located.
  const siteRule = !geo || geo.county === JACKSON_FIPS;

  const taken = new Map<string, number>();
  let fundedUsed = 0;
  for (const r of reqs ?? []) {
    fundedUsed++;
    const k = `${r.ride_day} ${String(r.pickup_time).slice(0, 2)}`;
    taken.set(k, (taken.get(k) ?? 0) + 1);
  }

  const days = allDays(s);
  const sitesByDay = new Map<string, OpenSite[]>();
  if (siteRule) {
    const early = days.filter((d) => d !== s.election_day);
    const lists = await Promise.all(early.map((d) => openSites(db, d)));
    early.forEach((d, i) => sitesByDay.set(d, lists[i]));
  }

  const hoursFor = (day: string, onlySite?: string) => {
    const isEarly = day !== s.election_day;
    let sites = isEarly && siteRule ? sitesByDay.get(day) ?? [] : null;
    if (sites && onlySite) sites = sites.filter((x) => x.id === onlySite);
    return pickupHours(day, s, zip)
      .filter((h) => inBlocks(day, h, blocks ?? []))
      .filter((h) => !sites || sites.some((x) => siteFits(x, h)))
      .map((h) => {
        const seats_left = Math.max(0, s.seats_per_slot - (taken.get(`${day} ${String(h).padStart(2, "0")}`) ?? 0));
        const soon = tooSoon(day, h);
        return { hour: `${String(h).padStart(2, "0")}:00`, seats_left, too_soon: soon, bookable: !soon && seats_left > 0 };
      });
  };

  let earliest: { day: string; hour: string } | null = null;
  const dayList = days.map((day) => {
    const first = hoursFor(day).find((h) => h.bookable);
    if (first && !earliest) earliest = { day, hour: first.hour };
    return { day, dow: dayOfWeek(day), kind: day === s.election_day ? "election_day" : "early", open: !!first };
  });

  let sites: unknown = undefined;
  if (ride_day && ride_day !== s.election_day && siteRule) {
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

  return json({
    days: dayList,
    hours: ride_day ? hoursFor(ride_day, site_id) : undefined,
    sites,
    jackson: !!geo && geo.county === JACKSON_FIPS,
    earliest_bookable: earliest,
    funded_left: Math.max(0, s.funded_cap - fundedUsed),
    ride_line_phone: s.ride_line_phone ?? null,
    early_start: s.early_start,
    early_end: s.early_end,
    election_day: s.election_day,
  });
});
