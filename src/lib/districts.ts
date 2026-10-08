/** Maps a ballot contest district type to the key we store in user_districts.resolved. */
export const CONTEST_DISTRICT_KEY: Record<string, string> = {
  mo_house: "state_house",
  ks_house: "state_house",
  state_house: "state_house",
  mo_senate: "state_senate",
  ks_senate: "state_senate",
  state_senate: "state_senate",
  us_house: "congressional",
  congressional: "congressional",
  jackson_leg: "commission",
  council: "council",
  kc_council: "council",
  school_board: "school_district",
  school_district: "school_district",
  ward: "ward",
  county: "county",
  place: "place",
};

/** Types that cover a fixed area without needing a district id. */
const FIXED_AREA: Record<string, { key: string; id: string }> = {
  kc_all: { key: "place", id: "2938000" },
  jackson_leg_at_large: { key: "county", id: "29095" },
};

export type DistrictMatch = "match" | "no" | "unknown";

const norm = (v: unknown) => String(v ?? "").replace(/^0+/, "");

/** Decide whether a contest is on this person's ballot from their resolved district codes. */
export function matchContest(
  contest: { district_type?: string | null; district_id?: string | null },
  resolved: Record<string, string> | null | undefined,
): DistrictMatch {
  const type = contest.district_type;
  if (!type || type === "statewide") return "match";
  const fixed = FIXED_AREA[type];
  const key = fixed?.key ?? CONTEST_DISTRICT_KEY[type];
  const id = fixed?.id ?? contest.district_id;
  if (!key || !id) return "unknown";
  const mine = resolved?.[key];
  if (!mine) return "unknown";
  return norm(mine) === norm(id) ? "match" : "no";
}

/** Older helper kept for callers that only need yes or no. Unknown districts show. */
export function contestMatchesDistricts(
  contest: { district_type?: string | null; district_id?: string | null },
  resolved: Record<string, string> | null | undefined,
): boolean {
  return matchContest(contest, resolved) !== "no";
}

/** Which section of the ballot a contest belongs in. */
export function ballotLevel(contest: { contest_type: string; district_type?: string | null; office_name?: string | null; measure_title?: string }): "federal" | "state" | "county" | "local" | "measure" {
  if (contest.contest_type === "ballot_measure") return "measure";
  const t = contest.district_type || "";
  const name = `${contest.office_name || ""} ${contest.measure_title || ""}`.toLowerCase();
  if (t === "us_house" || t === "congressional" || /u\.?s\.? (senate|house|representative)|congress/.test(name)) return "federal";
  if (t === "statewide" || /^(mo|ks|state)_/.test(t) || t.startsWith("state")) return "state";
  if (t === "county" || t.startsWith("jackson") || name.includes("county")) return "county";
  return "local";
}
