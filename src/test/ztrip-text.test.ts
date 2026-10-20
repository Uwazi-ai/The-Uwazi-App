import { describe, expect, it } from "vitest";
import { groupMessage, signature, singleMessage, smsHref, updateMessage, zState } from "@/components/rides/desk/ztripText";
import type { Ride } from "@/components/rides/desk/deskLib";

const ride = (o: Partial<Ride>): Ride => ({ id: "a", ride_code: "UZ-1001", ride_day: "2026-10-22", pickup_time: "10:00:00", first_name_last_initial: "Test A.", phone: "8165550101", pickup_address: "414 E 12th St", round_trip: true, needs: [], needs_destination: false, destination_site_id: "s1", status: "booked", card_token: "SECRET", site: { id: "s1", name: "Garrison", address: "1124 E 5th St", hours: null, precinct_key: null }, ...o } as Ride);

describe("zTrip text", () => {
  it("builds an sms link for the zTrip number", () => {
    expect(smsHref("8169184852", "a b")).toBe("sms:+18169184852?&body=a%20b");
  });
  it("never includes the card token or ride link", () => {
    const m = singleMessage(ride({}));
    expect(m).not.toContain("SECRET");
    expect(m).not.toContain("/rides/card");
  });
  it("single message only names one rider", () => {
    expect(singleMessage(ride({}))).toContain("Rider Test A., (816) 555-0101");
  });
  it("group message numbers each rider", () => {
    const m = groupMessage([ride({}), ride({ id: "b", first_name_last_initial: "Test B." })]);
    expect(m).toContain("1) Test A.");
    expect(m).toContain("2) Test B.");
  });
  it("cancelled after texting needs an update", () => {
    const r = ride({});
    const ev = [{ request_id: "a", event_type: "ztrip_texted", note: signature(r), created_at: "" }];
    expect(zState(r, ev)).toBe("done");
    const c = ride({ status: "cancelled" });
    expect(zState(c, ev)).toBe("update");
    expect(updateMessage(c)).toContain("CANCELLED UWAZI ride UZ-1001");
    expect(zState(ride({ pickup_time: "12:00:00" }), ev)).toBe("update");
  });
});
