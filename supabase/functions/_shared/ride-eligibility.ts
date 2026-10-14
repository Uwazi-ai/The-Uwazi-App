// KCEB area eligibility for Rides to the Polls. Rides are only for addresses
// inside Kansas City, MO city limits AND Jackson County (FIPS 29095).
// Census geocoder only. If the lookup fails, never guess.

export const KCEB_COUNTY = "29095";
export const KCMO_PLACE = "2938000";
export const OUT_OF_AREA_MSG =
  "Free rides are for voters who live in Kansas City in Jackson County. Your address is outside that area. Questions? Call (816) 379-6885.";
export const LOOKUP_FAILED_MSG =
  "We could not check your address. Please call the ride line at (816) 379-6885 to book.";

export type Eligibility =
  | { status: "eligible"; lat: number; lon: number }
  | { status: "out_of_area" }
  | { status: "lookup_failed" };

export async function checkEligibility(address: string, zip: string): Promise<Eligibility> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(
      `${address} ${zip}`,
    )}&benchmark=Public_AR_Current&vintage=Current_Current&layers=${encodeURIComponent("Counties,Incorporated Places")}&format=json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { status: "lookup_failed" };
    const j = await r.json();
    const m = j?.result?.addressMatches?.[0];
    if (!m) return { status: "lookup_failed" };
    const c = m.geographies?.Counties?.[0];
    const p = m.geographies?.["Incorporated Places"]?.[0];
    if (!c) return { status: "lookup_failed" };
    const county = `${c.STATE}${c.COUNTY}`;
    const place = p ? `${p.STATE}${p.PLACE}` : "";
    if (county !== KCEB_COUNTY || place !== KCMO_PLACE) return { status: "out_of_area" };
    return { status: "eligible", lat: m.coordinates.y, lon: m.coordinates.x };
  } catch {
    return { status: "lookup_failed" };
  }
}
