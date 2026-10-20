import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { sendRideAlert } from '../_shared/ride-alerts.ts';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const parsed = z.discriminatedUnion('action', [z.object({ action: z.literal('test') }).strict(), z.object({ action: z.literal('ride'), id: z.string().uuid() }).strict()]).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid alert request.' }, 400);
  const url = Deno.env.get('SUPABASE_URL'); const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return json({ error: 'Email configuration is unavailable.' }, 503);
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!service) return json({ error: 'Email configuration is unavailable.' }, 503);
  const db = createClient(url, service);
  if (parsed.data.action === 'ride') {
    const supplied = req.headers.get('x-ride-alert-token');
    const { data: token } = supplied ? await db.from('system_job_token').select('token').eq('id', true).single() : { data: null };
    if (!supplied || supplied !== token?.token) return json({ error: 'Not allowed.' }, 403);
    try { return json(await sendRideAlert(db, 'ride', parsed.data.id)); } catch { return json({ status: 'not_sent' }); }
  }
  const authorization = req.headers.get('Authorization') || '';
  const uc = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: claims } = await uc.auth.getClaims(authorization.replace(/^Bearer /, ''));
  const uid = claims?.claims?.sub;
  if (!uid) return json({ error: 'Please sign in.' }, 401);
  const { data: admin } = await uc.rpc('is_admin', { _user_id: uid });
  if (!admin) return json({ error: 'Admins only.' }, 403);
  try {
    const result = await sendRideAlert(db, 'test', crypto.randomUUID(), uid);
    return json({ provider: 'Lovable Emails', from: 'uwaziapp <noreply@notify.uwaziapp.uwazi.ai>', ...result }, ['accepted', 'sent', 'queued'].includes(result.status) ? 200 : 502);
  } catch { return json({ error: 'The email was not sent.' }, 502); }
});