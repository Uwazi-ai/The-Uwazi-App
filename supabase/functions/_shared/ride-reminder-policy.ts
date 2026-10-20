export function centralRideDays(now: number) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const next = new Date(`${today}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { today, tomorrow: next.toISOString().slice(0, 10) };
}

export function canSendCoordinatorReminder(ride: { ride_day: string; status: string; hasEmail: boolean }, now: number) {
  const { today, tomorrow } = centralRideDays(now);
  return ride.hasEmail && ['requested', 'booked'].includes(ride.status) && [today, tomorrow].includes(ride.ride_day);
}

type Result = { status: string; httpStatus?: number };
export interface CoordinatorReminderDependencies {
  isCoordinator: (userId: string) => Promise<boolean>;
  loadRide: (id: string) => Promise<{ ride_day: string; status: string; hasEmail: boolean } | null>;
  send: (id: string) => Promise<{ status: string }>;
  wasSent: (id: string) => Promise<boolean>;
}

// Authorization and eligibility run before any delivery claim or provider call.
export async function coordinatorReminder(deps: CoordinatorReminderDependencies, userId: string | null, id: string, now: number): Promise<Result> {
  if (!userId) return { status: 'unauthorized', httpStatus: 401 };
  if (!await deps.isCoordinator(userId)) return { status: 'forbidden', httpStatus: 403 };
  const ride = await deps.loadRide(id);
  if (!ride) return { status: 'not_found', httpStatus: 404 };
  if (!canSendCoordinatorReminder(ride, now)) return { status: 'ineligible', httpStatus: 409 };
  const result = await deps.send(id);
  if (['queued', 'accepted', 'sent'].includes(result.status)) return { status: 'sent' };
  if (result.status === 'duplicate') return { status: await deps.wasSent(id) ? 'sent' : 'already_attempted' };
  return { status: ['address_limit', 'suppressed'].includes(result.status) ? result.status : 'not_sent' };
}