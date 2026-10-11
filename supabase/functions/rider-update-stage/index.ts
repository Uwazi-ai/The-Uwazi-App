// Rider moves on their own trip. Only two moves: in the car (2 to 3) and ready to go home (4 to 5).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { CodeToken, json, notFound, rideByToken } from "../_shared/ride-token.ts";

const Body = z.object({ ...CodeToken, action: z.enum(["in_car", "ready_home"]) }).strict();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return notFound();

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const r = await rideByToken(db, p.data.ride_code, p.data.t, "id,status,trip_stage,round_trip");
  if (!r) return notFound();

  let patch: Record<string, unknown>;
  let event: { event_type: string; note: string };
  if (p.data.action === "in_car") {
    if (!(["booked", "riding"].includes(r.status) && r.trip_stage === 2)) return json({ error: "That step is not open yet." }, 409);
    patch = { trip_stage: 3, status: "riding" };
    event = { event_type: "picked_up", note: "Picked up. Confirmed by rider" };
  } else {
    if (!(r.round_trip && r.status === "riding" && r.trip_stage === 4)) return json({ error: "That step is not open yet." }, 409);
    patch = { trip_stage: 5 };
    event = { event_type: "rider_ready_for_return", note: "Rider is done voting. Send the ride home" };
  }

  // Conditional update so two taps cannot both move the trip.
  const { data: upd, error } = await db.from("ride_requests").update(patch).eq("id", r.id).eq("trip_stage", r.trip_stage).select("trip_stage").maybeSingle();
  if (error || !upd) return json({ error: "That did not save. Please try again." }, 409);
  await db.from("ride_events").insert({ request_id: r.id, ...event });
  return json({ trip_stage: upd.trip_stage });
});
