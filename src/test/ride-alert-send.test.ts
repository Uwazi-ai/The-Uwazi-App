import { describe, it, expect, vi } from 'vitest';
const sender = vi.hoisted(() => vi.fn());
vi.mock('../../supabase/functions/_shared/transactional-email-templates/send-email.ts', () => ({ sendTemplateEmail: sender }));
// Load the Deno boundary without adding its npm: modules to the browser TS graph.
const boundary = '../../supabase/functions/_shared/ride-alerts.ts';
const { sendRideAlert } = await import(/* @vite-ignore */ boundary);

function database(source = 'web', claim: string | null = 'claim-id') {
  const events: unknown[] = [];
  const saved = { id: 'saved-ride-id', source, ride_code: 'UZ-1003', ride_day: '2026-10-22', pickup_time: '11:00', needs_destination: false, needs: [], round_trip: true, first_name_last_initial: 'Fake Q.', phone: '8165550101', destination_site_id: 'place-id' };
  const db = {
    rpc: vi.fn(async () => ({ data: claim })),
    from: (table: string) => {
      const value = table === 'ride_settings' ? { notify_emails: ['myke@uwazi.ai'], notify_new_requests: true, notify_waitlist: true, notify_include_contact: false, seats_per_slot: 3 } : table === 'ride_requests' ? saved : table === 'voter_guide_sites' ? { name: 'Garrison Community Center' } : null;
      const response = { data: value, count: table === 'ride_requests' ? 2 : 1 };
      const query: any = { select: () => query, eq: () => query, in: () => query, single: async () => response, then: (resolve: (v: unknown) => unknown) => Promise.resolve(response).then(resolve), insert: async (event: unknown) => { events.push(event); return { error: null }; } };
      return query;
    },
  };
  return { db, events, saved };
}
describe('Ride alert delivery boundary', () => {
  it('a simulated provider failure leaves the saved ride and records only notify_failed', async () => { sender.mockRejectedValueOnce(new Error('provider failed')); const x = database(); const result = await sendRideAlert(x.db as any, 'ride', x.saved.id); expect(result.status).toBe('not_sent'); expect(x.saved.id).toBe('saved-ride-id'); expect(x.events).toEqual([{ request_id: 'saved-ride-id', event_type: 'note', note: 'notify_failed' }]); });
  it('phone rides never claim or email', async () => { sender.mockClear(); const x = database('phone'); expect((await sendRideAlert(x.db as any, 'ride', x.saved.id)).status).toBe('skipped'); expect(x.db.rpc).not.toHaveBeenCalled(); expect(sender).not.toHaveBeenCalled(); });
  it('a repeated claim never sends twice', async () => { sender.mockClear(); const x = database('web', null); expect((await sendRideAlert(x.db as any, 'ride', x.saved.id)).status).toBe('duplicate'); expect(sender).not.toHaveBeenCalled(); });
  it('the sender receives no rider contact and uses a stable event key', async () => { sender.mockResolvedValueOnce({ sent: true, status: 'queued' }); const x = database(); await sendRideAlert(x.db as any, 'ride', x.saved.id); const args = sender.mock.calls.at(-1); expect(args?.[2].idempotencyKey).toBe('ride-alert-ride-saved-ride-id'); expect(args?.[2].templateData).not.toHaveProperty('contactName'); expect(args?.[2].templateData).not.toHaveProperty('contactPhone'); expect(args?.[2].templateData.seats).toBe('2 of 3 seats'); });
});