/**
 * Who sees which contest. Pure rules shared by My Ballot, the practice ballot and every
 * contest list. A contest with no scope is never shown to a voter.
 */
import zipCounty from "@/data/mo-zip-county.json";

export type CountyKey = "jackson" | "clay" | "platte" | "cass";
export type VoterCounty = CountyKey | "other";
export type ScopeDistrictType = "us_house" | "state_senate" | "state_house" | "county_leg";

export const COUNTY_OPTIONS: { key: VoterCounty; label: string }[] = [
  { key: "jackson", label: "Jackson County" },
  { key: "clay", label: "Clay County" },
  { key: "platte", label: "Platte County" },
  { key: "cass", label: "Cass County" },
  { key: "other", label: "Another Missouri county" },
];
export const COUNTY_LABEL: Record<string, string> = Object.fromEntries(COUNTY_OPTIONS.map((o) => [o.key, o.label]));

export interface ScopedContest {
  state?: string | null;
  scope_level?: string | null;
  scope_counties?: string[] | null;
  scope_district_type?: string | null;
  scope_district_id?: string | null;
}

export interface VoterPlace {
  state: string | null;
  /** Missouri county, or null when not known yet. */
  county: VoterCounty | null;
  /** Known district numbers keyed by ScopeDistrictType. */
  districts: Partial<Record<ScopeDistrictType, string>>;
}

export type Placement = "show" | "hide" | "district_unknown";

const norm = (v: unknown) => String(v ?? "").trim().replace(/^0+/, "");

/** Decide if a contest belongs on this voter's ballot. */
export function placeContest(c: ScopedContest, v: VoterPlace): Placement {
  if (!c.scope_level) return "hide";
  if (c.state && v.state && c.state !== v.state) return "hide";
  const counties = c.scope_counties?.length ? c.scope_counties : null;
  if (c.scope_level === "statewide") return "show";
  if (c.scope_level === "county") {
    return counties && v.county && counties.includes(v.county) ? "show" : "hide";
  }
  if (c.scope_level === "district") {
    if (counties && !(v.county && counties.includes(v.county))) return "hide";
    const type = c.scope_district_type as ScopeDistrictType | null;
    if (!type || !c.scope_district_id) return "hide";
    const mine = v.districts[type];
    if (!mine) return "district_unknown";
    return norm(mine) === norm(c.scope_district_id) ? "show" : "hide";
  }
  return "hide";
}

/** Split contests into what this voter sees and how many district races we could not place. */
export function scopeBallot<T extends ScopedContest>(contests: T[], v: VoterPlace): { mine: T[]; districtUnknown: number } {
  const mine: T[] = [];
  let districtUnknown = 0;
  for (const c of contests) {
    const p = placeContest(c, v);
    if (p === "show") mine.push(c);
    else if (p === "district_unknown") districtUnknown++;
  }
  return { mine, districtUnknown };
}

const DISTRICT_LABEL: Record<ScopeDistrictType, string> = {
  us_house: "U.S. House District",
  state_senate: "State Senate District",
  state_house: "State House District",
  county_leg: "County Legislature District",
};

/** Short label for a contest card, like "Statewide" or "U.S. House District 5". */
export function scopeLabel(c: ScopedContest): string | null {
  if (c.scope_level === "statewide") return "Statewide";
  if (c.scope_level === "county") {
    const cs = c.scope_counties ?? [];
    if (cs.length === 1) return COUNTY_LABEL[cs[0]] ?? null;
    if (cs.length > 1) return `${cs.map((k) => COUNTY_LABEL[k]?.replace(" County", "")).join(", ")} counties`;
    return null;
  }
  if (c.scope_level === "district" && c.scope_district_type) {
    const base = DISTRICT_LABEL[c.scope_district_type as ScopeDistrictType];
    if (!base) return null;
    const county = c.scope_district_type === "county_leg" && c.scope_counties?.length === 1 ? `${COUNTY_LABEL[c.scope_counties[0]].replace(" County", "")} ` : "";
    return `${county}${base} ${c.scope_district_id ?? ""}`.trim();
  }
  return null;
}

/** County from ZIP, only when the whole ZIP lies in one Missouri county. */
export function countyFromZip(zip: string | null | undefined): VoterCounty | null {
  const z = String(zip ?? "").slice(0, 5);
  return ((zipCounty as Record<string, string>)[z] as VoterCounty) ?? null;
}

export type CountySource = "precinct" | "saved" | "zip" | null;

/** Pick the voter's county: KCEB precinct means Jackson County, then their saved choice, then a one-county ZIP. */
export function resolveVoterCounty(input: { state: string | null; hasKcebPrecinct: boolean; saved: string | null | undefined; zip: string | null | undefined }): { county: VoterCounty | null; source: CountySource } {
  if (input.state !== "MO") return { county: null, source: null };
  if (input.hasKcebPrecinct) return { county: "jackson", source: "precinct" };
  if (input.saved && COUNTY_LABEL[input.saved]) return { county: input.saved as VoterCounty, source: "saved" };
  const z = countyFromZip(input.zip);
  return z ? { county: z, source: "zip" } : { county: null, source: null };
}

/** Election authority and Secretary of State domains. Anything else is a secondary source. */
const OFFICIAL_HOSTS = [
  "kceb.org", "sos.mo.gov", "casscounty.com", "jcebmo.org", "jacksongov.org", "voteclaycountymo.gov", "claycountymo.gov",
  "plattecountymovotes.gov", "co.platte.mo.us", "sos.ks.gov", "jocoelection.org", "jocogov.org",
];
export function isOfficialSource(url: string | null | undefined): boolean {
  if (!url) return false;
  let h = "";
  try { h = new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return false; }
  return OFFICIAL_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
}

export type ScopeGroupKey = "statewide" | "county" | "districts";
/** Which heading a contest sits under. Follows scope only, never the title. */
export function scopeGroup(c: ScopedContest): ScopeGroupKey | null {
  if (c.scope_level === "statewide") return "statewide";
  if (c.scope_level === "county") return "county";
  if (c.scope_level === "district") return "districts";
  return null;
}
/** Group contests as Statewide, then the voter's county, then Your districts. Keeps input order inside each group. */
export function groupByScope<T extends ScopedContest>(contests: T[], county: VoterCounty | null): { key: ScopeGroupKey; label: string; items: T[] }[] {
  const countyLabel = county && county !== "other" ? COUNTY_LABEL[county] : "Your county";
  const groups: { key: ScopeGroupKey; label: string; items: T[] }[] = [
    { key: "statewide", label: "Statewide", items: [] },
    { key: "county", label: countyLabel, items: [] },
    { key: "districts", label: "Your districts", items: [] },
  ];
  for (const c of contests) {
    const g = scopeGroup(c);
    if (g) groups.find((x) => x.key === g)!.items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}
