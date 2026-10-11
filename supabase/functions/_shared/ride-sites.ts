// Early voting site hours and distance for Rides to the Polls.
// deno-lint-ignore-file no-explicit-any

export const JACKSON_FIPS = "29095";

export type Geo = { state: string; county: string; lat: number; lon: number } | null;

export async function geocode(address: string, zip: string): Promise<Geo> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(
      `${address} ${zip}`,
    )}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Counties&format=json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const m = j?.result?.addressMatches?.[0];
    const c = m?.geographies?.Counties?.[0];
    if (!c) return null;
    return {
      state: c.STATE === "29" ? "MO" : c.STATE === "20" ? "KS" : c.STATE,
      county: `${c.STATE}${c.COUNTY}`,
      lat: m.coordinates.y,
      lon: m.coordinates.x,
    };
  } catch {
    return null;
  }
}

export function miles(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type OpenSite = { id: string; name: string; address: string; open: string; close: string; lat: number | null; lon: number | null };

// Verified early sites with hours rows on a given day.
export async function openSites(db: any, day: string, county = JACKSON_FIPS): Promise<OpenSite[]> {
  const { data } = await db.from("ride_site_hours")
    .select("open_time,close_time,voter_guide_sites!inner(id,name,address,site_type,verification_status,county_fips)")
    .eq("open_date", day)
    .eq("voter_guide_sites.site_type", "early")
    .eq("voter_guide_sites.verification_status", "verified")
    .eq("voter_guide_sites.county_fips", county);
  const rows = data ?? [];
  const ids = rows.map((r: any) => r.voter_guide_sites.id);
  const { data: geo } = ids.length ? await db.from("ride_site_geo").select("site_id,lat,lon").in("site_id", ids) : { data: [] };
  const g = new Map((geo ?? []).map((x: any) => [x.site_id, x]));
  return rows.map((r: any) => {
    const s = r.voter_guide_sites;
    const p: any = g.get(s.id);
    return { id: s.id, name: s.name, address: s.address, open: r.open_time, close: r.close_time, lat: p?.lat ?? null, lon: p?.lon ?? null };
  });
}

// Open at pickup and still open at least 1 hour after.
export function siteFits(site: OpenSite, hour: number) {
  const at = `${String(hour).padStart(2, "0")}:00:00`;
  const after = `${String(hour + 1).padStart(2, "0")}:00:00`;
  return site.open <= at && site.close >= after;
}
