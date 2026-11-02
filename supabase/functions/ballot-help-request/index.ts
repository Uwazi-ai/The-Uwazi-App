// Public intake for "Ask UWAZI to find my ballot". Saves the request with
// consent, then sends one state-only alert. Never logs the address or email.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { underLimit } from '../_shared/public-rate.ts';
import { sendAndLog } from '../_shared/transactional-email-templates/send-and-log.ts';

const Body = z.object({
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  cityOrZip: z.string().trim().min(2).max(80),
  street: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email().max(254),
  consent: z.literal(true),
});
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const p = Body.safeParse(await req.json().catch(() => ({})));
    if (!p.success) return json({ error: 'Check the form. State, city or ZIP, email and consent are required.' }, 400);
    if (!(await underLimit(db, 'ballot-help', req, 3, 60 * 24))) return json({ error: 'You already sent a request. We will email you.', code: 'rate_limited' }, 429);
    const { state, cityOrZip, street, email } = p.data;
    const { data, error } = await db.from('ballot_help_requests').insert({
      state_code: state, city_or_zip: cityOrZip, street_address: street || null,
      reply_email: email.toLowerCase(), consent_at: new Date().toISOString(),
    }).select('id').single();
    if (error) { console.error('ballot help insert failed', error.code); return json({ error: 'Could not save. Try again.' }, 500); }
    let alerted = false;
    try {
      const r: any = await sendAndLog('ballot-help-alert', 'myke@uwazi.ai', { templateData: { state }, idempotencyKey: `ballot-help-${data.id}` } as any);
      alerted = !!r?.sent;
    } catch (_) { console.error('ballot help alert failed'); }
    return json({ ok: true, id: data.id, alerted });
  } catch (_) {
    console.error('ballot-help-request error');
    return json({ error: 'Could not save. Try again.' }, 500);
  }
});
