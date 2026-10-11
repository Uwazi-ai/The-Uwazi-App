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

export type Group = { key: string; day: string; time: string; destName: string; destId: string | null; rides: Ride[]; conflict: boolean };

export function tripGroups(rides: Ride[]): Group[] {
  const active = rides.filter((r) => r.status === "requested" || r.status === "booked");
  const map = new Map<string, Group>();
  for (const r of active) {
    const key = `${r.ride_day}|${r.pickup_time}|${r.destination_site_id ?? "none"}`;
    const g = map.get(key) ?? { key, day: r.ride_day, time: r.pickup_time, destName: r.site?.name ?? "Needs voting place", destId: r.destination_site_id, rides: [], conflict: false };
    g.rides.push(r);
    map.set(key, g);
  }
  const groups = [...map.values()];
  const perHour = new Map<string, number>();
  groups.forEach((g) => perHour.set(`${g.day}|${g.time}`, (perHour.get(`${g.day}|${g.time}`) ?? 0) + 1));
  groups.forEach((g) => (g.conflict = (perHour.get(`${g.day}|${g.time}`) ?? 0) > 1));
  return groups.sort((a, b) => `${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`) || a.destName.localeCompare(b.destName));
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

// A driver day is any ride day with an active driver block, and for early voting at least one open site.
export function driverDays(s: Settings, blocks: Block[], siteDays: Set<string>) {
  return daysBetween(s.early_start, s.election_day).filter((day) => {
    const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (!blocks.some((b) => b.active && b.day_of_week === dow)) return false;
    return day === s.election_day || siteDays.has(day);
  });
}

export function driverCost(days: string[], rate: number) {
  const hours = days.reduce((a, d) => a + (new Date(`${d}T12:00:00Z`).getUTCDay() === 6 ? 4 : 7), 0);
  return { hours, cost: hours * rate };
}

export function reportCsv(rides: Ride[]) {
  const cols = ["ride_code", "source", "ride_day", "pickup_time", "destination", "round_trip", "needs", "status", "created_at", "booked_at", "completed_at", "wait_minutes"];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = rides.map((r) =>
    [r.ride_code, r.source, r.ride_day, r.pickup_time.slice(0, 5), r.site?.name ?? "", r.round_trip, r.needs.join(" "), r.status, r.created_at, r.booked_at, r.completed_at, waitMinutes(r)].map(esc).join(","),
  );
  return [cols.join(","), ...rows].join("\n");
}
