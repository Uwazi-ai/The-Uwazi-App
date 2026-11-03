import { describe, expect, it } from "vitest";
import { placeContest, scopeBallot, scopeLabel, resolveVoterCounty, countyFromZip, isOfficialSource, type VoterPlace } from "@/lib/ballotScope";

const statewide = { state: "MO", scope_level: "statewide" };
const jacksonExec = { state: "MO", scope_level: "county", scope_counties: ["jackson"] };
const cassAuditor = { state: "MO", scope_level: "county", scope_counties: ["cass"] };
const platteTreasurer = { state: "MO", scope_level: "county", scope_counties: ["platte"] };
const house24 = { state: "MO", scope_level: "district", scope_district_type: "state_house", scope_district_id: "24" };
const usHouse5 = { state: "MO", scope_level: "district", scope_district_type: "us_house", scope_district_id: "5" };
const usHouse6 = { state: "MO", scope_level: "district", scope_district_type: "us_house", scope_district_id: "6" };
const leg2 = { state: "MO", scope_level: "district", scope_counties: ["jackson"], scope_district_type: "county_leg", scope_district_id: "2" };
const all = [statewide, jacksonExec, cassAuditor, platteTreasurer, house24, usHouse5, usHouse6, leg2];

const v = (county: VoterPlace["county"], districts: VoterPlace["districts"] = {}): VoterPlace => ({ state: "MO", county, districts });

describe("ballot scope filter", () => {
  it("shows statewide contests to every Missouri voter, even with no county", () => {
    expect(placeContest(statewide, v(null))).toBe("show");
    expect(placeContest(statewide, v("other"))).toBe("show");
  });

  it("shows county contests only to that county's voters", () => {
    expect(placeContest(cassAuditor, v("cass"))).toBe("show");
    expect(placeContest(cassAuditor, v("jackson"))).toBe("hide");
    expect(placeContest(cassAuditor, v("other"))).toBe("hide");
    expect(placeContest(cassAuditor, v(null))).toBe("hide");
  });

  it("shows a district race only when the voter's district matches", () => {
    expect(placeContest(house24, v("jackson", { state_house: "24" }))).toBe("show");
    expect(placeContest(house24, v("jackson", { state_house: "25" }))).toBe("hide");
    expect(placeContest(usHouse5, v("clay", { us_house: "5" }))).toBe("show");
    expect(placeContest(usHouse6, v("clay", { us_house: "5" }))).toBe("hide");
  });

  it("never shows other districts' races when the district is unknown", () => {
    expect(placeContest(usHouse5, v("cass"))).toBe("district_unknown");
    expect(placeContest(house24, v("platte"))).toBe("district_unknown");
  });

  it("county legislature races need Jackson County and the matching district", () => {
    expect(placeContest(leg2, v("jackson", { county_leg: "2" }))).toBe("show");
    expect(placeContest(leg2, v("cass", { county_leg: "2" }))).toBe("hide");
    expect(placeContest(leg2, v("clay"))).toBe("hide");
  });

  it("hides contests with no scope and contests from another state", () => {
    expect(placeContest({ state: "MO", scope_level: null }, v("jackson"))).toBe("hide");
    expect(placeContest({ state: "KS", scope_level: "statewide" }, v("jackson"))).toBe("hide");
  });

  it("a KCEB voter in House 24 and Legislature 2 sees only their own races", () => {
    const { mine, districtUnknown } = scopeBallot(all, v("jackson", { state_house: "24", county_leg: "2", us_house: "5" }));
    expect(mine).toEqual([statewide, jacksonExec, house24, usHouse5, leg2]);
    expect(districtUnknown).toBe(0);
  });

  it("an Another Missouri county voter sees statewide only, with district races counted as unknown", () => {
    const { mine, districtUnknown } = scopeBallot(all, v("other"));
    expect(mine).toEqual([statewide]);
    expect(districtUnknown).toBe(3);
  });

  it("labels each contest with its scope", () => {
    expect(scopeLabel(statewide)).toBe("Statewide");
    expect(scopeLabel(cassAuditor)).toBe("Cass County");
    expect(scopeLabel(usHouse5)).toBe("U.S. House District 5");
    expect(scopeLabel(house24)).toBe("State House District 24");
    expect(scopeLabel(leg2)).toBe("Jackson County Legislature District 2");
  });
});

describe("voter county", () => {
  it("a KCEB precinct always means Jackson County", () => {
    expect(resolveVoterCounty({ state: "MO", hasKcebPrecinct: true, saved: "cass", zip: "64083" })).toEqual({ county: "jackson", source: "precinct" });
  });
  it("a saved choice beats the ZIP", () => {
    expect(resolveVoterCounty({ state: "MO", hasKcebPrecinct: false, saved: "platte", zip: "64012" })).toEqual({ county: "platte", source: "saved" });
  });
  it("defaults from ZIP only when the ZIP is in a single county", () => {
    expect(countyFromZip("64012")).toBe("cass"); // Belton, Cass County only
    expect(countyFromZip("64079")).toBe("platte"); // Platte City
    expect(countyFromZip("64151")).toBeNull(); // spans two counties
    expect(countyFromZip("64068")).toBe("clay"); // Liberty
    expect(countyFromZip("64105")).toBe("jackson");
    expect(countyFromZip("65802")).toBe("other"); // Springfield, Greene County
    expect(countyFromZip("64081")).toBe("jackson"); // Lee's Summit is in Jackson only per Census
    expect(resolveVoterCounty({ state: "MO", hasKcebPrecinct: false, saved: null, zip: "00000" })).toEqual({ county: null, source: null });
  });
  it("only applies to Missouri", () => {
    expect(resolveVoterCounty({ state: "KS", hasKcebPrecinct: false, saved: "cass", zip: "64012" }).county).toBeNull();
  });
});

describe("official sources", () => {
  it("election authorities are official, news sites are not", () => {
    expect(isOfficialSource("https://www.kceb.org")).toBe(true);
    expect(isOfficialSource("https://www.casscounty.com/DocumentCenter/View/4496")).toBe(true);
    expect(isOfficialSource("https://www.kcur.org/x")).toBe(false);
    expect(isOfficialSource("https://ballotpedia.org/x")).toBe(false);
    expect(isOfficialSource("https://thewestonchronicle.com/news/x")).toBe(false);
    expect(isOfficialSource(null)).toBe(false);
  });
});

import { groupByScope as _gbs } from "@/lib/ballotScope";
describe("groupByScope", () => {
  const mk = (id: string, scope_level: any, extra: any = {}) => ({ id, state: "MO", scope_level, scope_counties: null, scope_district_type: null, scope_district_id: null, ...extra });
  it("puts statewide races first, then county, then districts, keeping order", () => {
    const g = _gbs([mk("h", "district"), mk("auditor", "statewide"), mk("q1", "county", { scope_counties: ["jackson"] }), mk("a3", "statewide")] as any, "jackson");
    expect(g.map((x) => x.label)).toEqual(["Statewide", "Jackson County", "Your districts"]);
    expect(g[0].items.map((x: any) => x.id)).toEqual(["auditor", "a3"]);
  });
  it("shows State Auditor under Statewide for another county voter", () => {
    const g = _gbs([mk("auditor", "statewide")] as any, "other");
    expect(g).toHaveLength(1);
    expect(g[0].label).toBe("Statewide");
  });
});
