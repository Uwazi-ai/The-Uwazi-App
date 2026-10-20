import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { context, json, failure } from '../_shared/autocab.ts';
import { chicagoUtc, redactError, safeTrackingLink } from '../_shared/autocab-builder.ts';
import { z } from 'npm:zod@3.23.8';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    if (!z.object({}).strict().safeParse(await req.json().catch(() => null)).success) return json({ error: 'Invalid poll request.' }, 400);
    const { db, uid, api, key } = await context(req);
    const { data: rides, error } = await db.from('ride_requests').select('id,ride_day,pickup_time,autocab_booking_id,autocab_status').not('autocab_booking_id', 'is', null);
    if (error) throw new Error('Could not read bookings.');
    const now = Date.now();
    const groups = new Map<string, any[]>();
    for (const r of rides ?? []) if (Math.abs(Date.parse(chicagoUtc(r.ride_day, r.pickup_time)) - now) <= 3 * 3600000) groups.set(r.autocab_booking_id, [...(groups.get(r.autocab_booking_id) ?? []), r]);
    const output: Record<string, unknown> = {};
    // Four bookings / invocation, 12 provider reads maximum. Rotate due entries to avoid starvation.
    const entries = [];
    for (const [id, rows] of groups) {
      await db.from('autocab_poll_cache').upsert({ booking_id: id }, { onConflict: 'booking_id', ignoreDuplicates: true });
      const { data: cache } = await db.from('autocab_poll_cache').select('*').eq('booking_id', id).single();
      if (cache) { output[id] = cache.data; entries.push({ id, rows, cache }); }
    }
    const due = entries.filter(x => Date.parse(x.cache.next_poll_at) <= now).sort((a,b) => a.cache.next_poll_at.localeCompare(b.cache.next_poll_at)).slice(0,4);
    for (const { id, rows, cache } of due) {
      const { data: claim } = await db.from('autocab_poll_cache').update({ next_poll_at: new Date(now + 60000).toISOString() }).eq('booking_id', id).eq('next_poll_at', cache.next_poll_at).select('booking_id').maybeSingle();
      if (!claim) continue;
      try {
        const booking = await api(`/booking/${encodeURIComponent(id)}`);
        let location: any = null, tracking: any = null;
        const secondaryErrors: string[] = [];
        try { location = await api(`/vehicleLocation?bookingId=${encodeURIComponent(id)}`); } catch (e) { secondaryErrors.push(e instanceof Error ? e.message : 'Vehicle location unavailable.'); }
        try { tracking = await api(`/trackingLink/${encodeURIComponent(id)}`); } catch (e) { secondaryErrors.push(e instanceof Error ? e.message : 'Tracking unavailable.'); }
        // Allowlist display fields only. Never return the full booking with passenger data.
        const raw = booking.status ?? booking.bookingStatus;
        const status = typeof raw === 'string' ? redactError(raw, key) : typeof raw?.name === 'string' ? redactError(raw.name, key) : 'Status unavailable';
        const str = (v: unknown) => typeof v === 'string' || typeof v === 'number' ? redactError(String(v), key) : null;
        const coord = location?.coordinate ?? location?.location ?? location;
        const data = { status, estimatedPickup: str(booking.estimatedPickupTimeUtc ?? booking.estimatedPickupTime ?? booking.eta), driver: str(booking.driver?.name ?? booking.driverName), vehicle: str(booking.vehicle?.registration ?? booking.vehicle?.callsign ?? booking.vehicleName), position: Number.isFinite(coord?.latitude) && Number.isFinite(coord?.longitude) ? { lat: coord.latitude, lon: coord.longitude } : null, trackingLink: safeTrackingLink(tracking?.trackingLink ?? tracking?.url ?? tracking), error: secondaryErrors.length ? secondaryErrors.join(' ') : null, updatedAt: new Date().toISOString() };
        await db.from('autocab_poll_cache').update({ data, failures: 0, updated_at: data.updatedAt, next_poll_at: new Date(Date.now()+55000).toISOString() }).eq('booking_id',id);
        for (const r of rows) if (r.autocab_status !== status) {
          await db.from('ride_requests').update({ autocab_status: status }).eq('id',r.id).eq('autocab_booking_id',id);
          await db.from('ride_events').insert({ request_id: r.id, event_type: 'autocab_status', note: status, actor: uid });
        }
        output[id] = data;
      } catch (e) {
        const failures = cache.failures + 1;
        const data = { ...cache.data, error: e instanceof Error ? redactError(e.message,key) : 'Status unavailable.' };
        await db.from('autocab_poll_cache').update({ failures, data, next_poll_at: new Date(Date.now()+Math.min(900000,30000 * 2 ** failures)).toISOString() }).eq('booking_id',id);
        output[id] = data;
      }
    }
    return json({ bookings: output });
  } catch (e) { return failure(e); }
});
