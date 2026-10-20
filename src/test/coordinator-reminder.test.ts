import { describe, it, expect, vi } from 'vitest';
import { coordinatorReminder, centralRideDays, canSendCoordinatorReminder } from '../../supabase/functions/_shared/ride-reminder-policy';

const now = Date.parse('2026-10-20T14:45:00Z');
const ride = { ride_day: '2026-10-21', status: 'requested', hasEmail: true };
function dependencies() {
  return { isCoordinator: vi.fn(async () => true), loadRide: vi.fn(async () => ride), send: vi.fn(async () => ({ status: 'queued' })), wasSent: vi.fn(async () => false) };
}
describe('Coordinator reminder permissions and eligibility', () => {
  it('refuses signed-out before reading or sending', async () => {
    const d = dependencies(); expect(await coordinatorReminder(d, null, 'ride', now)).toEqual({ status: 'unauthorized', httpStatus: 401 });
    expect(d.loadRide).not.toHaveBeenCalled(); expect(d.send).not.toHaveBeenCalled();
  });
  it('refuses a non-coordinator before reading or sending', async () => {
    const d = dependencies(); d.isCoordinator.mockResolvedValue(false);
    expect(await coordinatorReminder(d, 'user', 'ride', now)).toEqual({ status: 'forbidden', httpStatus: 403 }); expect(d.send).not.toHaveBeenCalled();
  });
  it.each(['2026-10-20', '2026-10-21'])('sends exactly one eligible ride on %s', async day => {
    const d = dependencies(); d.loadRide.mockResolvedValue({ ...ride, ride_day: day });
    expect(await coordinatorReminder(d, 'coordinator', 'one-ride', now)).toEqual({ status: 'sent' }); expect(d.send).toHaveBeenCalledExactlyOnceWith('one-ride');
  });
  it('permits booked rides', () => { expect(canSendCoordinatorReminder({ ...ride, status: 'booked' }, now)).toBe(true); });
  it.each(['cancelled','no_show','completed','riding','referred'])('refuses %s without a claim', async status => {
    const d = dependencies(); d.loadRide.mockResolvedValue({ ...ride, status });
    expect((await coordinatorReminder(d, 'coordinator', 'ride', now)).status).toBe('ineligible'); expect(d.send).not.toHaveBeenCalled();
  });
  it.each(['2026-10-19','2026-10-22'])('refuses a ride on %s', async day => {
    const d = dependencies(); d.loadRide.mockResolvedValue({ ...ride, ride_day: day });
    expect((await coordinatorReminder(d, 'coordinator', 'ride', now)).status).toBe('ineligible'); expect(d.send).not.toHaveBeenCalled();
  });
  it('refuses missing email', async () => {
    const d = dependencies(); d.loadRide.mockResolvedValue({ ...ride, hasEmail: false });
    expect((await coordinatorReminder(d, 'coordinator', 'ride', now)).status).toBe('ineligible'); expect(d.send).not.toHaveBeenCalled();
  });
  it('only confirms a duplicate with existing successful send evidence', async () => {
    const d = dependencies(); d.send.mockResolvedValue({ status: 'duplicate' });
    expect((await coordinatorReminder(d, 'coordinator', 'ride', now)).status).toBe('already_attempted');
    d.wasSent.mockResolvedValue(true);
    expect((await coordinatorReminder(d, 'coordinator', 'ride', now)).status).toBe('sent');
  });
  it.each(['address_limit','suppressed','not_sent'])('does not label %s as sent', async status => {
    const d = dependencies(); d.send.mockResolvedValue({ status });
    expect((await coordinatorReminder(d, 'coordinator', 'ride', now)).status).toBe(status);
  });
  it('uses Central calendar days even at the DST transition', () => {
    expect(centralRideDays(Date.parse('2026-10-21T02:00:00Z'))).toEqual({ today: '2026-10-20', tomorrow: '2026-10-21' });
    expect(centralRideDays(Date.parse('2026-11-02T05:30:00Z'))).toEqual({ today: '2026-11-01', tomorrow: '2026-11-02' });
  });
});