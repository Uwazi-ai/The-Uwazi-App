import { describe, expect, it } from "vitest";
import { rideAlertData, waitlistAlertData } from "../../supabase/functions/_shared/ride-alert-content";
import { dispatchData } from "../../supabase/functions/_shared/ztrip-email-content";
import { singleMessage } from "@/components/rides/desk/ztripText";
import type { Ride } from "@/components/rides/desk/deskLib";

const base = { ride_code: "UZ-1003", ride_day: "2026-11-03", pickup_time: "11:00", needs_destination: false, needs: [], round_trip: true };

describe("TODAY labels for late requests", () => {
  it("coordinator alert subject and body", () => {
    const d = rideAlertData({ ...base, created_at: "2026-11-03T16:00:00Z" }, "Garrison", 1, 3, false);
    expect(d.subject.startsWith("TODAY: UWAZI ride UZ-1003")).toBe(true);
    expect((d as { late?: string }).late).toBe("(requested 60 minutes before pickup)");
    expect(rideAlertData({ ...base, created_at: "2026-11-01T16:00:00Z" }, "Garrison", 1, 3, false).subject.startsWith("UWAZI ride")).toBe(true);
  });
  it("zTrip dispatch email subject", () => {
    const r = { ...base, first_name_last_initial: "Fake T.", phone: "8165550100", pickup_address: "1 Fake St", zip: "64106", created_at: "2026-11-03T15:30:00Z" };
    const d = dispatchData(r, { name: "Garrison", address: "1124 E 5th St" }, { kind: "new" });
    expect(d.subject).toBe("TODAY: NEW ride UZ-1003: Tue, Nov 3, 11:00 AM pickup");
    expect(d.late).toBe("(requested 90 minutes before pickup)");
  });
  it("Text zTrip message", () => {
    const ride = { id: "a", ...base, pickup_time: "11:00:00", first_name_last_initial: "Fake T.", phone: "8165550100", pickup_address: "1 Fake St", destination_site_id: "s", status: "requested", created_at: "2026-11-03T16:15:00Z", site: { id: "s", name: "Garrison", address: "1124 E 5th St", hours: null, precinct_key: null } } as unknown as Ride;
    const m = singleMessage(ride);
    expect(m.startsWith("TODAY: UWAZI ride UZ-1003")).toBe(true);
    expect(m.endsWith("(requested 45 minutes before pickup)")).toBe(true);
  });
  it("standby alert has the fixed subject and no contact data", () => {
    const d = waitlistAlertData("2026-11-03", "standby", "8165550100");
    expect(d.subject).toBe("UWAZI standby: Tue, Nov 3");
    expect(JSON.stringify(d)).not.toContain("8165550100");
  });
});
