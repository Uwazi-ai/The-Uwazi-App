// Public ride availability. Returns no personal data.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { ACTIVE_STATUSES, allDays, dayOfWeek, inBlocks, pickupHours, tooSoon } from "../_shared/rides.ts";

const Body = z.object({
  ride_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
});

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const raw = req.method === "POST" ? await req.json().catch(() => ({})) : Object.fromEntries(new URL(req.url).searchParams);
  const p = Body.safeParse(raw);
  if (!p.success) return json({ error: "Please check the day and ZIP." }, 400);
  const { ride_day, zip } = p.data;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [{ data: s }, { data: blocks }, { data: reqs }] = await Promise.all([
    db.from("ride_settings").select("*").eq("id", true).single(),
    db.from("driver_blocks").select("day_of_week,start_time,end_time,active").eq("active", true),
    db.from("ride_requests").select("ride_day,pickup_time,status").in("status", ACTIVE_STATUSES),
  ]);
  if (!s) return json({ error: "Rides are not open yet." }, 503);

  const taken = new Map<string, number>();
  let fundedUsed = 0;
  for (const r of reqs ?? []) {
    fundedUsed++;
    const k = `${r.ride_day} ${String(r.pickup_time).slice(0, 2)}`;
    taken.set(k, (taken.get(k) ?? 0) + 1);
  }

  const hoursFor = (day: string) =>
    pickupHours(day, s, zip).filter((h) => inBlocks(day, h, blocks ?? [])).map((h) => {
      const seats_left = Math.max(0, s.seats_per_slot - (taken.get(`${day} ${String(h).padStart(2, "0")}`) ?? 0));
      const soon = tooSoon(day, h);
      return { hour: `${String(h).padStart(2, "0")}:00`, seats_left, too_soon: soon, bookable: !soon && seats_left > 0 };
    });

  let earliest: { day: string; hour: string } | null = null;
  const days = allDays(s).map((day) => {
    const hrs = hoursFor(day);
    const first = hrs.find((h) => h.bookable);
    if (first && !earliest) earliest = { day, hour: first.hour };
    return {
      day,
      dow: dayOfWeek(day),
      kind: day === s.election_day ? "election_day" : "early",
      open: !!first,
    };
  });

  return json({
    days,
    hours: ride_day ? hoursFor(ride_day) : undefined,
    earliest_bookable: earliest,
    funded_left: Math.max(0, s.funded_cap - fundedUsed),
    ride_line_phone: s.ride_line_phone ?? null,
    early_start: s.early_start,
    early_end: s.early_end,
    election_day: s.election_day,
  });
});
