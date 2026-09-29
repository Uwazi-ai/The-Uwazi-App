/** Maps a ballot contest district type to the key we store in user_districts.resolved. */
export const CONTEST_DISTRICT_KEY: Record<string, string> = {
  mo_house: "state_house",
  mo_senate: "state_senate",
  us_house: "congressional",
  congressional: "congressional",
  jackson_leg: "commission",
  council: "council",
  kc_council: "council",
  school_board: "school_board",
  ward: "ward",
};

/** True when a contest with no district, or a district that matches this person, should show. */
export function contestMatchesDistricts(
  contest: { district_type?: string | null; district_id?: string | null },
  resolved: Record<string, string> | null | undefined,
): boolean {
  const type = contest.district_type;
  const id = contest.district_id;
  if (!type || !id) return true;
  const key = CONTEST_DISTRICT_KEY[type];
  if (!key) return true; // Types we do not map yet, such as city wide lists, always show.
  const mine = resolved?.[key];
  if (!mine) return true; // We do not know their district yet, so we show it and say so.
  return String(mine).replace(/^0+/, "") === String(id).replace(/^0+/, "");
}
