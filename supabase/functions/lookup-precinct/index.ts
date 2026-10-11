// Read-only precinct lookup with the free Census geocoder (2020 Voting Districts).
// Tested against KCMO: Census names like "KC 104" cannot be mapped reliably to
// our ward-precinct keys (1-4 and 10-4 both exist, and the 2020 lines predate
// current wards), so this returns mapped:false and never guesses. Writes nothing.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const Body = z.object({ address: z.string().trim().min(5).max(200), zip: z.string().regex(/^\d{5}$/) });
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Please check the address and ZIP." }, 400);
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(
      `${p.data.address} ${p.data.zip}`,
    )}&benchmark=Public_AR_Current&vintage=Census2020_Current&layers=Voting+Districts&format=json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const v = j?.result?.addressMatches?.[0]?.geographies?.["Voting Districts"]?.[0];
    return json({ matched: !!v, census_vtd: v?.NAME ?? null, county_fips: v ? `${v.STATE}${v.COUNTY}` : null, mapped: false, precinct_key: null });
  } catch {
    return json({ matched: false, mapped: false, precinct_key: null });
  }
});
