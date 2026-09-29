import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
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

async function checkSource(db: any, src: any) {
  const now = new Date().toISOString();
  try {
    const page = await fetch(src.source_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (UWAZI office monitor; +https://uwaziapp.uwazi.ai)' },
      signal: AbortSignal.timeout(20000),
    });
    if (!page.ok) throw new Error(`Page returned ${page.status}`);
    const text = htmlToText(await page.text());
    const { offices, unclear } = await extract(text, src.label);

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

    const result = { offices, unclear, changes_found: rows.length, checked_at: now };
    await db.from('civic_office_sources').update({
      last_checked_at: now, last_success_at: now, last_error: null, last_result: result,
      ...(rows.length ? { last_changed_at: now } : {}),
    }).eq('id', src.id);
    return { source_id: src.id, ok: true, ...result };
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`office-monitor ${src.id}: ${msg}`);
    await db.from('civic_office_sources').update({ last_checked_at: now, last_error: msg }).eq('id', src.id);
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
    const { data: isAdmin } = await db.rpc('is_admin', { _user_id: u.user.id });
    if (!isAdmin) return json({ error: 'Admins only' }, 403);
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
