import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { boundedAlert } from '../_shared/ride-alert-content.ts';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const parsed = z.object({ action: z.literal('test') }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid alert request.' }, 400);
  const url = Deno.env.get('SUPABASE_URL'); const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return json({ error: 'Email configuration is unavailable.' }, 503);
  const authorization = req.headers.get('Authorization') || '';
  const uc = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: claims } = await uc.auth.getClaims(authorization.replace(/^Bearer /, ''));
  const uid = claims?.claims?.sub;
  if (!uid) return json({ error: 'Please sign in.' }, 401);
  const { data: admin } = await uc.rpc('is_admin', { _user_id: uid });
  if (!admin) return json({ error: 'Admins only.' }, 403);
  let accepted = false;
  await boundedAlert(async () => {
    const result = await sendTemplateEmail('ride-coordinator-alert', 'myke@uwazi.ai', { idempotencyKey: `ride-alert-test-${crypto.randomUUID()}`, templateData: { title: 'Coordinator email test' } });
    accepted = result.sent;
  }, async () => {});
  return json({ provider: 'Lovable Emails', from: 'uwaziapp <noreply@notify.uwaziapp.uwazi.ai>', status: accepted ? 'accepted' : 'not_sent' }, accepted ? 200 : 502);
});