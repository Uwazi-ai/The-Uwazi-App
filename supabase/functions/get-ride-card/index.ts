// Public ride card by ride code. Never returns name, phone, or address.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const Body = z.object({ ride_code: z.string().regex(/^UZ-\d{4,7}$/) });
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const raw = req.method === "POST" ? await req.json().catch(() => ({})) : Object.fromEntries(new URL(req.url).searchParams);
  const p = Body.safeParse(raw);
  if (!p.success) return json({ error: "That ride code does not look right." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: r } = await db.from("ride_requests")
    .select("ride_code,ride_day,pickup_time,round_trip,status,trip_stage,needs_destination,destination_site_id")
    .eq("ride_code", p.data.ride_code.toUpperCase()).maybeSingle();
  if (!r) return json({ error: "We could not find that ride." }, 404);

  let destination: { name: string; address: string } | null = null;
  if (r.destination_site_id) {
    const { data } = await db.from("voter_guide_sites").select("name,address").eq("id", r.destination_site_id).maybeSingle();
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
  });
});
