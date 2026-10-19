import { describe, expect, it } from "vitest";
import { filterPollingSites, selectPollingSite, type PollSite } from "@/lib/electionDayMap";
import shapes from "@/data/kceb-precinct-map.json";
import pollLog from "@/data/kceb-nov-2026.json";

const sites: PollSite[] = [{ precinct_key: "17-6", name: "Southeast Community Center", address: "4201 E. 63rd St", room: "Meeting Room", hours: "6 AM to 7 PM" }];
describe("Election Day polling map", () => {
  it("uses the same assigned place for both official 17-6 shapes", () => {
    const parts = shapes.features.filter(f => f.properties.precinct_key === "17-6");
    expect(parts).toHaveLength(2);
    for (const part of parts) expect(selectPollingSite(sites, part.properties.precinct_key)?.address).toBe("4201 E. 63rd St");
  });
  it("never substitutes a destination for a missing precinct", () => {
    expect(selectPollingSite(sites, "25-18")).toBeNull();
  });
  it("filters precincts by exact ward rather than partial ward number", () => {
    expect(filterPollingSites(sites, "", "7")).toHaveLength(0);
    expect(filterPollingSites(sites, "Southeast", "17")).toHaveLength(1);
  });
  it("uses the poll log assignment rather than the nearest polling place", () => {
    const place = pollLog.polling.wards["11"].places.find(p => p.precincts.some(group => group.pcts.includes(12)));
    expect(place?.name).toBe("Sons of Columbus Meeting Hall");
  });
});