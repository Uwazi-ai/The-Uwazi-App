import { fmtDay, fmtHour, fmtPhone } from "@/components/rides/RidesUI";
import { NEED_LABELS, type Ride } from "./deskLib";

// Coordinator-to-zTrip texts. Never include card_token or the private ride link.
export type ZEvent = { request_id: string; event_type: string; note: string | null; created_at: string };

export function smsHref(phone: string, body: string) {
  const d = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return `sms:+1${d}?&body=${encodeURIComponent(body)}`;
}

const dest = (r: Ride) => (r.site && !r.needs_destination ? `${r.site.name}, ${r.site.address}` : "voting place not set yet");
const needs = (r: Ride) => (r.needs.length ? r.needs.map((n) => NEED_LABELS[n] ?? n).join(", ") : "none");

// What zTrip was told. A change here means the ride needs an update text.
export const signature = (r: Ride) => [r.status === "cancelled" ? "cancelled" : "active", r.ride_day, r.pickup_time.slice(0, 5), r.needs_destination ? "" : r.destination_site_id ?? ""].join("|");

export function singleMessage(r: Ride) {
  return `UWAZI ride ${r.ride_code}: ${fmtDay(r.ride_day)}, pickup ${fmtHour(r.pickup_time)}. Rider ${r.first_name_last_initial}, ${fmtPhone(r.phone)}. From ${r.pickup_address}. To ${dest(r)}. ${r.round_trip ? "Round trip" : "One way"}. Needs: ${needs(r)}.`;
}

export function groupMessage(rides: Ride[]) {
  if (rides.length === 1) return singleMessage(rides[0]);
  const r0 = rides[0];
  const list = rides.map((r, i) => `${i + 1}) ${r.first_name_last_initial}, ${fmtPhone(r.phone)}, ${r.pickup_address}, needs ${needs(r)}.`).join(" ");
  return `UWAZI group trip ${fmtDay(r0.ride_day)} ${fmtHour(r0.pickup_time)} to ${dest(r0)}. ${list}`;
}

export function updateMessage(r: Ride) {
  if (r.status === "cancelled") return `CANCELLED UWAZI ride ${r.ride_code}. Please do not pick up.`;
  return `CHANGED ${singleMessage(r)}`;
}

// Same day, pickup time and destination ride in one message.
export function batches(rides: Ride[]) {
  const m = new Map<string, Ride[]>();
  for (const r of rides) {
    const k = `${r.ride_day}|${r.pickup_time.slice(0, 5)}|${r.needs_destination ? "none:" + r.id : r.destination_site_id}`;
    m.set(k, [...(m.get(k) ?? []), r]);
  }
  return [...m.entries()].map(([key, list]) => ({ key, rides: list }));
}

export function lastTexted(events: ZEvent[], id: string) {
  return events.filter((e) => e.request_id === id && e.event_type === "ztrip_texted").at(-1);
}

// "new" = never told zTrip. "update" = told, then ride changed or was cancelled.
export function zState(r: Ride, events: ZEvent[]): "new" | "update" | "done" {
  const last = lastTexted(events, r.id);
  if (!last) return r.status === "requested" || r.status === "booked" ? "new" : "done";
  return last.note === signature(r) ? "done" : "update";
}
