// Public, reviewed polling information only. Never reads rider records.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response(JSON.stringify({ error: "The polling list is unavailable. Please check kceb.org." }), { status: 503, headers });
  const db = createClient(url, key);
  const { data, error } = await db.from("voter_guide_sites")
    .select("precinct_key,name,address,room,hours,source_name,source_url")
    .eq("state", "MO").eq("county_fips", "29095")
    .eq("site_type", "polling").eq("election_date", "2026-11-03")
    .eq("verification_status", "verified").order("precinct_key").limit(1000);
  if (error) return new Response(JSON.stringify({ error: "The polling list is unavailable. Please check kceb.org." }), { status: 503, headers });
  return new Response(JSON.stringify({ sites: data }), { headers });
});