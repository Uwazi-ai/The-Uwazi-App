import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { json } from '../_shared/ride-token.ts';
import { sendRiderEmail } from '../_shared/rider-emails.ts';
import { coordinatorReminder } from '../_shared/ride-reminder-policy.ts';

const Body = z.object({ ride_id: z.string().uuid() }).strict();
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ status: 'method_not_allowed' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ status: 'unauthorized' }, 401);
    const url = Deno.env.get('SUPABASE_URL'), anon = Deno.env.get('SUPABASE_ANON_KEY'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !key) return json({ status: 'not_sent' }, 503);
    const uc = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: claims, error } = await uc.auth.getClaims(authorization.slice(7));
    if (error || !claims?.claims?.sub) return json({ status: 'unauthorized' }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ status: 'invalid_ride' }, 400);
    const db = createClient(url, key);
    const result = await coordinatorReminder({
      isCoordinator: async uid => {
        const { data, error } = await uc.rpc('is_ride_coordinator', { _user_id: uid });
        return !error && data === true;
      },
      loadRide: async id => {
        const { data, error } = await db.from('ride_requests').select('ride_day,status,email').eq('id', id).maybeSingle();
        return error || !data ? null : { ride_day: data.ride_day, status: data.status, hasEmail: Boolean(data.email) };
      },
      send: id => sendRiderEmail(db, id, 'reminder'),
      wasSent: async id => {
        const { data, error } = await db.from('ride_events').select('id').eq('request_id', id).eq('event_type', 'rider_email_sent').eq('note', 'reminder').limit(1);
        return !error && Boolean(data?.length);
      },
    }, claims.claims.sub, parsed.data.ride_id, Date.now());
    return json({ status: result.status }, result.httpStatus ?? 200);
  } catch {
    return json({ status: 'not_sent' }, 503);
  }
});