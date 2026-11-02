// Super admin tool: fills state_election_links for 50 states and DC.
// Sources: vote.gov state pages (cross check of the official election site)
// and Firecrawl search filtered to official government domains.
// Every saved URL is loaded and its status recorded.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authorizeSystemJob } from '../_shared/system-auth.ts';

const FC = 'https://connector-gateway.lovable.dev/firecrawl/v2';
export const STATES: [string, string][] = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
];
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function fc(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${FC}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`, 'X-Connection-Api-Key': Deno.env.get('FIRECRAWL_API_KEY')!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`web reader ${path} [${res.status}]`);
  return res.json();
}
const host = (u: string) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } };
const root = (h: string) => h.split('.').slice(-2).join('.');
function electionSite(u: string, siteHosts: string[]): boolean {
  const h = host(u);
  if (!official(u, siteHosts)) return false;
  return siteHosts.some((s) => root(s) === root(h)) || /elect|vote|sos|boe|ballot/i.test(u);
}
function official(u: string, siteHosts: string[]): boolean {
  const h = host(u);
  if (!h) return false;
  if (h.endsWith('.gov') || h.endsWith('.us')) return true;
  return siteHosts.some((s) => root(s) === root(h));
}
// Direct check first. Many state sites block server requests (403), so a
// blocked result is re-checked with a real browser read.
async function loads(u: string | null): Promise<number | null> {
  if (!u) return null;
  const direct = await directLoad(u);
  if (direct > 0 && direct < 400) return direct;
  try {
    const r = await fc('/scrape', { url: u, formats: ['links'], onlyMainContent: true });
    const code = Number(r?.data?.metadata?.statusCode ?? r?.metadata?.statusCode ?? 0);
    return code || direct;
  } catch { return direct; }
}
async function directLoad(u: string): Promise<number> {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
    const r = await fetch(u, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 UWAZI link check' } });
    clearTimeout(t); await r.body?.cancel();
    return r.status;
  } catch { return 0; }
}
const PHONE = /\(?\b([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-](\d{4})\b/;

async function oneState(code: string, name: string) {
  const slug = name.toLowerCase().replace(/ /g, '-');
  const notes: string[] = [];
  let check: string | null = null; let website: string | null = null;
  try {
    const r = await fc('/scrape', { url: `https://vote.gov/register/${slug}`, formats: ['markdown'], onlyMainContent: true });
    const md: string = r?.data?.markdown ?? r?.markdown ?? '';
    check = md.match(/up to date on \[[^\]]*election website\]\((https?:[^)\s]+)/i)?.[1] ?? null;
    website = md.match(/\[Learn more on [^\]]*election website\]\((https?:[^)\s]+)/i)?.[1] ?? null;
    if (!check && !website) notes.push('vote.gov page had no state link');
  } catch { notes.push('vote.gov read failed'); }
  const hosts = [check, website].filter(Boolean).map((u) => host(u!));

  let phone: string | null = null; let phoneSrc: string | null = null; let sample: string | null = null;
  try {
    const s = await fc('/search', { query: `${name} state election office elections division contact phone`, limit: 8 });
    const rows: any[] = s?.data?.web ?? s?.data ?? [];
    for (const row of rows) {
      if (!electionSite(row.url, hosts)) continue;
      const m = `${row.title ?? ''} ${row.description ?? ''}`.match(PHONE);
      if (m) { phone = `(${m[1]}) ${m[2]}-${m[3]}`; phoneSrc = row.url; break; }
    }
    if (!phone) {
      const top = rows.find((row) => electionSite(row.url, hosts) && /contact|election/i.test(row.url));
      if (top) {
        const sc = await fc('/scrape', { url: top.url, formats: ['markdown'], onlyMainContent: true });
        const m = String(sc?.data?.markdown ?? '').match(PHONE);
        if (m) { phone = `(${m[1]}) ${m[2]}-${m[3]}`; phoneSrc = top.url; }
      }
    }
  } catch { notes.push('phone search failed'); }
  if (!phone) notes.push('no phone found on an official site');
  try {
    const s = await fc('/search', { query: `${name} official sample ballot lookup voter November 2026`, limit: 8 });
    const rows: any[] = s?.data?.web ?? s?.data ?? [];
    sample = rows.find((row) => electionSite(row.url, hosts) && /ballot|voter|myvote|lookup|portal/i.test(row.url))?.url ?? null;
  } catch { notes.push('sample ballot search failed'); }

  const [w, c, sb, ps] = await Promise.all([loads(website), loads(check), loads(sample), loads(phoneSrc)]);
  const ok = (x: number | null) => x !== null && x > 0 && x < 400;
  if (website && !ok(w)) { notes.push(`website did not load (${w})`); }
  if (check && !ok(c)) { notes.push(`check page did not load (${c})`); }
  if (sample && !ok(sb)) { notes.push(`sample ballot link dropped (${sb})`); sample = null; }
  const verified = (website ? ok(w) : true) && (check ? ok(c) : true) && !!(website || check);
  return {
    state_code: code, state_name: name,
    website_url: website, check_url: check, sample_ballot_url: sample,
    phone, phone_source_url: phoneSrc,
    url_check: { website: w, check: c, sample: sb, phoneSource: ps },
    notes: notes.join('. ') || null,
    verified_at: verified ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const a = await authorizeSystemJob(req, db);
  if (!a.ok) return json({ error: 'Unauthorized' }, 401);
  const body = await req.json().catch(() => ({}));
  const want: string[] = Array.isArray(body?.states) ? body.states : [];
  const list = STATES.filter(([c]) => !want.length || want.includes(c)).slice(0, 12);
  const out: any[] = [];
  for (let i = 0; i < list.length; i += 4) {
    const rows = await Promise.all(list.slice(i, i + 4).map(([c, n]) => oneState(c, n)));
    for (const r of rows) {
      const { error } = await db.from('state_election_links').upsert({ ...r, updated_by: a.userId ?? null });
      if (error) console.error('state link upsert failed', r.state_code, error.code);
      out.push({ state: r.state_code, verified: !!r.verified_at, phone: !!r.phone, sample: !!r.sample_ballot_url, notes: r.notes });
    }
  }
  return json({ ok: true, results: out });
});
