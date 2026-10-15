import type { Tables } from "@/integrations/supabase/types";

export type Site = { id: string; name: string; address: string; hours: string | null; precinct_key: string | null };
export type Ride = Tables<"ride_requests"> & { site: Site | null };
export type Settings = Tables<"ride_settings">;
export type Block = Tables<"driver_blocks">;
export type RideEvent = Tables<"ride_events">;

export const NEED_LABELS: Record<string, string> = {
  wheelchair: "Wheelchair",
  walker: "Walker",
  service_animal: "Service animal",
  child_seat: "Child seat",
  extra_time: "Extra time",
  language_help: "Language help",
  other: "Other need",
};

export const FUNDED = ["booked", "riding", "completed"];

export function waitMinutes(r: Ride) {
  if (!r.booked_at) return null;
  return Math.round((new Date(r.booked_at).getTime() - new Date(r.created_at).getTime()) / 60000);
}

export function fmtWait(min: number | null) {
  if (min == null) return "None yet";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} hr ${min % 60} min`;
}

export function avgWait(rides: Ride[]) {
  const w = rides.map(waitMinutes).filter((x): x is number => x != null);
  return w.length ? Math.round(w.reduce((a, b) => a + b, 0) / w.length) : null;
}

export function stageLabel(r: Ride) {
  if (r.status === "riding") {
    if (r.trip_stage >= 6) return "Riding home";
    if (r.trip_stage === 5) return "Ride home sent";
    if (r.trip_stage === 4) return "At voting place";
    return "Riding to vote";
  }
  if (r.status === "booked") return ["Driver booked", "Driver on the way", "Driver is here"][r.trip_stage] ?? null;
  return null;
}

export type Stop = { id: string | null; name: string };
export type Group = { key: string; day: string; time: string; destName: string; destId: string | null; stops: Stop[]; rides: Ride[]; conflict: boolean };

// One trip per wave. Early waves go to one site. Election Day waves may stop at several polling places.
export function tripGroups(rides: Ride[]): Group[] {
  const active = rides.filter((r) => r.status === "requested" || r.status === "booked");
  const map = new Map<string, Group>();
  for (const r of active) {
    const key = `${r.ride_day}|${r.pickup_time}`;
    const g = map.get(key) ?? { key, day: r.ride_day, time: r.pickup_time, destName: "", destId: null, stops: [], rides: [], conflict: false };
    g.rides.push(r);
    const id = r.needs_destination ? null : r.destination_site_id;
    if (!g.stops.some((x) => x.id === id)) g.stops.push({ id, name: id ? r.site?.name ?? "Voting place" : "Needs voting place" });
    map.set(key, g);
  }
  const groups = [...map.values()];
  groups.forEach((g) => {
    const known = g.stops.filter((x) => x.id);
    g.destId = known.length === g.stops.length && known.length === 1 ? known[0].id : null;
    g.destName = g.stops.map((x) => x.name).join(", ");
  });
  return groups.sort((a, b) => `${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`));
}

function daysBetween(a: string, b: string) {
  const out: string[] = [];
  const d = new Date(`${a}T12:00:00Z`);
  const end = new Date(`${b}T12:00:00Z`);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export type ServiceDay = Tables<"ride_service_days">;
export type Unmet = { requested_date: string | null; reason: string; n: number };

// Only zTrip rides count against the budget.
export const ztrip = (rides: Ride[]) => rides.filter((r) => (r.provider ?? "ztrip") === "ztrip");

export function budgetStats(rides: Ride[], days: ServiceDay[], seatsPerWave: number) {
  const z = ztrip(rides);
  const scheduledCents = days.reduce((a, d) => a + d.cost_cents, 0);
  const seatsTotal = days.reduce((a, d) => a + (d.wave_times?.length ?? 0) * seatsPerWave, 0);
  const seatsBooked = z.filter((r) => ["requested", ...FUNDED].includes(r.status)).length;
  const completed = z.filter((r) => r.status === "completed").length;
  const trips = new Set(z.filter((r) => FUNDED.includes(r.status)).map((r) => `${r.ride_day}|${r.pickup_time}`)).size;
  return { scheduledCents, seatsTotal, seatsBooked, completed, trips };
}

export const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function weekCompare(rides: Ride[], a: string, b: string) {
  const z = ztrip(rides);
  const count = (day: string) => {
    const d = z.filter((r) => r.ride_day === day && r.status !== "referred");
    return `${d.length} requested, ${d.filter((r) => FUNDED.includes(r.status)).length} booked, ${d.filter((r) => r.status === "completed").length} completed`;
  };
  return [count(a), count(b)];
}

export function reportCsv(rides: Ride[], summary: [string, string | number][] = []) {
  const cols = ["ride_code", "source", "provider", "ride_day", "pickup_time", "destination", "round_trip", "needs", "status", "created_at", "booked_at", "completed_at", "wait_minutes", "ride_rating"];
  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = rides.map((r) =>
    [r.ride_code, r.source, r.provider, r.ride_day, r.pickup_time.slice(0, 5), r.site?.name ?? "", r.round_trip, r.needs.join(" "), r.status, r.created_at, r.booked_at, r.completed_at, waitMinutes(r), r.ride_rating].map(esc).join(","),
  );
  const sum = summary.map(([k, v]) => [k, v].map(esc).join(","));
  return [cols.join(","), ...rows, "", "metric,value", ...sum].join("\n");
}
