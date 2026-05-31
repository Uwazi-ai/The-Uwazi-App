// Resolve a user's address: geocode via Google, extract ZIP + lat/lng, resolve
// civic districts, store on profiles, then fire-and-forget investment data fetches.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({ address: z.string().min(5).max(300) });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getGoogleKey() {
  return (
    Deno.env.get("GOOGLE_API_KEY") ||
    Deno.env.get("GOOGLE_MAPS_API_KEY") ||
    Deno.env.get("VITE_GOOGLE_MAPS_API_KEY") ||
    Deno.env.get("GOOGLE_CIVIC_API_KEY") ||
    Deno.env.get("VITE_GOOGLE_CIVIC_API_KEY") ||
    ""
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { address } = parsed.data;

    const googleKey = getGoogleKey();
    if (!googleKey) return json({ error: "GOOGLE_API_KEY_MISSING" }, 503);

    // STEP A — Geocode
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address,
    )}&key=${googleKey}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    if (geoData.status !== "OK" || !geoData.results?.length) {
      return json({ error: "ADDRESS_NOT_FOUND", message: "Could not geocode address" }, 422);
    }
    const top = geoData.results[0];
    const lat = top.geometry?.location?.lat ?? null;
    const lng = top.geometry?.location?.lng ?? null;
    const comps: Array<{ types: string[]; long_name: string; short_name: string }> =
      top.address_components || [];
    const findComp = (t: string) => comps.find((c) => c.types.includes(t));
    const zip = findComp("postal_code")?.long_name ?? null;
    const state = findComp("administrative_area_level_1")?.short_name ?? null;

    // STEP B — Districts (best effort)
    let cityCouncil: string | null = null;
    let moHouse: string | null = null;
    let moSenate: string | null = null;
    let usCongress: string | null = null;
    try {
      const civicUrl = `https://www.googleapis.com/civicinfo/v2/representatives?address=${encodeURIComponent(
        address,
      )}&key=${googleKey}`;
      const civicRes = await fetch(civicUrl);
      if (civicRes.ok) {
        const civicData = await civicRes.json();
        const officials = civicData.officials || [];
        const offices = civicData.offices || [];
        const labelFor = (office: any) => {
          const idx = office.officialIndices?.[0];
          const name = idx != null ? officials[idx]?.name : null;
          return name ? `${office.name} — ${name}` : office.name;
        };
        for (const office of offices) {
          const name: string = office.name || "";
          const levels: string[] = office.levels || [];
          const roles: string[] = office.roles || [];
          if (/city council|alderman/i.test(name) && !cityCouncil) cityCouncil = labelFor(office);
          if (levels.includes("country") && roles.includes("legislatorLowerBody") && !usCongress)
            usCongress = labelFor(office);
          if (
            levels.includes("administrativeArea1") &&
            roles.includes("legislatorLowerBody") &&
            !moHouse
          )
            moHouse = labelFor(office);
          if (
            levels.includes("administrativeArea1") &&
            roles.includes("legislatorUpperBody") &&
            !moSenate
          )
            moSenate = labelFor(office);
        }
      }
    } catch (e) {
      console.error("Civic API failed:", e);
    }

    // STEP C — write to profiles
    const admin = createClient(supabaseUrl, serviceKey);
    await admin
      .from("profiles")
      .update({
        address,
        zip_code: zip,
        lat,
        lng,
        state_code: state,
        city_council_district: cityCouncil,
        mo_house_district: moHouse,
        mo_senate_district: moSenate,
        us_congressional_district: usCongress,
        districts_resolved_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // STEP D — Fire and forget investment fetches
    if (zip) {
      const fnUrl = `${supabaseUrl}/functions/v1/fetch-investment-data`;
      for (const level of ["city", "state", "federal"] as const) {
        fetch(fnUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ zip_code: zip, level }),
        }).catch((e) => console.error(`fetch-investment-data ${level} failed:`, e));
      }
    }

    return json({
      zip_code: zip,
      lat,
      lng,
      city_council_district: cityCouncil,
      mo_house_district: moHouse,
      mo_senate_district: moSenate,
      us_congressional_district: usCongress,
      districts_resolved_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("resolve-address error", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
