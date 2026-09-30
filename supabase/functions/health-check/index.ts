// Runs every 6 hours. Writes a heartbeat and emails super admins when a check fails.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authorizeSystemJob } from '../_shared/system-auth.ts';
import { sendAndLog } from '../_shared/transactional-email-templates/send-and-log.ts';

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const fmt = (iso: string | null) => iso
  ? new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' }) + ' Central'
  : 'Never';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const auth = await authorizeSystemJob(req, db);
  if (!auth.ok) return json({ error: 'Unauthorized' }, 401);
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  // Test only: a super admin or the private job key can force one check to fail.
  const forceFail = ['office_check', 'backup'].includes(body?.force_fail) ? body.force_fail : null;

  const { data: office } = await db.from('civic_data_sources').select('last_checked_at').eq('active', true)
    .order('last_checked_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  const { data: backup } = await db.from('backup_runs').select('finished_at').eq('status', 'ok')
    .order('finished_at', { ascending: false }).limit(1).maybeSingle();
  const lastOffice = office?.last_checked_at ?? null;
  const lastBackup = backup?.finished_at ?? null;
  const age = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 3600_000 : Infinity);

  const checks = [
    { key: 'office_check', name: 'Office checker', ok: age(lastOffice) <= 24 && forceFail !== 'office_check', last: lastOffice,
      message: 'The office checker has not run in the last 24 hours.' },
    { key: 'backup', name: 'Nightly backup', ok: age(lastBackup) <= 30 && forceFail !== 'backup', last: lastBackup,
      message: 'The nightly backup has not run in the last 30 hours.' },
  ];
  const failing = checks.filter((c) => !c.ok);
  const status = failing.length ? `Needs a look: ${failing.map((c) => c.name).join(', ')}` : 'All good';
  await db.from('system_health').insert({
    status,
    details: { checks: checks.map((c) => ({ key: c.key, ok: c.ok, last: c.last })), forced: forceFail, test: !!forceFail },
  });

  const emailed: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const c of failing) {
    // One alert per failing check per day. The insert only succeeds once.
    const { error: dup } = await db.from('health_alerts_sent').insert({ check_name: c.key, alert_date: today });
    if (dup) continue;
    const { data: admins } = await db.rpc('super_admin_emails');
    for (const a of admins ?? []) {
      if (!a?.email) continue;
      try {
        await sendAndLog('platform-health-alert', a.email, {
          templateData: { checkName: c.name, message: c.message + (forceFail ? ' This is a test alert.' : ''), lastSeen: fmt(c.last) },
          idempotencyKey: `health-${c.key}-${today}-${a.email}`,
        });
        emailed.push(`${c.key}:${a.email}`);
      } catch (e) { console.error('health alert email failed', (e as Error).message); }
    }
  }
  return json({ status, checks, emailed: emailed.length });
});
