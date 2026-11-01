import { centralDate, centralToUtcMs } from "../../../../../supabase/functions/_shared/ride-cutoff";
import { fmtHour } from "@/components/rides/RidesUI";
import type { Ride } from "../deskLib";

// Pure helpers for the Election Day desk. No personal data leaves these in titles or notices.

export const SEAT_STATUSES = ["requested", "booked", "riding", "completed"];
export const NOT_SENT_MINUTES = 5;
export const EDAY_FLAG = "ride-desk-eday";

export type WaveTile = { time: string; booked: number; seats: number; state: "Open" | "Full" | "Past" | "Paused"; minutes: number };
export type StandbyRow = { id: string; name_initial: string | null; time_window: string | null; phone: string; requested_date: string | null; created_at: string };
export type AdminAction = { target_id: string; action: string };
export type DeskEvent = { request_id: string; event_type: string; created_at: string };

export function showPanel(today: string, sameDayDates: string[] | null | undefined, rehearsal: boolean) {
  return rehearsal || !!sameDayDates?.some((d) => String(d).slice(0, 10) === today);
}

export const minutesTo = (day: string, time: string, now: number) => Math.round((centralToUtcMs(day, time.slice(0, 5)) - now) / 60000);
export const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - Date.parse(iso)) / 60000));

export function capacity(rides: Ride[], waves: string[], day: string, seats: number, paused: boolean, now: number) {
  const tiles: WaveTile[] = waves.map((w) => {
    const time = w.slice(0, 5);
    const booked = rides.filter((r) => r.ride_day === day && r.pickup_time.slice(0, 5) === time && SEAT_STATUSES.includes(r.status)).length;
    const minutes = minutesTo(day, time, now);
    const state: WaveTile["state"] = minutes < 0 ? "Past" : paused ? "Paused" : booked >= seats ? "Full" : "Open";
    return { time, booked, seats, state, minutes };
  });
  const booked = tiles.reduce((a, t) => a + t.booked, 0);
  return { tiles, booked, total: tiles.length * seats, label: `${booked} of ${tiles.length * seats} seats booked` };
}

export function queue(rides: Ride[], day: string) {
  return rides
    .filter((r) => r.ride_day === day && r.status !== "referred")
    .sort((a, b) => a.pickup_time.localeCompare(b.pickup_time) || a.created_at.localeCompare(b.created_at));
}

// Red flag: an active ride with no zTrip text or email 5 minutes after it was requested.
export function notSent(r: Ride, events: DeskEvent[], now: number) {
  if (!["requested", "booked"].includes(r.status)) return false;
  if (events.some((e) => e.request_id === r.id && (e.event_type === "ztrip_texted" || e.event_type === "ztrip_emailed"))) return false;
  return now - Date.parse(r.created_at) >= NOT_SENT_MINUTES * 60000;
}

// Only the ride code and pickup time. Never a name, phone, address or email.
export const noticeTitle = (r: Pick<Ride, "ride_code" | "pickup_time">) => `New ride request ${r.ride_code}, ${fmtHour(r.pickup_time)}`;
export const standbyNoticeTitle = () => "New standby signup";
export const deskTitle = (unhandled: number) => (unhandled > 0 ? `(${unhandled} NEW) Ride desk` : "Ride desk");

// Web requests for the day that were not known before. Phone requests never alert.
export function newWebRequests(rides: Ride[], known: Set<string>, day: string) {
  return rides.filter((r) => !known.has(r.id) && r.source !== "phone" && r.ride_day === day);
}

// Rides that just became cancelled, or got a new no_show event, on this day.
export function freedSeats(prev: Map<string, string>, rides: Ride[], events: DeskEvent[], seenNoShow: Set<string>, day: string) {
  const out: Ride[] = [];
  for (const r of rides) {
    if (r.ride_day !== day) continue;
    const was = prev.get(r.id);
    if (r.status === "cancelled" && was && was !== "cancelled") out.push(r);
    else if (!seenNoShow.has(r.id) && events.some((e) => e.request_id === r.id && e.event_type === "no_show")) out.push(r);
  }
  return out;
}

export function openStandby(rows: StandbyRow[], actions: AdminAction[], day: string) {
  const removed = new Set(actions.filter((a) => a.action === "standby_removed").map((a) => a.target_id));
  return rows.filter((w) => String(w.requested_date ?? "").slice(0, 10) === day && !removed.has(w.id)).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export const todayCentral = (now: number) => centralDate(new Date(now));
