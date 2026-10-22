// Shared ride scheduling rules for Rides to the Polls functions.
// deno-lint-ignore-file no-explicit-any

export function centralNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
}

export function dayOfWeek(day: string) {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

export function isKansasZip(zip?: string | null) {
  return !!zip && /^6[67]\d{3}$/.test(zip);
}

// Pickup hours leave room for the ride home.
export function pickupHours(day: string, settings: any, zip?: string | null): number[] {
  const dow = dayOfWeek(day);
  let hours: number[] = [];
  if (dow >= 1 && dow <= 5) hours = [11, 12, 13, 14, 15, 16];
  else if (dow === 6) hours = [8, 9, 10];
  // Kansas advance voting ends at noon the day before Election Day.
  if (isKansasZip(zip) && day === settings.early_end) hours = hours.filter((h) => h < 12);
  return hours;
}

export function inBlocks(day: string, hour: number, blocks: any[]) {
  const dow = dayOfWeek(day);
  const t = `${String(hour).padStart(2, "0")}:00:00`;
  return blocks.some((b) => b.day_of_week === dow && b.active !== false && t >= b.start_time && t < b.end_time);
}

// Minimum notice for online rider bookings. Phone rides have no minimum.
export const BOOKING_NOTICE_MS = 2 * 36e5;
export const BOOKING_NOTICE_MSG = "Rides must be booked at least 2 hours ahead.";

export function tooSoon(day: string, hour: number) {
  const pickup = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00`);
  return pickup.getTime() - centralNow().getTime() < BOOKING_NOTICE_MS;
}

export function allDays(settings: any): string[] {
  const out: string[] = [];
  const d = new Date(`${settings.early_start}T12:00:00Z`);
  const end = new Date(`${settings.election_day}T12:00:00Z`);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export const ACTIVE_STATUSES = ["requested", "booked", "riding", "completed"];

// Locked schedule: only ride_service_days are bookable, at their wave times.
export type ServiceDay = { date: string; waves: string[]; note: string | null; cost_cents: number };

export async function loadServiceDays(db: any): Promise<Map<string, ServiceDay>> {
  const { data } = await db.from("ride_service_days").select("*");
  return new Map((data ?? []).map((d: any) => [d.service_date, {
    date: d.service_date,
    waves: (d.wave_times ?? []).map((t: string) => String(t).slice(0, 5)),
    note: d.note ?? null,
    cost_cents: d.cost_cents ?? 0,
  }]));
}

export const toMin = (t: string) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };

// Site open at the wave and at least 1 hour after.
export function siteFitsWave(site: { open: string; close: string }, wave: string) {
  return toMin(site.open) <= toMin(wave) && toMin(site.close) >= toMin(wave) + 60;
}

export function waveTooSoon(day: string, wave: string) {
  return new Date(`${day}T${wave}:00`).getTime() - centralNow().getTime() < 24 * 36e5;
}

export type WaveLoad = { count: number; site_id: string | null };

// Riders per wave, and the site set by the first booking in that wave.
export async function waveLoads(db: any, day?: string): Promise<Map<string, WaveLoad>> {
  let q = db.from("ride_requests").select("ride_day,pickup_time,destination_site_id,created_at").in("status", ACTIVE_STATUSES).order("created_at");
  if (day) q = q.eq("ride_day", day);
  const { data } = await q;
  const out = new Map<string, WaveLoad>();
  for (const r of data ?? []) {
    const k = `${r.ride_day} ${String(r.pickup_time).slice(0, 5)}`;
    const w = out.get(k) ?? { count: 0, site_id: null };
    w.count++;
    if (!w.site_id && r.destination_site_id) w.site_id = r.destination_site_id;
    out.set(k, w);
  }
  return out;
}

export const WAVE_FULL_MSG = "That time is full. Pick another time.";
export const WAVE_SITE_MSG = "That time is going to another voting place. Pick another time.";
