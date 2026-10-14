// Kansas City Election Board precinct map (ArcGIS FeatureServer, polygons).
// Loaded into kceb_precincts and matched with precinct_for_point. Never guess.
// deno-lint-ignore-file no-explicit-any

export const KCEB_PRECINCTS_URL =
  "https://services3.arcgis.com/Ayu3EsYWkD5ZwKLW/arcgis/rest/services/KCEB_Precincts_view/FeatureServer/10";

export async function fetchKcebLayer(): Promise<{ type: "FeatureCollection"; features: any[] }> {
  const features: any[] = [];
  for (let offset = 0; offset < 20000; offset += 2000) {
    const q = new URLSearchParams({
      where: "1=1", outFields: "Name", outSR: "4326", f: "geojson",
      resultOffset: String(offset), resultRecordCount: "2000",
    });
    const r = await fetch(`${KCEB_PRECINCTS_URL}/query?${q}`, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`layer fetch failed ${r.status}`);
    const j = await r.json();
    const page = j?.features ?? [];
    features.push(...page);
    const more = j?.exceededTransferLimit || j?.properties?.exceededTransferLimit;
    if (page.length < 2000 && !more) break;
  }
  return { type: "FeatureCollection", features };
}

export async function precinctForPoint(db: any, lat: number, lon: number): Promise<string | null> {
  const { data, error } = await db.rpc("precinct_for_point", { lat, lon });
  if (error) { console.error("precinct_for_point failed", error.message); return null; }
  return (data as string | null) ?? null;
}

// Verified Election Day polling place for a precinct, or null.
export async function pollingPlaceFor(db: any, key: string | null) {
  if (!key) return null;
  const { data } = await db.from("voter_guide_sites").select("id,name,address,room")
    .eq("site_type", "polling").eq("verification_status", "verified").eq("precinct_key", key).limit(1).maybeSingle();
  return data as { id: string; name: string; address: string; room: string | null } | null;
}
