// Public ride card by ride code plus card token. Never returns name, phone, or address.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { CodeToken, json, notFound, rideByToken } from "../_shared/ride-token.ts";

const Body = z.object(CodeToken);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const raw = req.method === "POST" ? await req.json().catch(() => ({})) : Object.fromEntries(new URL(req.url).searchParams);
  const p = Body.safeParse(raw);
  if (!p.success) return notFound();

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const r = await rideByToken(db, p.data.ride_code, p.data.t,
    "ride_code,ride_day,pickup_time,round_trip,status,trip_stage,needs_destination,destination_site_id,quiz_score,quiz_finished_at");
  if (!r) return notFound();

  let destination: { name: string; address: string; state: string } | null = null;
  if (r.destination_site_id) {
    const { data } = await db.from("voter_guide_sites").select("name,address,state").eq("id", r.destination_site_id).maybeSingle();
    destination = data;
  }
  const { data: s } = await db.from("ride_settings").select("ride_line_phone").eq("id", true).maybeSingle();

  return json({
    ride_code: r.ride_code,
    ride_day: r.ride_day,
    pickup_time: String(r.pickup_time).slice(0, 5),
    round_trip: r.round_trip,
    status: r.status,
    trip_stage: r.trip_stage,
    destination,
    needs_destination: r.needs_destination || !destination,
    referred: r.status === "referred",
    ride_line_phone: s?.ride_line_phone ?? null,
    quiz_score: r.quiz_score,
    quiz_finished: !!r.quiz_finished_at,
  });
});
