import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { redactError, type BookingAddress } from './autocab-builder.ts';
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
export class AutocabError extends Error { constructor(message: string, public status = 400, public ambiguous = false) { super(message); } }
export async function context(req: Request, adminOnly = false) {
  const url = Deno.env.get('SUPABASE_URL'), anon = Deno.env.get('SUPABASE_ANON_KEY'), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) throw new AutocabError('Connection unavailable.', 503);
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) throw new AutocabError('Please sign in.', 401);
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data } = await client.auth.getClaims(auth.slice(7));
  const uid = data?.claims?.sub;
  if (typeof uid !== 'string') throw new AutocabError('Please sign in.', 401);
  const { data: allowed, error } = await client.rpc(adminOnly ? 'is_admin' : 'is_ride_coordinator', { _user_id: uid });
  if (error || !allowed) throw new AutocabError(adminOnly ? 'This is for admins.' : 'This is for ride coordinators.', 403);
  const db = createClient(url, service);
  const { data: settings, error: se } = await db.from('ride_settings').select('*').eq('id', true).single();
  if (se || !settings) throw new AutocabError('Ride settings unavailable.', 503);
  const key = Deno.env.get('AUTOCAB_KEY');
  if (!key) throw new AutocabError('Add AUTOCAB_KEY in Project Settings → Secrets. Manual Text zTrip is still available.', 503);
  const base = new URL(settings.autocab_base_url);
  // Never forward a private key to an arbitrary admin-entered host or redirect.
  if (base.origin !== 'https://autocab-api.azure-api.net' || base.pathname.replace(/\/$/, '') !== '/booking/v1' || base.search || base.hash || base.username || base.password) throw new AutocabError('Use https://autocab-api.azure-api.net/booking/v1.');
  let calls = 0;
  async function api(path: string, method = 'GET', body?: unknown) {
    if (++calls > 16) throw new AutocabError('Call limit reached. Try later.', 429);
    let response: Response;
    try {
      response = await fetch(`${base.href.replace(/\/$/, '')}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(12000), headers: { 'Ocp-Apim-Subscription-Key': key ?? '', ...(method !== 'GET' ? { 'third-party-user': 'UWAZI Rides', 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch { throw new AutocabError('Autocab did not respond. Check with zTrip before retrying.', 502, method !== 'GET'); }
    const text = await response.text();
    if (!response.ok) {
      // Provider bodies can echo names, pickup addresses and tokens. Only extract its error description.
      let message = 'Request rejected';
      try { const b = JSON.parse(text); message = typeof b.message === 'string' ? b.message : typeof b.error === 'string' ? b.error : message; } catch { /* do not return arbitrary HTML */ }
      throw new AutocabError(`Autocab ${response.status}: ${redactError(message, key)}`, response.status >= 500 ? 502 : 400, method !== 'GET' && response.status >= 500);
    }
    try { return text ? JSON.parse(text) : {}; } catch { throw new AutocabError('Autocab returned an unreadable response.', 502, method !== 'GET'); }
  }
  return { db, settings, uid, api, key };
}
export function failure(e: unknown) { return json({ error: e instanceof Error ? redactError(e.message, Deno.env.get('AUTOCAB_KEY')) : 'Connection failed. Manual Text zTrip is still available.' }, e instanceof AutocabError ? e.status : 500); }
export async function resolveAutocabAddress(api: (path: string) => Promise<any>, text: string, stored?: { lat: number; lon: number } | null): Promise<BookingAddress> {
  for (const param of ['address', 'text']) {
    try {
      const result = await api(`/addressFromText?${param}=${encodeURIComponent(text)}`);
      const a = result.address ?? result.addresses?.[0] ?? result[0] ?? result;
      const c = a.coordinate;
      const zone = a.zone;
      if (Number.isFinite(c?.latitude) && Number.isFinite(c?.longitude) && (typeof zone === 'number' ? zone > 0 : Number.isFinite(zone?.id) && zone.id > 0)) {
        // Keep provider address fields only. Do not copy a whole response wrapper.
        const fields = ['text','street','house','town','postcode','building','fullAddress','place','addressId'];
        return { ...Object.fromEntries(fields.flatMap(k => typeof a[k] === 'string' || typeof a[k] === 'number' ? [[k,a[k]]] : [])), coordinate: { latitude: c.latitude, longitude: c.longitude }, zone };
      }
    } catch (e) { if (e instanceof AutocabError && e.status === 429) throw e; }
  }
  let point = stored;
  if (!point) {
    // Pickups do not currently store coordinates. Census is a read-only fallback.
    try {
      const u = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(text)}&benchmark=Public_AR_Current&format=json`;
      const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
      const b = await r.json();
      const c = b.result?.addressMatches?.[0]?.coordinates;
      if (r.ok && Number.isFinite(c?.x) && Number.isFinite(c?.y)) point = { lat: c.y, lon: c.x };
    } catch { /* never guess */ }
  }
  if (point) {
    const result = await api(`/zone?latitude=${point.lat}&longitude=${point.lon}`);
    const zone = result.zone ?? result;
    if (zone && (typeof zone === 'number' ? zone > 0 : Number.isFinite(zone.id) && zone.id > 0)) return { text, coordinate: { latitude: point.lat, longitude: point.lon }, zone };
  }
  throw new AutocabError('Outside zTrip area. Book by phone.');
}
