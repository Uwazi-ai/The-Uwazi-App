// Ballot crawler: reads official election authority ballots, stages them, and saves findings.
// It never writes ballot_contests or ballot_candidates. Changes reach live rows only via
// review_ballot_finding / apply_official_source_fixes after an admin approves.
// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { diffBallot, isOfficialUrl, hostOf, type LiveContest, type StagedContest } from '../_shared/ballot-crawl-diff.ts';
import { authorizeSystemJob } from '../_shared/system-auth.ts';
import { sendAndLog } from '../_shared/transactional-email-templates/send-and-log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const FC = 'https://connector-gateway.lovable.dev/firecrawl/v2';
const REVIEW_LINK = 'https://uwaziapp.uwazi.ai/app/admin/ballot-crawler';
const LAST_SCHEDULED_DAY = '2026-11-04';

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const DISCOVERY = [
  { authority: 'Jackson County Election Board', jurisdiction: 'Jackson County', domains: ['jcebmo.org', 'jacksongov.org'],
    queries: ['site:jcebmo.org sample ballot November 3 2026', 'Jackson County Election Board Missouri sample ballot November 2026'] },
  { authority: 'Clay County Board of Election Commissioners', jurisdiction: 'Clay County', domains: ['voteclaycountymo.gov', 'claycountymo.gov'],
    queries: ['site:voteclaycountymo.gov sample ballots', 'Clay County Missouri election board sample ballot November 3 2026'] },
  { authority: 'Platte County Board of Elections', jurisdiction: 'Platte County', domains: ['plattecountymovotes.gov', 'co.platte.mo.us'],
    queries: ['site:plattecountymovotes.gov ballot November 3', 'Platte County Missouri board of elections sample ballot November 3 2026'] },
];
const JURISDICTION: Record<string, string | null> = {
  'Kansas City Election Board': null, 'Cass County Clerk': 'Cass County', 'Missouri Secretary of State': null,
  ...Object.fromEntries(DISCOVERY.map((d) => [d.authority, d.jurisdiction])),
};

async function fc(path: string, body: unknown) {
  if (!LOVABLE_API_KEY || !FIRECRAWL_API_KEY) throw new Error('The web reading service is not set up.');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 120000);
  try {
    const res = await fetch(`${FC}${path}`, {
      method: 'POST', signal: ctl.signal,
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': FIRECRAWL_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Web reader ${path} failed [${res.status}]: ${(await res.text()).slice(0, 200)}`);
    return await res.json();
  } finally { clearTimeout(t); }
}
async function scrape(url: string) {
  const r = await fc('/scrape', { url, formats: ['markdown', 'links'], onlyMainContent: false, timeout: 110000 });
  const d = r.data ?? r;
  return { markdown: String(d.markdown ?? ''), links: (d.links ?? []) as string[] };
}
async function sha256(input: string | Uint8Array) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Hash only the stable body: drop dates/time-stamps the reader may vary.
const stableText = (md: string) => md.replace(/\s+/g, ' ').trim();

async function aiJson(instructions: string, input: string, name: string, schema: any): Promise<any | null> {
  if (!LOVABLE_API_KEY) throw new Error('AI key missing');
  const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai/gpt-6-astra', instructions, input, text: { format: { type: 'json_schema', name, strict: true, schema } } }),
  });
  if (!res.ok) throw new Error(`AI request failed [${res.status}]`);
  const data = await res.json();
  const out = data.output_text ?? (data.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? '').join('');
  return out ? JSON.parse(out) : null;
}

const CONTEST_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['contests'],
  properties: { contests: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    required: ['contest_type', 'title', 'district', 'vote_for', 'ballot_question', 'yes_statement', 'no_statement', 'has_write_in', 'candidates'],
    properties: {
      contest_type: { type: 'string', enum: ['candidate_race', 'ballot_measure', 'retention'] },
      title: { type: 'string' }, district: { type: ['string', 'null'] }, vote_for: { type: ['integer', 'null'] },
      ballot_question: { type: ['string', 'null'] }, yes_statement: { type: ['string', 'null'] }, no_statement: { type: ['string', 'null'] },
      has_write_in: { type: 'boolean' },
      candidates: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'party'],
        properties: { name: { type: 'string' }, party: { type: ['string', 'null'] } } } },
    },
  } } },
};

async function parseBallot(text: string, label: string) {
  const parsed = await aiJson(
    'You copy an official sample ballot into structured data for a strictly nonpartisan civic app. ' +
    'Copy every contest exactly as printed. Do not summarize, reword, or add anything. Never use outside knowledge. ' +
    'title: the office or measure heading exactly as printed, for example "STATE AUDITOR" or "CONSTITUTIONAL AMENDMENT NO. 3". ' +
    'district: the district exactly as printed, or null. vote_for: the "vote for" number, or null. ' +
    'candidates: in printed order, with the party label exactly as printed, or null. Do not include the write-in line as a candidate; set has_write_in instead. ' +
    'For measures and judicial retention questions, ballot_question is the full official question text as printed. ' +
    'yes_statement and no_statement: only the official fair ballot language sentences that begin with "A yes vote will" and "A no vote will", copied exactly. Use null if the page does not print them. ' +
    'Judicial retention questions use contest_type retention. List each judge as its own contest: title is the court heading as printed, then the judge name as printed, and ballot_question is that judge\'s question. If the same contest appears on several ballot styles, list it once.',
    `Source: ${label}\n\n${text.slice(0, 180000)}`, 'ballot', CONTEST_SCHEMA);
  return (parsed?.contests ?? []).filter((c: any) => c.title?.trim());
}

async function discover(db: any) {
  const found: { url: string; title: string; authority: string; parsed: boolean }[] = [];
  for (const d of DISCOVERY) {
    const urls = new Map<string, string>();
    for (const q of d.queries) {
      try {
        const r = await fc('/search', { query: q, limit: 10 });
        const items = Array.isArray(r.data) ? r.data : (r.data?.web ?? []);
        for (const it of items) {
          const u = String(it.url ?? '');
          const h = hostOf(u);
          if (!d.domains.some((x) => h === x || h.endsWith(`.${x}`))) continue;
          urls.set(u, String(it.title ?? ''));
        }
      } catch (e) { console.error('ballot discovery search failed', (e as Error).message.slice(0, 120)); }
    }
    const ranked = [...urls.entries()].filter(([u, t]) => /sample|ballot/i.test(`${u} ${t}`) && !/absentee|result|canvass/i.test(u) && !/20(1\d|2[0-5])/.test(u))
      .sort(([a, at], [b, bt]) => Number(/2026|nov/i.test(`${b} ${bt}`)) - Number(/2026|nov/i.test(`${a} ${at}`))).slice(0, 2);
    for (const [u, t] of ranked) {
      found.push({ url: u, title: t, authority: d.authority, parsed: false });
      await db.from('ballot_crawl_sources').upsert({ label: `${d.jurisdiction} sample ballot (found by search)`, url: u, kind: 'sample_ballot', authority: d.authority, discovered: true },
        { onConflict: 'url', ignoreDuplicates: true });
    }
  }
  return found;
}

function driveDownload(links: string[]): string | null {
  for (const l of links) {
    const m = l.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/) ?? l.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  }
  return null;
}
function samplePdf(links: string[], base: string): string | null {
  const h = hostOf(base);
  return links.find((l) => hostOf(l) === h && /sample|ballot|proof/i.test(l) && /(\.pdf|documentcenter|download|documents)/i.test(l) && !/absentee|result/i.test(l)) ?? null;
}

async function crawlSource(db: any, run: string, src: any) {
  const fetchedAt = new Date().toISOString();
  const out: any = { url: src.url, label: src.label, authority: src.authority, kind: src.kind, parsed: false, contests: 0 };
  try {
    if (!isOfficialUrl(src.url)) throw new Error('Not an official election authority domain.');
    let page = await scrape(src.url);
    let readUrl = src.url;
    if (src.kind === 'sample_ballot') {
      const next = hostOf(src.url) === 'kceb.org' ? driveDownload(page.links) : (/\.pdf|documentcenter/i.test(src.url) ? null : samplePdf(page.links, src.url));
      if (next) { readUrl = next; page = await scrape(next); }
    }
    out.resolved_url = readUrl;
    const text = stableText(page.markdown);
    if (text.length < 200) throw new Error('The page had almost no readable text.');
    // PDFs: hash the file bytes, since text extraction can vary between reads.
    let hash: string | null = null;
    if (/\.pdf|drive\.google\.com\/uc|documentcenter/i.test(readUrl)) {
      try {
        const r = await fetch(readUrl, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
        const b = new Uint8Array(await r.arrayBuffer());
        if (r.ok && b.length > 1000 && new TextDecoder().decode(b.slice(0, 5)) === '%PDF-') { hash = `pdf:${await sha256(b)}`; out.hash_method = 'file'; }
      } catch { /* fall back to text */ }
    }
    if (!hash) { hash = `txt:${await sha256(text.toLowerCase().replace(/[^a-z0-9]+/g, ''))}`; out.hash_method = 'text'; }
    out.hash = hash;
    // A switch in hash method (first byte-hash run) is not a content change.
    const changed = !!src.last_hash && src.last_hash.slice(0, 4) === hash.slice(0, 4) && src.last_hash !== hash;
    out.changed = changed;
    let contests: any[] = [];
    if (src.kind !== 'notice') {
      contests = await parseBallot(text, `${src.label} (${src.authority})`);
      const seen = new Set<string>();
      contests = contests.filter((c) => { const k = `${c.title}|${c.district}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      let order = 0;
      for (const c of contests) {
        order += 1;
        const { data: row, error } = await db.from('ballot_staged_contests').insert({
          run_id: run, source_id: src.id, source_name: src.label, source_url: src.url, fetched_at: fetchedAt, content_hash: hash,
          contest_type: c.contest_type, title: c.title.trim(), district: c.district, vote_for: c.vote_for, printed_order: order,
          ballot_question: c.ballot_question, yes_statement: c.yes_statement, no_statement: c.no_statement, has_write_in: !!c.has_write_in,
        }).select('id').single();
        if (error) throw new Error(`Staging failed: ${error.message}`);
        if (c.candidates?.length) {
          await db.from('ballot_staged_candidates').insert(c.candidates.filter((x: any) => x.name?.trim())
            .map((x: any, i: number) => ({ staged_contest_id: row.id, name: x.name.trim(), party: x.party, printed_order: i + 1 })));
        }
      }
      out.parsed = contests.length > 0;
      out.contests = contests.length;
    } else {
      out.parsed = true;
    }
    await db.from('ballot_crawl_sources').update({
      last_fetched_at: fetchedAt, last_hash: hash, resolved_url: readUrl, last_error: null,
      last_status: src.kind === 'notice' ? 'read' : (contests.length ? 'parsed' : 'no_contests'),
      last_contest_count: src.kind === 'notice' ? null : contests.length,
      ...(changed ? { last_changed_at: fetchedAt } : {}),
    }).eq('id', src.id);
    if (changed) {
      try {
        await sendAndLog('ballot-source-changed', 'myke@uwazi.ai', {
          templateData: { sourceName: src.label, link: REVIEW_LINK }, idempotencyKey: `ballot-src-${src.id}-${hash.slice(0, 16)}`,
        });
        out.alerted = true;
      } catch (e) { console.error('ballot source alert failed', (e as Error).message.slice(0, 120)); }
    }
  } catch (e) {
    out.error = (e as Error).message.slice(0, 300);
    await db.from('ballot_crawl_sources').update({ last_fetched_at: fetchedAt, last_status: 'failed', last_error: out.error }).eq('id', src.id);
  }
  return out;
}

async function runCrawl(db: any, run: string) {
  try {
    const discovered = await discover(db);
    const { data: sources } = await db.from('ballot_crawl_sources').select('*').eq('active', true);
    const results = await Promise.all((sources ?? []).map((s: any) => crawlSource(db, run, s)));
    for (const d of discovered) d.parsed = !!results.find((r) => r.url === d.url)?.parsed;

    const { data: contests } = await db.from('ballot_contests').select('id, contest_type, office_name, measure_title, district_type, district_id, source_name, source_url, yes_means, no_means, plain_summary, measure_summary, verification_status')
      .eq('state', 'MO').eq('election_date', '2026-11-03');
    const ids = (contests ?? []).map((c: any) => c.id);
    const { data: cands } = ids.length ? await db.from('ballot_candidates').select('id, contest_id, name, party, is_incumbent, sort_order').in('contest_id', ids) : { data: [] };
    const live: LiveContest[] = (contests ?? []).map((c: any) => ({ ...c, candidates: (cands ?? []).filter((x: any) => x.contest_id === c.id) }));

    const { data: st } = await db.from('ballot_staged_contests').select('*, ballot_staged_candidates(name, party, printed_order), ballot_crawl_sources(authority)').eq('run_id', run);
    // Statewide measure text: prefer SOS, then local ballots.
    const rank = (s: any) => (hostOf(s.source_url) === 'sos.mo.gov' ? 0 : hostOf(s.source_url) === 'kceb.org' ? 1 : 2);
    const staged: StagedContest[] = (st ?? []).sort((a: any, b: any) => rank(a) - rank(b) || a.printed_order - b.printed_order).map((s: any) => ({
      id: s.id, source_name: s.source_name, source_url: s.source_url, contest_type: s.contest_type, title: s.title, district: s.district,
      ballot_question: s.ballot_question, yes_statement: s.yes_statement, no_statement: s.no_statement,
      jurisdiction: JURISDICTION[s.ballot_crawl_sources?.authority] ?? null,
      candidates: (s.ballot_staged_candidates ?? []).sort((a: any, b: any) => a.printed_order - b.printed_order),
    }));

    const findings = diffBallot(live, staged);
    const now = new Date().toISOString();
    const { data: existing } = await db.from('ballot_crawl_findings').select('finding_key, status');
    const status = new Map((existing ?? []).map((e: any) => [e.finding_key, e.status]));
    for (const f of findings) {
      const s = status.get(f.finding_key);
      if (!s) await db.from('ballot_crawl_findings').insert({ ...f, run_id: run, last_seen_at: now });
      else if (s === 'pending') await db.from('ballot_crawl_findings').update({ ...f, run_id: run, last_seen_at: now }).eq('finding_key', f.finding_key);
    }
    const byType: Record<string, number> = {};
    for (const f of findings) byType[f.finding_type] = (byType[f.finding_type] ?? 0) + 1;
    await db.from('ballot_crawl_runs').update({
      status: 'done', finished_at: new Date().toISOString(),
      summary: { sources: results, discovered, findings: findings.length, by_type: byType, safe: findings.filter((f) => f.safe).length },
    }).eq('id', run);
  } catch (e) {
    await db.from('ballot_crawl_runs').update({ status: 'failed', finished_at: new Date().toISOString(), error: (e as Error).message.slice(0, 300) }).eq('id', run);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  let manual = false, userId: string | null = null;
  if (req.headers.get('x-job-token')) {
    const a = await authorizeSystemJob(req, db);
    if (!a.ok) return json({ error: 'Unauthorized' }, 401);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
    if (today > LAST_SCHEDULED_DAY) return json({ skipped: 'schedule ended' });
  } else {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: u } = await db.auth.getUser(token);
    if (!u?.user) return json({ error: 'Unauthorized' }, 401);
    const { data: ok } = await db.rpc('is_admin', { _user_id: u.user.id });
    if (!ok) return json({ error: 'Admins only' }, 403);
    manual = true; userId = u.user.id;
  }
  const { data: busy } = await db.from('ballot_crawl_runs').select('id').eq('status', 'running')
    .gte('started_at', new Date(Date.now() - 15 * 60000).toISOString()).limit(1);
  if (busy?.length) return json({ run_id: busy[0].id, already_running: true });
  const { data: run, error } = await db.from('ballot_crawl_runs').insert({ trigger: manual ? 'manual' : 'cron', started_by: userId }).select('id').single();
  if (error) return json({ error: 'Could not start a run.' }, 500);
  // @ts-ignore EdgeRuntime is provided by the platform.
  EdgeRuntime.waitUntil(runCrawl(db, run.id));
  return json({ run_id: run.id });
});
