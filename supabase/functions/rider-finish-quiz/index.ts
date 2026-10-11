// Saves only the rights quiz score and finish time. Answers are never sent or stored.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { CodeToken, json, notFound, rideByToken } from "../_shared/ride-token.ts";

const Body = z.object({ ...CodeToken, score: z.number().int().min(0).max(20) }).strict();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return notFound();

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const r = await rideByToken(db, p.data.ride_code, p.data.t, "id,destination_site_id");
  if (!r) return notFound();

  let state = "MO";
  if (r.destination_site_id) {
    const { data } = await db.from("voter_guide_sites").select("state").eq("id", r.destination_site_id).maybeSingle();
    if (data?.state) state = data.state;
  }
  const { count } = await db.from("rights_questions").select("id", { count: "exact", head: true }).eq("state", state).not("approved_at", "is", null);
  if (!count) return json({ error: "The quiz is not open yet." }, 409);
  if (p.data.score > count) return json({ error: "That score does not look right." }, 400);

  const { error } = await db.from("ride_requests").update({ quiz_score: p.data.score, quiz_finished_at: new Date().toISOString() }).eq("id", r.id);
  if (error) return json({ error: "That did not save. Please try again." }, 500);
  await db.from("ride_events").insert({ request_id: r.id, event_type: "quiz_finished", note: `Rights quiz ${p.data.score}/${count}` });
  return json({ ok: true, score: p.data.score, total: count });
});
