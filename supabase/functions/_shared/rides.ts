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

export function tooSoon(day: string, hour: number) {
  const pickup = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00`);
  return pickup.getTime() - centralNow().getTime() < 24 * 36e5;
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
