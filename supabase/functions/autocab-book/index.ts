import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { context, json, failure, AutocabError, resolveAutocabAddress } from '../_shared/autocab.ts';
import { buildBooking, validateGroup, type DispatchRider } from '../_shared/autocab-builder.ts';
const Input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('test') }).strict(),
  z.object({ action: z.literal('quote'), ride_ids: z.array(z.string().uuid()).min(1).max(3) }).strict(),
  z.object({ action: z.literal('book'), ride_ids: z.array(z.string().uuid()).min(1).max(3), quote_id: z.string().uuid(), confirm: z.literal(true) }).strict(),
  z.object({ action: z.literal('cancel'), booking_id: z.string().min(1).max(100), confirm: z.literal(true) }).strict(),
]);
const fingerprint = async (value: unknown) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))))).map(b => b.toString(16).padStart(2, '0')).join('');
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let sensitive: string[] = [];
  try {
    const parsed = Input.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: 'Invalid dispatch request.' }, 400);
    const b = parsed.data;
    const { db, api, settings, uid } = await context(req, b.action === 'test');
    if (b.action === 'test') {
      // No write endpoints, quotes, address uploads or bookings in this action.
      const capabilities = await api('/capabilities');
      const customerAccounts = await api('/customerAccounts');
      const drivers = await api('/drivers');
      const lists = (v: any) => Array.isArray(v) ? v : v.items ?? v.data ?? v.capabilities ?? v.customerAccounts ?? v.drivers ?? [];
      const safe = (v: any) => lists(v).map((x: any) => ({ id: x.id ?? x.customerId ?? x.driverId ?? x.capabilityId, name: x.name ?? x.description ?? x.callsign ?? String(x.id) }));
      return json({ capabilities: safe(capabilities), customerAccounts: safe(customerAccounts), drivers: safe(drivers) });
    }
    if (b.action === 'cancel') {
      const { data: op } = await db.from('autocab_operations').select('*').eq('booking_id', b.booking_id).eq('state', 'booked').single();
      if (!op) throw new AutocabError('No active booking found.');
      const { data: claimed, error } = await db.from('autocab_operations').update({ state: 'cancelling' }).eq('id', op.id).eq('state', 'booked').select('id').maybeSingle();
      if (error || !claimed) throw new AutocabError('Cancellation already in progress.', 409);
      try { await api(`/booking/${encodeURIComponent(b.booking_id)}`, 'DELETE'); }
      catch (e) { if (!(e instanceof AutocabError && e.ambiguous)) await db.from('autocab_operations').update({ state: 'booked' }).eq('id', op.id); throw e; }
      const done = await db.rpc('autocab_finish_cancel', { _id: op.id, _actor: uid });
      if (done.error) throw new AutocabError('Autocab cancelled. Local record needs admin review. Do not rebook yet.', 502);
      return json({ cancelled: true });
    }
    const { data, error } = await db.from('ride_requests').select('id,ride_code,first_name_last_initial,phone,pickup_address,zip,ride_day,pickup_time,needs,destination_site_id,needs_destination,status,provider,autocab_booking_id,autocab_operation_id').in('id', b.ride_ids);
    if (error || !data || data.length !== b.ride_ids.length) throw new AutocabError('Ride not found.');
    const riders: DispatchRider[] = b.ride_ids.map(id => data.find((r: DispatchRider) => r.id === id));
    validateGroup(riders);
    sensitive = riders.flatMap(r => [r.phone, r.pickup_address, r.first_name_last_initial]);
    if (riders.some(r => r.autocab_booking_id || r.autocab_operation_id)) throw new AutocabError('This trip was already sent or is awaiting zTrip review. Do not resend.', 409);
    const lead = riders[0];
    if (!lead) throw new AutocabError('No riders.');
    const { data: site } = await db.from('voter_guide_sites').select('id,name,address').eq('id', lead.destination_site_id).eq('verification_status', 'verified').single();
    if (!site) throw new AutocabError('Assign a verified voting place first.');
    const mode = settings.autocab_live ? 'LIVE' : 'TEST';
    // Bind confirmation to both current ride details and current dispatch settings.
    const fp = await fingerprint({ riders, site, settings: { base: settings.autocab_base_url, customer: settings.autocab_customer_id, company: settings.autocab_company_id, driver: settings.autocab_driver_id, map: settings.autocab_capability_map, mode } });
    let booking: any;
    if (b.action === 'quote') {
      const pickups = [];
      for (const r of riders) pickups.push(await resolveAutocabAddress(api, `${r.pickup_address}, Kansas City, MO ${r.zip}`));
      const { data: geo } = await db.from('ride_site_geo').select('lat,lon').eq('site_id', site.id).maybeSingle();
      const destination = await resolveAutocabAddress(api, /\bMO\b|Missouri/i.test(site.address) ? site.address : `${site.address}, Kansas City, MO`, geo);
      booking = buildBooking(riders, pickups, destination, settings);
      const quote = await api('/quote', 'POST', booking);
      const price = quote.price ?? quote.totalPrice ?? quote.amount ?? quote.estimatedPrice;
      if (price == null || (typeof price !== 'number' && typeof price !== 'string')) throw new AutocabError('Autocab returned no quoted price. Book by phone.');
      // Store resolved request only in a private operation, not a log or public response.
      await db.from('autocab_operations').delete().eq('state','quoted').lt('expires_at',new Date().toISOString());
      const { data: op, error: oe } = await db.from('autocab_operations').insert({ actor: uid, ride_ids: b.ride_ids, fingerprint: fp, mode, quote: { request: booking, price } }).select('id,expires_at').single();
      if (oe || !op) throw new AutocabError('Quote could not be saved.', 500);
      return json({ quote_id: op.id, expires_at: op.expires_at, price, mode });
    }
    const { data: op } = await db.from('autocab_operations').select('quote').eq('id', b.quote_id).single();
    if (!op?.quote?.request) throw new AutocabError('Get a fresh quote first.');
    booking = op.quote.request;
    // Fail closed if hold differs, even if a settings toggle happened after quoting.
    if (booking.hold !== !settings.autocab_live) throw new AutocabError('Dispatch mode changed. Get a new quote.');
    const claim = await db.rpc('autocab_claim_operation', { _id: b.quote_id, _actor: uid, _fingerprint: fp, _mode: mode });
    if (claim.error || claim.data !== true) throw new AutocabError('Quote expired, trip changed, or already sent. Get a new quote.', 409);
    let result;
    try { result = await api('/booking', 'POST', booking); }
    catch (e) {
      if (e instanceof AutocabError && !e.ambiguous) {
        await db.from('ride_requests').update({ autocab_operation_id: null }).eq('autocab_operation_id', b.quote_id);
        await db.from('autocab_operations').update({ state: 'rejected' }).eq('id', b.quote_id);
        await db.from('autocab_operations').update({ quote: null }).eq('id', b.quote_id);
      }
      throw e;
    }
    const id = result.bookingId ?? result.id ?? result.booking?.id;
    if (typeof id !== 'string' && typeof id !== 'number') throw new AutocabError('Autocab accepted the request but returned no booking id. Ask zTrip before retrying.', 502);
    const done = await db.rpc('autocab_finish_operation', { _id: b.quote_id, _booking_id: String(id) });
    if (done.error) throw new AutocabError(`Autocab booking ${id} needs admin review. Do not resend.`, 502);
    await db.from('autocab_operations').update({quote:null}).eq('id',b.quote_id);
    return json({ booking_id: String(id), mode, hold: booking.hold });
  } catch (e) {
    if (e instanceof Error) for (const value of sensitive) if (value) e.message = e.message.split(value).join('[rider data removed]');
    return failure(e);
  }
});
