import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

const CRON_SECRET = Deno.env.get('SCRAPER_CRON_SECRET');
const MAX_PER_RUN = 5;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

type Office = { office_title: string; current_holder: string | null; term_end: string | null };

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
    .slice(0, 60000);
}

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function aiJson(instructions: string, input: string, name: string, schema: any): Promise<any | null> {
  if (!LOVABLE_API_KEY) throw new Error('AI key missing');
  const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai/gpt-6-astra', instructions, input, text: { format: { type: 'json_schema', name, strict: true, schema } } }),
  });
  if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const out = data.output_text ??
    (data.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? '').join('');
  return out ? JSON.parse(out) : null;
}

type Cand = { name: string; party: string | null; is_incumbent: boolean; withdrawn: boolean };
type Contest = { contest: string; candidates: Cand[] };

async function extractCandidates(text: string, label: string, contestHints: string[]): Promise<{ contests: Contest[]; unclear: boolean }> {
  const parsed = await aiJson(
    'You are RaiaG, a careful data extractor for UWAZI. Read the page text. List each race or contest on the page and the candidates running in it, exactly as the page states. ' +
    'For each candidate give the name, the party only if the page shows it, whether the page marks them as the incumbent, and whether the page says they withdrew or dropped out. ' +
    'Write the party as a full word, like Democratic or Republican, even when the page uses a letter like D or R. If party is not shown, use null. ' +
    'Never guess. Never use outside knowledge. ' +
    'Only list candidates for the upcoming general election. If the page also lists primary candidates who lost or were not nominated, leave them out. ' +
    'When a contest matches one of the known contest names given below, use that exact name. ' +
    'If the page is unclear about who is running in which contest, return an empty list and set unclear to true.',
    `Source: ${label}\n\nKnown contest names:\n${contestHints.slice(0, 150).join('\n') || 'none'}\n\nPage text:\n${text}`,
    'candidates',
    {
      type: 'object', additionalProperties: false, required: ['unclear', 'contests'],
      properties: {
        unclear: { type: 'boolean' },
        contests: { type: 'array', items: {
          type: 'object', additionalProperties: false, required: ['contest', 'candidates'],
          properties: {
            contest: { type: 'string' },
            candidates: { type: 'array', items: {
              type: 'object', additionalProperties: false, required: ['name', 'party', 'is_incumbent', 'withdrawn'],
              properties: { name: { type: 'string' }, party: { type: ['string', 'null'] }, is_incumbent: { type: 'boolean' }, withdrawn: { type: 'boolean' } },
            } },
          },
        } },
      },
    },
  );
  if (!parsed) return { contests: [], unclear: true };
  const contests = (parsed.contests ?? []).filter((c: Contest) => c.contest?.trim())
    .map((c: Contest) => ({ ...c, candidates: (c.candidates ?? []).filter((x) => x.name?.trim()) }));
  return { contests, unclear: !!parsed.unclear };
}

const nameKey = (s: string | null | undefined) => norm(s).replace(/\b(jr|sr|ii|iii|iv)\b/g, '').replace(/\s+/g, ' ').trim();
const sameName = (a: string, b: string) => {
  const x = nameKey(a), y = nameKey(b);
  if (x === y) return true;
  const xs = x.split(' '), ys = y.split(' ');
  return xs[0] === ys[0] && xs[xs.length - 1] === ys[ys.length - 1];
};
const partyKey = (p: string | null | undefined) => {
  const n = norm(p);
  if (!n) return '';
  const short: Record<string, string> = { d: 'democrat', r: 'republican', l: 'libertarian', g: 'green', i: 'independent' };
  if (short[n]) return short[n];
  if (n.startsWith('dem')) return 'democrat';
  if (n.startsWith('rep')) return 'republican';
  if (n.startsWith('lib')) return 'libertarian';
  if (n.startsWith('gre')) return 'green';
  if (n.startsWith('non')) return 'nonpartisan';
  if (n.startsWith('ind')) return 'independent';
  return n;
};

async function diffCandidates(db: any, src: any, text: string) {
  type Target = { id: string; name: string; candidates: any[] };
  let targets: Target[] = [];
  if (src.target_table === 'race_candidates') {
    const { data: race } = await db.from('election_races').select('id, office, district').eq('id', src.race_id).single();
    if (!race) throw new Error('The race for this source was not found.');
    const { data: cands } = await db.from('race_candidates').select('id, name, party, status').eq('race_id', race.id);
    targets = [{ id: race.id, name: `${race.office}${race.district ? ` District ${race.district}` : ''}`, candidates: cands ?? [] }];
  } else {
    const { data: contests } = await db.from('ballot_contests').select('id, office_name, party, district_id')
      .eq('state', src.ballot_state).eq('election_date', src.ballot_election_date).neq('contest_type', 'measure').not('office_name', 'is', null);
    const ids = (contests ?? []).map((c: any) => c.id);
    const { data: cands } = ids.length
      ? await db.from('ballot_candidates').select('id, contest_id, name, party, withdrawn_at').in('contest_id', ids)
      : { data: [] };
    targets = (contests ?? []).map((c: any) => ({
      id: c.id, name: `${c.office_name}${c.party ? ` (${c.party})` : ''}`,
      candidates: (cands ?? []).filter((x: any) => x.contest_id === c.id),
    }));
  }

  const { contests, unclear } = await extractCandidates(text, src.label, targets.map((t) => t.name));
  const { data: pending } = await db.from('civic_office_pending_changes')
    .select('candidate_id, contest_ref, field_changed, new_value').eq('source_id', src.id).eq('status', 'pending');
  const pendingKeys = new Set((pending ?? []).map((p: any) =>
    `${p.contest_ref}|${p.candidate_id ?? 'new'}|${p.field_changed}|${nameKey(p.new_value)}`));

  const rows: any[] = [];
  const unmatched: string[] = [];
  for (const c of contests) {
    const t = targets.length === 1 && src.target_table === 'race_candidates'
      ? targets[0]
      : targets.find((x) => norm(x.name) === norm(c.contest));
    if (!t) { unmatched.push(c.contest); continue; }
    for (const cand of c.candidates) {
      const match = t.candidates.find((x) => sameName(x.name, cand.name));
      const base = { source_id: src.id, office_id: null, origin: 'scraper', target_table: src.target_table, contest_ref: t.id };
      const push = (r: any) => {
        const key = `${t.id}|${r.candidate_id ?? 'new'}|${r.field_changed}|${nameKey(r.new_value)}`;
        if (!pendingKeys.has(key)) { pendingKeys.add(key); rows.push({ ...base, ...r }); }
      };
      if (!match) {
        if (cand.withdrawn) continue;
        push({ candidate_id: null, field_changed: 'new_candidate', old_value: null, new_value: cand.name,
          proposed: { contest: t.name, name: cand.name, party: cand.party, is_incumbent: cand.is_incumbent } });
        continue;
      }
      const isOut = src.target_table === 'race_candidates' ? match.status === 'withdrew' : !!match.withdrawn_at;
      if (cand.withdrawn && !isOut) {
        push({ candidate_id: match.id, field_changed: 'withdrawn', old_value: `${match.name}, running`, new_value: `${match.name}, withdrew`,
          proposed: { contest: t.name, name: match.name } });
      }
      if (cand.party && partyKey(cand.party) !== partyKey(match.party)) {
        push({ candidate_id: match.id, field_changed: 'party', old_value: match.party, new_value: cand.party,
          proposed: { contest: t.name, name: match.name, party: cand.party } });
      }
    }
  }
  const found = contests.reduce((n, c) => n + c.candidates.length, 0);
  return { rows, result: { contests, unclear, unmatched, candidates_found: found }, health: found ? 'ok' : 'unclear' };
}

async function extract(text: string, label: string): Promise<{ offices: Office[]; unclear: boolean }> {
  if (!LOVABLE_API_KEY) throw new Error('AI key missing');
  const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-6-astra',
      instructions:
        'You are RaiaG, a careful data extractor for UWAZI. Read the page text. List only elected offices and the people who hold them, exactly as the page states. ' +
        'Extract only the office title, the current holder, and term info that is actually written on the page. ' +
        'Never guess. Never use outside knowledge. If term info is not on the page, use null. ' +
        'If the page structure is unclear or you are not sure who holds which office, return an empty list and set unclear to true. Keep office titles short and plain, like "City Council District 1".',
      input: `Source: ${label}\n\nPage text:\n${text}`,
      text: {
        format: {
          type: 'json_schema',
          name: 'offices',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['unclear', 'offices'],
            properties: {
              unclear: { type: 'boolean' },
              offices: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['office_title', 'current_holder', 'term_end'],
                  properties: {
                    office_title: { type: 'string' },
                    current_holder: { type: ['string', 'null'] },
                    term_end: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const out = data.output_text ??
    (data.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? '').join('');
  if (!out) return { offices: [], unclear: true };
  const parsed = JSON.parse(out);
  const offices = (parsed.offices ?? []).filter((o: Office) => o.office_title?.trim());
  return { offices, unclear: !!parsed.unclear };
}

const BLOCK_RE = /access denied|forbidden|attention required|verify you are human|captcha|request blocked/i;

async function readWithFirecrawl(url: string): Promise<string> {
  if (!LOVABLE_API_KEY || !FIRECRAWL_API_KEY) throw new Error('The web reading service is not set up.');
  const res = await fetch('https://connector-gateway.lovable.dev/firecrawl/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': FIRECRAWL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, waitFor: 4000 }),
    signal: AbortSignal.timeout(90000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`The web reading service failed [${res.status}]: ${body.slice(0, 300)}`);
  let data: any = {};
  try { data = JSON.parse(body); } catch { /* empty */ }
  const md = data.markdown ?? data.data?.markdown ?? '';
  if (!md || md.trim().length < 200) throw new Error('The web reading service returned an empty page.');
  return String(md).slice(0, 60000);
}

async function checkSource(db: any, src: any) {
  const now = new Date().toISOString();
  let readMethod = 'fetch';
  try {
    let text = '';
    let needsFirecrawl = src.source_health === 'blocked' || /\.pdf(\?|$)/i.test(src.source_url);
    if (!needsFirecrawl) {
      try {
        const page = await fetch(src.source_url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (UWAZI office monitor; +https://uwaziapp.uwazi.ai)' },
          signal: AbortSignal.timeout(20000),
        });
        if (page.status === 401 || page.status === 403) needsFirecrawl = true;
        else if (!page.ok) throw new Error(`Page returned ${page.status}`);
        else {
          text = htmlToText(await page.text());
          if (text.length < 3000 && BLOCK_RE.test(text)) { needsFirecrawl = true; text = ''; }
        }
      } catch (fe) {
        if (!needsFirecrawl) throw fe;
      }
    }
    if (needsFirecrawl) {
      readMethod = 'firecrawl';
      try {
        text = await readWithFirecrawl(src.source_url);
      } catch (ce) {
        const e: any = new Error(`This site blocks automated readers. ${(ce as Error).message}`);
        e.health = 'blocked'; e.readMethod = 'firecrawl'; throw e;
      }
      if (text.length < 3000 && BLOCK_RE.test(text)) {
        const e: any = new Error('This site blocks automated readers. It showed an access denied page.');
        e.health = 'blocked'; e.readMethod = 'firecrawl'; e.pageText = text; throw e;
      }
    }
    if (src.kind === 'candidates') {
      const { rows, result: r, health } = await diffCandidates(db, src, text);
      if (rows.length) {
        const { error: insErr } = await db.from('civic_office_pending_changes').insert(rows);
        if (insErr) throw new Error(`Could not save changes: ${insErr.message}`);
      }
      const result = { ...r, changes_found: rows.length, checked_at: now, read_method: readMethod };
      await db.from('civic_office_sources').update({
        last_checked_at: now, last_success_at: now, last_error: null, last_result: result,
        source_health: health, last_page_text: text.slice(0, 20000), read_method: readMethod,
        ...(rows.length ? { last_changed_at: now } : {}),
      }).eq('id', src.id);
      return { source_id: src.id, ok: true, ...result };
    }

    const { offices, unclear } = await extract(text, src.label);
    const health = offices.length ? 'ok' : 'unclear';


    const { data: existing } = await db.from('civic_offices').select('*').eq('source_url', src.source_url);
    const { data: pending } = await db.from('civic_office_pending_changes')
      .select('office_id, field_changed, new_value, proposed').eq('source_id', src.id).eq('status', 'pending');
    const pendingKeys = new Set((pending ?? []).map((p: any) =>
      `${p.office_id ?? 'new'}|${p.field_changed}|${norm(p.new_value)}`));

    const rows: any[] = [];
    for (const o of offices) {
      const match = (existing ?? []).find((e: any) => norm(e.office_title) === norm(o.office_title));
      if (!match) {
        const key = `new|new_office|${norm(o.current_holder ?? o.office_title)}`;
        if (!pendingKeys.has(key)) rows.push({
          source_id: src.id, office_id: null, field_changed: 'new_office', old_value: null,
          new_value: o.current_holder ?? o.office_title, proposed: o, origin: 'scraper',
        });
        continue;
      }
      for (const f of ['current_holder', 'term_end'] as const) {
        if (o[f] && norm(o[f]) !== norm(match[f])) {
          const key = `${match.id}|${f}|${norm(o[f])}`;
          if (!pendingKeys.has(key)) rows.push({
            source_id: src.id, office_id: match.id, field_changed: f, old_value: match[f], new_value: o[f], origin: 'scraper',
          });
        }
      }
    }
    if (rows.length) await db.from('civic_office_pending_changes').insert(rows);

    const result = { offices, unclear, changes_found: rows.length, checked_at: now, read_method: readMethod };
    await db.from('civic_office_sources').update({
      last_checked_at: now, last_success_at: now, last_error: null, last_result: result,
      source_health: health, last_page_text: text.slice(0, 20000), read_method: readMethod,
      ...(rows.length ? { last_changed_at: now } : {}),
    }).eq('id', src.id);
    return { source_id: src.id, ok: true, ...result };
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`office-monitor ${src.id}: ${msg}`);
    await db.from('civic_office_sources').update({ last_checked_at: now, last_error: msg, source_health: (e as any).health ?? 'broken',
      read_method: (e as any).readMethod ?? readMethod,
      ...((e as any).pageText ? { last_page_text: String((e as any).pageText).slice(0, 20000) } : {}) }).eq('id', src.id);
    return { source_id: src.id, ok: false, error: msg };

  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  // Admin: run one source now
  if (body.source_id) {
    if (typeof body.source_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.source_id)) return json({ error: 'Bad source id' }, 400);
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: u } = await db.auth.getUser(token ?? '');
    if (!u?.user) return json({ error: 'Please sign in' }, 401);
    const { data: isAdmin } = await db.rpc('is_office_reviewer', { _user_id: u.user.id });
    if (!isAdmin) return json({ error: 'Admins and reviewers only' }, 403);
    const { data: src } = await db.from('civic_office_sources').select('*').eq('id', body.source_id).single();
    if (!src) return json({ error: 'Source not found' }, 404);
    return json(await checkSource(db, src));
  }

  // Cron: all active sources that are due
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'Unauthorized' }, 401);
  const { data: sources } = await db.from('civic_office_sources').select('*').eq('active', true);
  const due = (sources ?? []).filter((s: any) =>
    !s.last_checked_at || new Date(s.last_checked_at).getTime() + s.check_frequency_hours * 3600_000 < Date.now()
  ).slice(0, MAX_PER_RUN);
  const results = [];
  for (const s of due) results.push(await checkSource(db, s));
  return json({ checked: results.length, results });
});
