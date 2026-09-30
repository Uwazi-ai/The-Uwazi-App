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
const ZIP_PATTERN = /\b\d{5}(?:-\d{4})?\b/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getMapsKey() {
  return (
    Deno.env.get("GOOGLE_API_KEY") ||
    Deno.env.get("GOOGLE_MAPS_API_KEY") ||
    Deno.env.get("VITE_GOOGLE_MAPS_API_KEY") ||
    ""
  );
}

function getCivicKey() {
  return (
    Deno.env.get("GOOGLE_CIVIC_API_KEY") ||
    Deno.env.get("VITE_GOOGLE_CIVIC_API_KEY") ||
    ""
  );
}

function extractZip(value: string) {
  return value.match(ZIP_PATTERN)?.[0]?.slice(0, 5) ?? null;
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

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("zip_code, state_code")
      .eq("user_id", userId)
      .maybeSingle();

    const mapsKey = getMapsKey();
    const civicKey = getCivicKey();
    const fallbackZip = extractZip(address) ?? existingProfile?.zip_code ?? null;

    // STEP A — Geocode
    let lat: number | null = null;
    let lng: number | null = null;
    let zip: string | null = fallbackZip;
    let state: string | null = existingProfile?.state_code ?? null;
    let county: string | null = null;
    let geocodingStatus: string | null = null;
    let geocoder = "none";
    let matchQuality: string | null = null;
    let place: string | null = null;
    const resolved: Record<string, string> = {};
    let censusMatched = false;

    // Primary geocoder. The US Census geocoder is free and needs no key. One call
    // gives the map point and the geography codes we need.
    try {
      const cUrl = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(
        address,
      )}&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=json`;
      const cRes = await fetch(cUrl, { signal: AbortSignal.timeout(12000) });
      if (cRes.ok) {
        const cData = await cRes.json();
        const matches = cData?.result?.addressMatches ?? [];
        const m = matches[0];
        if (m) {
          censusMatched = true;
          geocoder = "census";
          matchQuality = matches.length === 1 ? "one exact match" : `best of ${matches.length} matches`;
          geocodingStatus = "CENSUS_MATCH";
          lat = m.coordinates?.y ?? null;
          lng = m.coordinates?.x ?? null;
          const g: Record<string, any[]> = m.geographies || {};
          const pick = (re: RegExp) => {
            const k = Object.keys(g).find((key) => re.test(key));
            return k ? g[k]?.[0] ?? null : null;
          };
          const countyRow = pick(/^Counties$/);
          const placeRow = pick(/^Incorporated Places$/);
          county = countyRow?.BASENAME ?? null;
          place = placeRow?.BASENAME ?? null;
          const cd = pick(/Congressional Districts/)?.BASENAME;
          const up = pick(/State Legislative Districts - Upper/)?.BASENAME;
          const lo = pick(/State Legislative Districts - Lower/)?.BASENAME;
          const sdu = pick(/Unified School Districts/);
          const vtd = pick(/Voting Districts/);
          state = m.addressComponents?.state ?? state;
          zip = m.addressComponents?.zip ?? zip;
          if (placeRow?.GEOID) resolved.place = String(placeRow.GEOID);
          if (countyRow?.GEOID) resolved.county = String(countyRow.GEOID);
          if (cd) resolved.congressional = String(cd);
          if (up) resolved.state_senate = String(up);
          if (lo) resolved.state_house = String(lo);
          if (sdu?.GEOID) resolved.school_district = String(sdu.GEOID);
          if (vtd?.BASENAME || vtd?.NAME) resolved.voting_district = String(vtd.NAME ?? vtd.BASENAME);
          if (vtd?.GEOID) resolved.voting_district_geoid = String(vtd.GEOID);
        } else {
          geocodingStatus = "CENSUS_NO_MATCH";
        }
      } else {
        geocodingStatus = `CENSUS_HTTP_${cRes.status}`;
      }
    } catch (e) {
      geocodingStatus = "CENSUS_REQUEST_FAILED";
      console.warn("Census geocoder failed:", e);
    }

    // Backup geocoder. Only runs when the Census geocoder found nothing and a key is set.
    // With no key we skip it quietly and never tell the user about a key.
    if (!censusMatched && mapsKey) {
      try {
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address,
        )}&key=${mapsKey}`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json().catch(() => ({}));
        geocodingStatus = geoData.status ?? `HTTP_${geoRes.status}`;

        if (geoRes.ok && geoData.status === "OK" && geoData.results?.length) {
          const top = geoData.results[0];
          lat = top.geometry?.location?.lat ?? null;
          lng = top.geometry?.location?.lng ?? null;
          geocoder = "backup";
          matchQuality = top.geometry?.location_type ?? "match";
          const comps: Array<{ types: string[]; long_name: string; short_name: string }> =
            top.address_components || [];
          const findComp = (t: string) => comps.find((c) => c.types.includes(t));
          zip = findComp("postal_code")?.long_name?.slice(0, 5) ?? zip;
          state = findComp("administrative_area_level_1")?.short_name ?? state;
          county = findComp("administrative_area_level_2")?.long_name ?? null;
        } else {
          console.warn("Backup geocoder found nothing:", geocodingStatus);
        }
      } catch (e) {
        console.warn("Backup geocoder request failed:", e);
      }
    }
    const addressMatched = geocoder === "census" || geocoder === "backup";

    // Free ZIP center fallback. Used when we have no map point yet, so ZIP only users still get their city and county.
    if (lat == null && lng == null && zip) {
      try {
        const zRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (zRes.ok) {
          const zData = await zRes.json();
          const first = zData?.places?.[0];
          if (first) {
            lat = Number(first.latitude);
            lng = Number(first.longitude);
            state = state ?? first["state abbreviation"] ?? null;
          }
        }
      } catch (e) {
        console.warn("ZIP center lookup failed:", e);
      }
    }


    if (!zip) {
      return json({
        error: "ADDRESS_NOT_FOUND",
        message: "Could not geocode address",
        fallback: true,
        geocoding_status: geocodingStatus,
      });
    }

    // STEP B — Districts (best effort)
    let cityCouncil: string | null = null;
    let moHouse: string | null = null;
    let moSenate: string | null = null;
    let usCongress: string | null = null;
    try {
      if (civicKey) {
        const civicUrl = `https://www.googleapis.com/civicinfo/v2/representatives?address=${encodeURIComponent(
          address,
        )}&key=${civicKey}`;
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
      }
    } catch (e) {
      console.error("Civic API failed:", e);
    }

    // STEP B2 — US Census geocoder (free, no key): coordinates, county, districts
    let place: string | null = null;
    const resolved: Record<string, string> = {};
    let censusMatched = false;
    try {
      const cUrl = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(
        address,
      )}&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=json`;
      const cRes = await fetch(cUrl);
      if (cRes.ok) {
        const cData = await cRes.json();
        const m = cData?.result?.addressMatches?.[0];
        if (m) {
          censusMatched = true;
          // The census point is the exact address, so it wins over any ZIP center we guessed earlier.
          lat = m.coordinates?.y ?? lat ?? null;
          lng = m.coordinates?.x ?? lng ?? null;
          const g: Record<string, any[]> = m.geographies || {};
          const pick = (re: RegExp) => {
            const k = Object.keys(g).find((key) => re.test(key));
            return k ? g[k]?.[0] ?? null : null;
          };
          const countyRow = pick(/^Counties$/);
          const placeRow = pick(/^Incorporated Places$/);
          county = county ?? countyRow?.BASENAME ?? null;
          place = placeRow?.BASENAME ?? null;
          const cd = pick(/Congressional Districts/)?.BASENAME;
          const up = pick(/State Legislative Districts - Upper/)?.BASENAME;
          const lo = pick(/State Legislative Districts - Lower/)?.BASENAME;
          const sdu = pick(/Unified School Districts/);
          const vtd = pick(/Voting Districts/);
          const st = state ?? m.addressComponents?.state ?? null;
          state = st;
          if (placeRow?.GEOID) resolved.place = String(placeRow.GEOID);
          if (countyRow?.GEOID) resolved.county = String(countyRow.GEOID);
          if (cd) resolved.congressional = String(cd);
          if (up) resolved.state_senate = String(up);
          if (lo) resolved.state_house = String(lo);
          if (sdu?.GEOID) resolved.school_district = String(sdu.GEOID);
          if (vtd?.BASENAME || vtd?.NAME) resolved.voting_district = String(vtd.NAME ?? vtd.BASENAME);
          if (vtd?.GEOID) resolved.voting_district_geoid = String(vtd.GEOID);
          if (!usCongress && cd) usCongress = `${st ?? ""} Congressional District ${cd}`.trim();
          if (!moSenate && up) moSenate = `State Senate District ${up}`;
          if (!moHouse && lo) moHouse = `State House District ${lo}`;
        }
      }
    } catch (e) {
      console.warn("Census geocoder failed:", e);
    }
    if (county) county = county.replace(/\s+County$/i, "");

    // STEP B3 — district boundaries. Street address only. We store codes, never the address or the map point.
    const precision: "address" | "zip" = censusMatched ? "address" : "zip";
    if (precision === "zip" && lat != null && lng != null) {
      // ZIP only. Take the city and county codes, then stop. No district level match.
      try {
        const pUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=json`;
        const pRes = await fetch(pUrl);
        if (pRes.ok) {
          const pData = await pRes.json();
          const g: Record<string, any[]> = pData?.result?.geographies || {};
          const pick = (re: RegExp) => {
            const k = Object.keys(g).find((key) => re.test(key));
            return k ? g[k]?.[0] ?? null : null;
          };
          const placeRow = pick(/^Incorporated Places$/);
          const countyRow = pick(/^Counties$/);
          if (placeRow?.GEOID) resolved.place = String(placeRow.GEOID);
          if (countyRow?.GEOID) resolved.county = String(countyRow.GEOID);
          if (!place && placeRow?.BASENAME) place = placeRow.BASENAME;
          if (!county && countyRow?.BASENAME) county = String(countyRow.BASENAME).replace(/\s+County$/i, "");
        }
      } catch (e) {
        console.warn("Census point lookup failed:", e);
      }
    }
    if (precision === "address" && lat != null && lng != null) {
      try {
        const { data: matched, error: matchErr } = await admin.rpc("match_district_codes", { _lat: lat, _lon: lng });
        if (matchErr) console.warn("District match failed:", matchErr.message);
        if (matched && typeof matched === "object") Object.assign(resolved, matched as Record<string, string>);
      } catch (e) {
        console.warn("District match request failed:", e);
      }
    }
    if (Object.keys(resolved).length) {
      const { error: udErr } = await admin.from("user_districts").upsert(
        { user_id: userId, resolved, precision, resolved_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (udErr) console.warn("Saving districts failed:", udErr.message);
    }

    // City auto discovery. Ask for a new city when we have no active sources or maps for it.
    let cityStatus: string | null = null;
    if (resolved.place) {
      try {
        const { data: cs, error: csErr } = await admin.rpc("request_city_onboarding", {
          _place: resolved.place, _name: place ?? null, _state: state ?? null,
          _county: resolved.county ?? null, _school: resolved.school_district ?? null,
        });
        if (csErr) console.warn("City request failed:", csErr.message);
        cityStatus = (cs as string) ?? null;
      } catch (e) {
        console.warn("City request error:", e);
      }
    }

    let authorityKey: string | null = null;
    if (state === "MO") {
      if (place === "Kansas City" && ["Jackson", "Clay", "Platte", "Cass"].includes(county ?? "")) authorityKey = "mo-kcmo-eb";
      else if (county === "Jackson") authorityKey = "mo-jackson-eb";
      else authorityKey = "mo-sos-fallback";
    } else if (state === "KS") {
      authorityKey = county === "Johnson" ? "ks-johnson-eo" : "ks-sos-fallback";
    }

    // STEP C — write to profiles
    await admin
      .from("profiles")
      .update({
        address,
        zip_code: zip,
        lat,
        lng,
        state_code: state,
        ...(county ? { county_name: county } : {}),
        ...(authorityKey ? { election_authority_key: authorityKey } : {}),
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
      county_name: county,
      election_authority_key: authorityKey,
      geocoding_status: geocodingStatus,
      city_council_district: cityCouncil,
      mo_house_district: moHouse,
      mo_senate_district: moSenate,
      us_congressional_district: usCongress,
      resolved,
      precision,
      city_status: cityStatus,
      districts_resolved_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("resolve-address error", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
