import { describe, expect, it } from "vitest";
import { ridesAreLive } from "@/lib/ridesLive";
import { homeBatches, homeMessage } from "@/components/rides/desk/ztripText";
import type { Ride } from "@/components/rides/desk/deskLib";

describe("rides start at midnight Central Oct 20", () => {
  it("off at 11:59 PM Oct 19", () => expect(ridesAreLive({ allowTestFlag: false, now: Date.parse("2026-10-19T23:59:00-05:00") })).toBe(false));
  it("on at midnight", () => expect(ridesAreLive({ allowTestFlag: false, now: Date.parse("2026-10-20T00:00:00-05:00") })).toBe(true));
});

const r = (o: Partial<Ride>) => ({ id: "a", ride_code: "UZ-1001", ride_day: "2026-10-22", round_trip: true, trip_stage: 5, status: "riding", first_name_last_initial: "A T.", phone: "8165550111", pickup_address: "1 Main", needs: [], needs_destination: false, destination_site_id: "s", card_token: "SECRET", site: { id: "s", name: "Site", address: "2 Elm", hours: null, precinct_key: null }, ...o }) as Ride;
describe("ride home ready", () => {
  it("groups same day and voting place, skips one way", () => {
    const b = homeBatches([r({}), r({ id: "b" }), r({ id: "c", round_trip: false })], []);
    expect(b.length).toBe(1); expect(b[0].rides.length).toBe(2);
  });
  it("clears after ride_home_texted", () => {
    expect(homeBatches([r({})], [{ request_id: "a", event_type: "ride_home_texted", note: null, created_at: "2026-10-22T10:00:00Z" }]).length).toBe(0);
  });
  it("never includes the card token", () => expect(homeMessage([r({})])).not.toContain("SECRET"));
});
