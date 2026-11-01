import { describe, expect, it } from "vitest";
import {
  centralDate, centralToUtcMs, isPaused, isTooSoon, lateNote, leadMinutesFor, pauseMessage, todayPrefix, TOO_SOON_MSG,
} from "../../supabase/functions/_shared/ride-cutoff";

const S = { same_day_dates: ["2026-11-03"], same_day_lead_minutes: 60 };
const at = (iso: string) => new Date(iso);

describe("Central time conversion across the Nov 1 2026 time change", () => {
  it("uses CDT (UTC-5) before 2 AM Nov 1 and CST (UTC-6) after", () => {
    expect(new Date(centralToUtcMs("2026-11-01", "00:30")).toISOString()).toBe("2026-11-01T05:30:00.000Z");
    expect(new Date(centralToUtcMs("2026-11-01", "03:00")).toISOString()).toBe("2026-11-01T09:00:00.000Z");
    expect(new Date(centralToUtcMs("2026-11-03", "11:00")).toISOString()).toBe("2026-11-03T17:00:00.000Z");
  });
  it("reports the Central date, not the UTC date", () => {
    expect(centralDate(at("2026-11-03T05:30:00Z"))).toBe("2026-11-02");
    expect(centralDate(at("2026-11-03T06:00:00Z"))).toBe("2026-11-03");
  });
  it("counts real hours across the change: Oct 31 11:30 AM CDT is 24.5 hours before Nov 1 11 AM CST", () => {
    expect(isTooSoon("2026-11-01", "11:00", S, at("2026-10-31T16:30:00Z"))).toBe(false);
    expect(isTooSoon("2026-11-01", "11:00", S, at("2026-10-31T17:01:00Z"))).toBe(true);
  });
});

describe("Nov 2 keeps the 24 hour rule", () => {
  it("needs 24 hours", () => {
    expect(leadMinutesFor("2026-11-02", S)).toBe(1440);
    expect(isTooSoon("2026-11-02", "11:00", S, at("2026-11-01T17:00:00Z"))).toBe(false);
    expect(isTooSoon("2026-11-02", "11:00", S, at("2026-11-01T17:01:00Z"))).toBe(true);
  });
});

describe("Nov 3 same day cutoff", () => {
  it("60 minutes by default: 61 bookable, 59 refused", () => {
    expect(isTooSoon("2026-11-03", "11:00", S, at("2026-11-03T15:59:00Z"))).toBe(false);
    expect(isTooSoon("2026-11-03", "11:00", S, at("2026-11-03T16:00:00Z"))).toBe(false);
    expect(isTooSoon("2026-11-03", "11:00", S, at("2026-11-03T16:01:00Z"))).toBe(true);
  });
  it("30 minute lower limit, clamps lower values", () => {
    expect(leadMinutesFor("2026-11-03", { ...S, same_day_lead_minutes: 30 })).toBe(30);
    expect(leadMinutesFor("2026-11-03", { ...S, same_day_lead_minutes: 5 })).toBe(30);
    expect(isTooSoon("2026-11-03", "11:00", { ...S, same_day_lead_minutes: 30 }, at("2026-11-03T16:29:00Z"))).toBe(false);
    expect(isTooSoon("2026-11-03", "11:00", { ...S, same_day_lead_minutes: 30 }, at("2026-11-03T16:31:00Z"))).toBe(true);
  });
  it("240 minute upper limit, clamps higher values", () => {
    expect(leadMinutesFor("2026-11-03", { ...S, same_day_lead_minutes: 240 })).toBe(240);
    expect(leadMinutesFor("2026-11-03", { ...S, same_day_lead_minutes: 999 })).toBe(240);
    expect(isTooSoon("2026-11-03", "15:30", { ...S, same_day_lead_minutes: 240 }, at("2026-11-03T17:29:00Z"))).toBe(false);
    expect(isTooSoon("2026-11-03", "15:30", { ...S, same_day_lead_minutes: 240 }, at("2026-11-03T17:31:00Z"))).toBe(true);
  });
  it("a day not in same_day_dates uses 24 hours", () => {
    expect(leadMinutesFor("2026-11-03", { same_day_dates: [] })).toBe(1440);
  });
});

describe("pause and labels", () => {
  it("pause flag and message", () => {
    expect(isPaused({ requests_paused: true })).toBe(true);
    expect(isPaused({ requests_paused: false })).toBe(false);
    expect(pauseMessage({ pause_message: "" })).toContain("(816) 379-6885");
  });
  it("too soon copy", () => {
    expect(TOO_SOON_MSG).toBe("Too soon for online booking. Call (816) 379-6885 for a ride in the next hour.");
  });
  it("TODAY only for rides requested under 24 hours before pickup", () => {
    expect(todayPrefix("2026-11-03T16:00:00Z", "2026-11-03", "11:00")).toBe("TODAY: ");
    expect(lateNote("2026-11-03T16:00:00Z", "2026-11-03", "11:00")).toBe("(requested 60 minutes before pickup)");
    expect(todayPrefix("2026-11-02T16:00:00Z", "2026-11-03", "11:00")).toBe("");
    expect(lateNote("2026-11-01T12:00:00Z", "2026-11-03", "11:00")).toBe("");
  });
});
