// One shared online booking cutoff for Rides to the Polls.
// Used by get-ride-availability, create-ride-request, join-ride-waitlist and the desk.
// Pure and clock injectable. All wall times are America/Chicago.

export const TZ = "America/Chicago";
// Normal days: default_lead_minutes (default 120). The TODAY label keeps its own 24 hour rule.
export const DEFAULT_LEAD_MINUTES = 120;
export const DEFAULT_LEAD_MIN = 30;
export const DEFAULT_LEAD_MAX = 1440;
export const TODAY_LABEL_MINUTES = 24 * 60;
export const SAME_DAY_MIN = 30;
export const SAME_DAY_MAX = 240;
export const SAME_DAY_DEFAULT = 60;
export const TOO_SOON_MSG = "Too soon for online booking. Call (816) 379-6885 for a ride in the next hour.";
export const DEFAULT_PAUSE_MSG = "We are full right now. Call (816) 379-6885 and we will do our best to help.";

export type CutoffSettings = {
  same_day_dates?: string[] | null;
  same_day_lead_minutes?: number | null;
  default_lead_minutes?: number | null;
  requests_paused?: boolean | null;
  pause_message?: string | null;
};

// Offset of Central time from UTC at an instant, in minutes (CDT -300, CST -360).
function offsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const wall = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
  return Math.round((wall - Math.floor(utcMs / 1000) * 1000) / 60000);
}

// Real instant of a Central wall clock pickup, correct across daylight saving changes.
export function centralToUtcMs(day: string, time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const [y, mo, d] = day.split("-").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, m);
  let t = wall - offsetMinutes(wall) * 60000;
  t = wall - offsetMinutes(t) * 60000;
  return t;
}

// Central calendar date for an instant.
export function centralDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function clampLead(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return SAME_DAY_DEFAULT;
  return Math.min(SAME_DAY_MAX, Math.max(SAME_DAY_MIN, v));
}

export function isSameDayDate(day: string, s: CutoffSettings | null | undefined): boolean {
  return !!s?.same_day_dates?.some((d) => String(d).slice(0, 10) === day);
}

// Minutes of notice an online request needs for this service day.
export function leadMinutesFor(day: string, s: CutoffSettings | null | undefined): number {
  return isSameDayDate(day, s) ? clampLead(s?.same_day_lead_minutes ?? SAME_DAY_DEFAULT) : clampDefaultLead(s?.default_lead_minutes);
}

export function clampDefaultLead(n: unknown): number {
  const v = Math.round(Number(n ?? DEFAULT_LEAD_MINUTES));
  if (!Number.isFinite(v)) return DEFAULT_LEAD_MINUTES;
  return Math.min(DEFAULT_LEAD_MAX, Math.max(DEFAULT_LEAD_MIN, v));
}

// "2 hours", "90 minutes", "1 hour".
export function noticeText(minutes: number): string {
  if (minutes % 60 === 0) { const h = minutes / 60; return `${h} hour${h === 1 ? "" : "s"}`; }
  return `${minutes} minutes`;
}

export function normalTooSoonMsg(minutes: number): string {
  return `Rides must be booked at least ${noticeText(minutes)} ahead. Call (816) 379-6885 for a ride sooner.`;
}

// The too soon message for a service day.
export function tooSoonMessageFor(day: string, s: CutoffSettings | null | undefined): string {
  return isSameDayDate(day, s) ? TOO_SOON_MSG : normalTooSoonMsg(clampDefaultLead(s?.default_lead_minutes));
}

export function minutesUntil(day: string, time: string, now: Date = new Date()): number {
  return (centralToUtcMs(day, time) - now.getTime()) / 60000;
}

// True when an online request for this pickup is past the cutoff.
export function isTooSoon(day: string, time: string, s: CutoffSettings | null | undefined, now: Date = new Date()): boolean {
  return minutesUntil(day, time, now) < leadMinutesFor(day, s);
}

export function isPaused(s: CutoffSettings | null | undefined): boolean {
  return s?.requests_paused === true;
}

export function pauseMessage(s: CutoffSettings | null | undefined): string {
  const m = (s?.pause_message ?? "").trim();
  return m || DEFAULT_PAUSE_MSG;
}

// Whole minutes between when a ride was requested and its pickup.
export function requestedMinutesBefore(createdAt: string, day: string, time: string): number {
  return Math.max(0, Math.round((centralToUtcMs(day, time) - Date.parse(createdAt)) / 60000));
}

// Rides requested under 24 hours ahead get a TODAY label for dispatch.
export function isLateRequest(createdAt: string | null | undefined, day: string, time: string): boolean {
  if (!createdAt) return false;
  return requestedMinutesBefore(createdAt, day, time) < TODAY_LABEL_MINUTES;
}

export function todayPrefix(createdAt: string | null | undefined, day: string, time: string): string {
  return isLateRequest(createdAt, day, time) ? "TODAY: " : "";
}

export function lateNote(createdAt: string | null | undefined, day: string, time: string): string {
  return createdAt && isLateRequest(createdAt, day, time) ? `(requested ${requestedMinutesBefore(createdAt, day, time)} minutes before pickup)` : "";
}
