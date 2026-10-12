// Coordinator-only: sends one ride text after a desk action. The server builds
// the message from the saved ride, so the client never supplies text or phone.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { sendRideSms } from "../_shared/ride-sms.ts";

const Body = z.object({
  ride_id: z.string().uuid(),
  kind: z.enum(["request_received", "referred", "booked", "destination_assigned", "pickup_confirmed", "ride_home_sent", "cancelled"]),
}).strict();

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: claims } = await userClient.auth.getClaims(auth.slice(7));
  const uid = claims?.claims?.sub;
  if (!uid) return json({ error: "Please sign in." }, 401);
  const { data: isCoord } = await userClient.rpc("is_ride_coordinator", { _user_id: uid });
  if (!isCoord) return json({ error: "This is for ride coordinators." }, 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Bad request" }, 400);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const result = await sendRideSms(db, parsed.data.kind, parsed.data.ride_id, uid);
  return json({ result });
});
