import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { sendTemplateEmail } from './transactional-email-templates/send-email.ts';
import { boundedAlert, rideAlertData, waitlistAlertData } from './ride-alert-content.ts';

export async function sendRideAlert(db: SupabaseClient, kind: 'ride' | 'waitlist' | 'test', id: string, actor?: string) {
  const { data: settings, error } = await db.from('ride_settings').select('notify_emails,notify_new_requests,notify_waitlist,notify_include_contact,seats_per_slot').eq('id', true).single();
  if (error || !settings || settings.notify_emails?.length !== 1) return { status: 'disabled' };
  if ((kind === 'ride' && !settings.notify_new_requests) || (kind === 'waitlist' && !settings.notify_waitlist)) return { status: 'disabled' };
  let templateData: Record<string, unknown> = { title: 'Coordinator email test' };
  if (kind === 'ride') {
    const { data: r } = await db.from('ride_requests').select('ride_code,ride_day,pickup_time,needs_destination,needs,round_trip,first_name_last_initial,phone,source,destination_site_id').eq('id', id).single();
    if (!r || r.source !== 'web') return { status: 'skipped' };
    const [{ data: site }, { count }] = await Promise.all([
      r.destination_site_id ? db.from('voter_guide_sites').select('name').eq('id', r.destination_site_id).single() : Promise.resolve({ data: null }),
      db.from('ride_requests').select('id', { count: 'exact', head: true }).eq('ride_day', r.ride_day).eq('pickup_time', r.pickup_time).eq('provider', 'ztrip').in('status', ['requested', 'booked', 'riding', 'completed']),
    ]);
    templateData = rideAlertData(r, site?.name ?? null, count ?? 0, settings.seats_per_slot, settings.notify_include_contact);
  } else if (kind === 'waitlist') {
    const { data: w } = await db.from('poll_ride_waitlist').select('requested_date,reason,phone').eq('id', id).single();
    if (!w?.requested_date || !['no_driver', 'full'].includes(w.reason)) return { status: 'skipped' };
    templateData = waitlistAlertData(w.requested_date, w.reason, settings.notify_include_contact ? w.phone : undefined);
  }
  const fail = async () => {
    if (kind === 'ride') await db.from('ride_events').insert({ request_id: id, event_type: 'note', note: 'notify_failed' });
    else if (actor) await db.from('ride_admin_log').insert({ actor, action: 'notify_failed', target_id: id, note: 'notify_failed' });
  };
  const { data: claim, error: claimError } = await db.rpc('claim_ride_email_alert', { _kind: kind, _id: id, _actor: actor ?? null });
  if (claimError) { await fail(); return { status: 'not_sent' }; }
  if (!claim) return { status: 'duplicate_or_limited' };
  let result: { status: string; messageId?: string } = { status: 'not_sent' };
  await boundedAlert(async () => {
    const sent = await sendTemplateEmail('ride-coordinator-alert', settings.notify_emails[0], { templateData, idempotencyKey: `ride-alert-${kind}-${id}` });
    result = sent.sent ? { status: sent.status || 'accepted', messageId: sent.messageId } : { status: 'suppressed' };
    if (sent.sent && kind === 'ride') await db.from('ride_events').insert({ request_id: id, event_type: 'note', note: 'notify_sent' });
  }, fail);
  return result;
}

export function startRideAlert(db: SupabaseClient, kind: 'ride' | 'waitlist', id: string) {
  // Construct inside the promise so even synchronous failures cannot affect intake.
  const task = Promise.resolve().then(() => sendRideAlert(db, kind, id)).catch(() => {});
  const runtime = (globalThis as unknown as { EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void } }).EdgeRuntime;
  try { runtime?.waitUntil(task); } catch { /* Booking already saved. */ }
}