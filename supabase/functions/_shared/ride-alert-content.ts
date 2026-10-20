export const ALERT_LIMIT = 30;
export const ALERT_TIMEOUT_MS = 5000;
export const DESK_URL = 'https://uwaziapp.uwazi.ai/rides/desk';
const labels: Record<string, string> = { wheelchair: 'Wheelchair', walker: 'Walker', service_animal: 'Service animal', child_seat: 'Child seat', extra_time: 'Extra time', language_help: 'Language help', other: 'Other need' };
export interface AlertRide {
  ride_code: string; ride_day: string; pickup_time: string; needs_destination: boolean;
  needs: string[]; round_trip: boolean; first_name_last_initial?: string; phone?: string;
}
export function dayLabel(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric' });
}
export function timeLabel(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
export function rideAlertData(ride: AlertRide, place: string | null, seats: number, capacity: number, includeContact: boolean) {
  const needsPlace = ride.needs_destination || !place;
  const votingPlace = needsPlace ? 'Needs voting place' : place;
  const prefix = `${needsPlace ? 'NEEDS VOTING PLACE: ' : ''}${ride.needs.includes('wheelchair') ? 'WHEELCHAIR: ' : ''}`;
  return {
    subject: `${prefix}UWAZI ride ${ride.ride_code}: ${dayLabel(ride.ride_day)}, ${timeLabel(ride.pickup_time)}, ${votingPlace}`,
    title: needsPlace ? 'Needs voting place' : 'New website ride request',
    rideCode: ride.ride_code, day: dayLabel(ride.ride_day), time: `${timeLabel(ride.pickup_time)} Central`,
    place: votingPlace, seats: `${seats} of ${capacity} seats`,
    accessNeeds: ride.needs.map(n => labels[n]).filter(Boolean).join(', ') || 'None listed',
    trip: ride.round_trip ? 'Round trip' : 'One way',
    ...(includeContact ? { contactName: ride.first_name_last_initial, contactPhone: ride.phone } : {}),
  };
}
export function waitlistAlertData(day: string, reason: 'no_driver' | 'full', phone?: string) {
  const reasonLabel = reason === 'no_driver' ? 'no driver' : 'full day';
  return { subject: `UWAZI waitlist: ${dayLabel(day)}, ${reasonLabel}`, title: 'New waitlist signup', day: dayLabel(day), reason: reasonLabel, ...(phone ? { contactPhone: phone } : {}) };
}
// Failures and timeouts resolve safely. No error contents are logged.
export async function boundedAlert(send: (signal: AbortSignal) => Promise<unknown>, failure: () => Promise<unknown>) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('notify_timeout')); }, ALERT_TIMEOUT_MS); });
    await Promise.race([send(controller.signal), timeout]);
    return true;
  } catch {
    try { await failure(); } catch { /* A notification must never fail intake. */ }
    return false;
  } finally { if (timer) clearTimeout(timer); }
}