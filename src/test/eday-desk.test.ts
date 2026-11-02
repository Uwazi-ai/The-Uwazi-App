import { describe, expect, it } from "vitest";
import { capacity, deskTitle, freedSeats, newWebRequests, noticeTitle, notSent, openStandby, showPanel } from "@/components/rides/desk/eday/edayLib";
import type { Ride } from "@/components/rides/desk/deskLib";

const ride = (o: Partial<Ride>) => ({ id: "r1", ride_code: "UZ-1203", ride_day: "2026-11-03", pickup_time: "14:00:00", status: "requested", source: "web", created_at: "2026-11-03T18:00:00Z", first_name_last_initial: "Pat Q.", phone: "8165550100", needs: [], ...o }) as unknown as Ride;
const NOW = Date.parse("2026-11-03T18:10:00Z"); // 12:10 PM CST

describe("Election Day desk rules", () => {
  it("shows on same day dates or rehearsal only", () => {
    expect(showPanel("2026-11-03", ["2026-11-03"], false)).toBe(true);
    expect(showPanel("2026-11-02", ["2026-11-03"], false)).toBe(false);
    expect(showPanel("2026-11-02", ["2026-11-03"], true)).toBe(true);
  });
  it("notice and title carry only code, time and a count", () => {
    const t = noticeTitle(ride({}));
    expect(t).toBe("New ride request UZ-1203, 2:00 PM");
    expect(t).not.toMatch(/Pat|555|8165/);
    expect(deskTitle(2)).toBe("(2 NEW) Ride desk");
    expect(deskTitle(0)).toBe("Ride desk");
  });
  it("Not sent to zTrip after 5 minutes, cleared by a text or email event", () => {
    expect(notSent(ride({ created_at: "2026-11-03T18:06:00Z" }), [], NOW)).toBe(false);
    expect(notSent(ride({ created_at: "2026-11-03T18:05:00Z" }), [], NOW)).toBe(true);
    expect(notSent(ride({}), [{ request_id: "r1", event_type: "ztrip_texted", created_at: "" }], NOW)).toBe(false);
    expect(notSent(ride({}), [{ request_id: "r1", event_type: "ztrip_emailed", created_at: "" }], NOW)).toBe(false);
  });
  it("never alerts for phone requests", () => {
    expect(newWebRequests([ride({ source: "phone" }), ride({ id: "r2" })], new Set(), "2026-11-03").map((r) => r.id)).toEqual(["r2"]);
  });
  it("capacity counts seats and states", () => {
    const c = capacity([ride({}), ride({ id: "r2" }), ride({ id: "r3" }), ride({ id: "r4", pickup_time: "11:00:00" })], ["11:00", "14:00", "15:30"], "2026-11-03", 3, false, NOW);
    expect(c.label).toBe("4 of 9 seats booked");
    expect(c.tiles.map((t) => t.state)).toEqual(["Past", "Full", "Open"]);
    expect(capacity([], ["15:30"], "2026-11-03", 3, true, NOW).tiles[0].state).toBe("Paused");
  });
  it("seat opens on cancel or a new no-show", () => {
    const prev = new Map([["r1", "booked"], ["r2", "booked"]]);
    const out = freedSeats(prev, [ride({ status: "cancelled" }), ride({ id: "r2", status: "booked" })], [{ request_id: "r2", event_type: "no_show", created_at: "" }], new Set(), "2026-11-03");
    expect(out.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
  it("removed standby entries are hidden", () => {
    const rows = [{ id: "w1", name_initial: "Ann B.", time_window: "Afternoon", phone: "8165550101", requested_date: "2026-11-03", created_at: "1" }, { id: "w2", name_initial: "Cy D.", time_window: null, phone: "8165550102", requested_date: "2026-11-03", created_at: "2" }];
    expect(openStandby(rows, [{ target_id: "w1", action: "standby_removed" }], "2026-11-03").map((w) => w.id)).toEqual(["w2"]);
  });
});
