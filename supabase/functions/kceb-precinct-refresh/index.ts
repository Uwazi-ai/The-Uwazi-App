// Admin only. Reloads the KCEB precinct map into kceb_precincts and logs the count.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { fetchKcebLayer, KCEB_PRECINCTS_URL } from "../_shared/kceb-precincts.ts";

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
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: isAdmin } = await db.rpc("is_admin", { _user_id: uid });
  if (!isAdmin) return json({ error: "This is for admins." }, 403);

  let fc;
  try {
    fc = await fetchKcebLayer();
  } catch (e) {
    console.error(e);
    return json({ error: "We could not reach the Election Board map. Try again later." }, 502);
  }
  const { data, error } = await db.rpc("load_kceb_precincts", { _fc: fc, _source: KCEB_PRECINCTS_URL });
  if (error) {
    console.error("load failed", error.message);
    return json({ error: "The map did not load. The old precincts are still in place." }, 500);
  }
  const r = data as { features: number; precincts: number; unparsed: string[]; duplicates: string[]; wards: number[] };
  await db.from("ride_admin_log").insert({
    actor: uid, action: "kceb_precincts_reload",
    note: `features ${r.features}, precincts ${r.precincts}, unparsed ${r.unparsed.length}, duplicates ${r.duplicates.join(" ") || "none"}`,
  });
  return json(r);
});
