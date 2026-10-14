// Signed-in voters: find ward, precinct and polling place from a street address
// using the KCEB precinct map. Saves only the precinct key, never the address.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { checkEligibility } from "../_shared/ride-eligibility.ts";
import { pollingPlaceFor } from "../_shared/kceb-precincts.ts";

const Body = z.object({ address: z.string().trim().min(5).max(200), zip: z.string().regex(/^\d{5}$/) }).strict();
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Please check the address and ZIP." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const e = await checkEligibility(p.data.address, p.data.zip, db);
  if (e.status === "lookup_failed") return json({ status: "lookup_failed", message: "We could not find that address. Check it, or enter your ward and precinct." });
  if (e.status === "out_of_area") return json({ status: "out_of_area", message: "That address is not in Kansas City, Jackson County. This map only covers the Kansas City Election Board area." });
  if (!e.precinct_key) return json({ status: "no_precinct", message: "We could not match that address to a precinct. Enter your ward and precinct instead." });

  const place = await pollingPlaceFor(db, e.precinct_key);
  const { error } = await db.from("profiles").update({ precinct_id: e.precinct_key, precinct_source: "kceb_map" }).eq("user_id", uid);
  if (error) { console.error(error.message); return json({ error: "We could not save your precinct." }, 500); }
  const [ward, precinct] = e.precinct_key.split("-").map(Number);
  return json({ status: "matched", precinct_key: e.precinct_key, ward, precinct, polling_place: place });
});
