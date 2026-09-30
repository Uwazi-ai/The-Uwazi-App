// Nightly export of civic data and user progress to the private backups bucket.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authorizeSystemJob } from '../_shared/system-auth.ts';

const TABLES = [
  'civic_offices', 'civic_data_sources', 'civic_data_pending_changes', 'district_boundaries', 'city_onboarding',
  'official_domains', 'civic_budgets', 'civic_budget_calendar', 'compass_dimensions', 'compass_questions',
  'compass_sessions', 'compass_responses', 'compass_results', 'compass_budget_priorities', 'compass_facts',
  'compass_office_matches', 'user_civic_persona', 'civic_confidence', 'user_points_ledger', 'civic_journey_stages',
  'user_journey_next_step', 'challenges', 'challenge_progress', 'badges', 'user_badges', 'identity_feedback',
];
const KEEP_DAYS = 30;
const PAGE = 1000;

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function chicagoParts(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
}

async function readAll(db: any, table: string) {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select('*').range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const auth = await authorizeSystemJob(req, db);
  if (!auth.ok) return json({ error: 'Unauthorized' }, 401);

  // The schedule fires at 8 and 9 UTC. Only the run that lands on 3am Central does work.
  const now = chicagoParts();
  if (!auth.manual && now.hour !== 3) return json({ skipped: true, reason: 'Not 3am Central' });

  const folder = now.date;
  const { data: run } = await db.from('backup_runs').insert({ folder }).select('id').single();
  const counts: Record<string, number> = {};
  try {
    for (const t of TABLES) {
      let rows: any[];
      try { rows = await readAll(db, t); } catch (e) {
        if (t === 'identity_feedback' && /does not exist|schema cache/i.test((e as Error).message)) continue;
        throw e;
      }
      const body = JSON.stringify({ table: t, exported_at: new Date().toISOString(), row_count: rows.length, rows });
      const { error } = await db.storage.from('backups').upload(`${folder}/${t}.json`, new Blob([body], { type: 'application/json' }), { upsert: true, contentType: 'application/json' });
      if (error) throw new Error(`upload ${t}: ${error.message}`);
      counts[t] = rows.length;
    }

    // Keep 30 days. Folder names are dates, so older names sort first.
    const cutoff = new Date(Date.now() - KEEP_DAYS * 86400_000).toISOString().slice(0, 10);
    const { data: top } = await db.storage.from('backups').list('', { limit: 1000 });
    const removed: string[] = [];
    for (const f of top ?? []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.name) || f.name >= cutoff) continue;
      const { data: files } = await db.storage.from('backups').list(f.name, { limit: 1000 });
      const paths = (files ?? []).map((x: any) => `${f.name}/${x.name}`);
      if (paths.length) await db.storage.from('backups').remove(paths);
      removed.push(f.name);
    }

    await db.from('backup_runs').update({ status: 'ok', finished_at: new Date().toISOString(), table_counts: counts }).eq('id', run.id);
    return json({ ok: true, folder, counts, removed });
  } catch (e) {
    const msg = (e as Error).message;
    await db.from('backup_runs').update({ status: 'failed', finished_at: new Date().toISOString(), table_counts: counts, error: msg.slice(0, 1000) }).eq('id', run.id);
    return json({ ok: false, error: msg }, 500);
  }
});
