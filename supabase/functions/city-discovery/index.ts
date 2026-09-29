// City auto discovery. Finds official pages for a new city and proposes them for review.
// Nothing here turns anything on. Every source and map lands turned off.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendAndLog } from '../_shared/transactional-email-templates/send-and-log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const CRON_SECRET = Deno.env.get('SCRAPER_CRON_SECRET');
const FC = 'https://connector-gateway.lovable.dev/firecrawl/v2';
const ADMIN_LINK = 'https://uwaziapp.uwazi.ai/app/admin/office-health';

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

type Usage = { searches: number; reads: number };
type Hit = { url: string; title: string; description: string };

function fcHeaders() {
  if (!LOVABLE_API_KEY || !FIRECRAWL_API_KEY) throw new Error('The web reading service is not set up.');
  return { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': FIRECRAWL_API_KEY, 'Content-Type': 'application/json' };
}

async function search(query: string, usage: Usage): Promise<Hit[]> {
  usage.searches++;
  const res = await fetch(`${FC}/search`, {
    method: 'POST', headers: fcHeaders(), body: JSON.stringify({ query, limit: 8 }), signal: AbortSignal.timeout(60000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Web search failed [${res.status}]: ${body.slice(0, 200)}`);
  const d = JSON.parse(body);
  const list = Array.isArray(d.data) ? d.data : (d.data?.web ?? d.web ?? []);
  return list.map((r: any) => ({ url: String(r.url ?? ''), title: String(r.title ?? ''), description: String(r.description ?? '') }))
    .filter((r: Hit) => /^https?:\/\//.test(r.url));
}

async function pageLinks(url: string, usage: Usage): Promise<string[]> {
  usage.reads++;
  const res = await fetch(`${FC}/scrape`, {
    method: 'POST', headers: fcHeaders(), body: JSON.stringify({ url, formats: ['links'], waitFor: 3000 }), signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) return [];
  const d = await res.json().catch(() => ({}));
  return (d.links ?? d.data?.links ?? []).map(String);
}

async function aiJson(instructions: string, input: string, schema: any): Promise<any> {
  if (!LOVABLE_API_KEY) throw new Error('AI key missing');
  const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai/gpt-6-astra', instructions, input, text: { format: { type: 'json_schema', name: 'pick', strict: true, schema } } }),
  });
  if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const out = data.output_text ?? (data.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? '').join('');
  return out ? JSON.parse(out) : null;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

const hostOf = (url: string) => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };

async function loadOfficialDomains(db: any): Promise<string[]> {
  const { data } = await db.from('official_domains').select('domain');
  return (data ?? []).map((d: any) => String(d.domain).toLowerCase());
}

/** Official means a .gov site, a .us city or county site, or a domain an admin marked official. */
function isOfficial(url: string, names: string[], extra: string[] = []): boolean {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch { return false; }
  if (host.endsWith('.gov')) return true;
  if (extra.some((d) => host === d || host.endsWith(`.${d}`))) return true;
  if (!host.endsWith('.us')) return false;
  if (/(^|\.)(ci|co|city|cityof|town|county|twp)\./.test(host) || /^(www\.)?(cityof|countyof)/.test(host)) return true;
  const bare = host.replace(/[^a-z]/g, '');
  return names.some((n) => n.length > 3 && bare.includes(slug(n)));
}

/** Ask RaiaG which search hits are the page we want. Returns them best first. */
async function rankHits(goal: string, hits: Hit[]): Promise<Hit[]> {
  if (!hits.length) return [];
  const r = await aiJson(
    'You pick web pages for UWAZI. From the numbered search results, list the numbers of results that are clearly the page described in the goal, best first. ' +
    'Only use what the title, address and snippet show. Never guess. If none fit, return an empty list.',
    `Goal: ${goal}\n\n${hits.map((h, i) => `${i}. ${h.title}\n${h.url}\n${h.description}`).join('\n\n')}`,
    { type: 'object', additionalProperties: false, required: ['matches'], properties: { matches: { type: 'array', items: { type: 'integer' } } } },
  );
  return ((r?.matches ?? []) as number[]).filter((i) => hits[i]).map((i) => hits[i]);
}

async function censusName(layer: string, geoid: string): Promise<string | null> {
  try {
    const u = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/${layer}/query?where=GEOID%3D%27${encodeURIComponent(geoid)}%27&outFields=NAME&returnGeometry=false&f=json`;
    const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.features?.[0]?.attributes?.NAME ?? null;
  } catch { return null; }
}

// Same map parsing the admin import form uses.
const CODE_KEYS = [/^district$/i, /district.*(num|no|id|code)/i, /^(council|ward|precinct)(_?(num|no|id|code))?$/i, /^(coun_dist|councildist|dist)$/i, /^dist_?(id|no|num)$/i];
const NAME_KEYS = [/^name$/i, /district.*name/i, /^label$/i, /^title$/i, /council.*member/i, /^rep$/i];
function pickProp(props: Record<string, any>, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const key = Object.keys(props).find((k) => p.test(k));
    if (key != null && props[key] != null && String(props[key]).trim() !== '') return String(props[key]).trim();
  }
  return null;
}

function geojsonUrlFor(u: string): string | null {
  if (/\/(FeatureServer|MapServer)\/\d+\/?$/i.test(u)) return u.replace(/\/?$/, '/query?where=1%3D1&outFields=*&outSR=4326&f=geojson');
  if (/\.geojson(\?|$)|[?&](f|format)=geojson/i.test(u)) return u;
  if (/\/resource\/[a-z0-9]{4}-[a-z0-9]{4}\.geojson/i.test(u)) return u;
  return null;
}

async function importBoundary(db: any, place: string, pageUrl: string, usage: Usage): Promise<{ batch: string; saved: number; names: string[]; file: string } | { error: string }> {
  let file = geojsonUrlFor(pageUrl);
  if (!file) {
    const links = await pageLinks(pageUrl, usage);
    for (const l of links) { const g = geojsonUrlFor(l); if (g) { file = g; break; } }
    if (!file && links.some((l) => /\.zip(\?|$)|shapefile/i.test(l))) return { error: 'The page has a Shapefile download only. A person needs to convert it.' };
  }
  if (!file) return { error: 'We found the page but no map file we can read.' };
  const res = await fetch(file, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) return { error: `The map file returned ${res.status}.` };
  let geo: any;
  try { geo = JSON.parse(await res.text()); } catch { return { error: 'That file is not map data we can read.' }; }
  const features: any[] = geo.type === 'FeatureCollection' ? geo.features ?? [] : [];
  if (!features.length || features.length > 200) return { error: `The map file had ${features.length} areas, which does not look like council districts.` };
  const batch = crypto.randomUUID();
  const names: string[] = [];
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    if (!f.geometry) continue;
    const props = f.properties ?? {};
    const code = pickProp(props, CODE_KEYS) ?? String(i + 1);
    const name = pickProp(props, NAME_KEYS) ?? `District ${code}`;
    const { error } = await db.rpc('import_district_boundary', {
      _jurisdiction_geoid: place, _district_type: 'council', _district_code: code, _name: name,
      _geojson: f.geometry, _source_url: pageUrl, _batch: batch,
    });
    if (!error) names.push(`${code}. ${name}`);
  }
  if (!names.length) return { error: 'We could not save any districts from that file.' };
  return { batch, saved: names.length, names, file };
}

async function runFirstCheck(sourceId: string): Promise<string> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/office-monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, 'x-cron-secret': CRON_SECRET ?? '' },
      body: JSON.stringify({ source_id: sourceId }),
      signal: AbortSignal.timeout(150000),
    });
    const d = await r.json().catch(() => ({}));
    if (!d.ok) return `No offices pulled. ${d.error ?? 'The check did not finish.'}`;
    const offices = (d.offices ?? []) as any[];
    if (!offices.length) return 'The page was read, but no offices were clear enough to pull.';
    const list = offices.slice(0, 12).map((o) => `${o.office_title}: ${o.current_holder ?? 'no one listed'}`).join(', ');
    return `${offices.length} offices pulled, ${d.changes_found ?? 0} sent to the review queue. ${list}${offices.length > 12 ? ', and more' : ''}.`;
  } catch (e) {
    return `No offices pulled. ${(e as Error).message}`;
  }
}

async function discoverCity(db: any, city: any) {
  const usage: Usage = { searches: 0, reads: 0 };
  const notes: string[] = [];
  const proposed: any[] = [];
  const notOfficial: string[] = [];
  const name = city.place_name ?? 'this city';
  const st = city.state ?? '';
  try {
    const countyName = city.county_geoid ? await censusName('State_County/MapServer/1', city.county_geoid) : null;
    const schoolName = city.school_district_geoid ? await censusName('School/MapServer/0', city.school_district_geoid) : null;
    const countyShort = countyName?.split(',')[0] ?? null;
    const schoolShort = schoolName?.split(',')[0] ?? null;
    const officialNames = [name, countyShort?.replace(/\s+County$/i, '') ?? ''].filter(Boolean);
    const extraDomains = await loadOfficialDomains(db);

    const jobs: { key: string; label: string; query: string; goal: string; geoid: string | null; level: string }[] = [
      { key: 'council', label: `${name} City Council`, query: `${name} ${st} city council members official`,
        goal: `The official ${name}, ${st} city government page that lists the mayor and city council members or elected officials.`, geoid: city.place_geoid, level: 'city' },
      { key: 'boundary', label: `${name} council district map`, query: `${name} ${st} city council districts map GeoJSON open data`,
        goal: `An official ${name}, ${st} page or open data item with a downloadable city council district boundary map file, GeoJSON or Shapefile.`, geoid: city.place_geoid, level: 'city' },
    ];
    if (countyShort) jobs.push({ key: 'county', label: `${countyShort} commission`, query: `${countyShort} ${st} county commission OR legislature members`,
      goal: `The official ${countyShort}, ${st} page listing the county commissioners or county legislators.`, geoid: city.county_geoid, level: 'county' });
    else notes.push('We could not look up the county name, so we skipped the county page.');
    if (schoolShort) jobs.push({ key: 'school', label: `${schoolShort} board`, query: `${schoolShort} ${st} school board members`,
      goal: `The official page for ${schoolShort} in ${st} that lists the school board members.`, geoid: city.school_district_geoid, level: 'school' });
    else notes.push('We could not look up the school district, so we skipped the school board page.');

    const picks = await Promise.all(jobs.map(async (j) => {
      try {
        const hits = await search(j.query, usage);
        return { j, ranked: await rankHits(j.goal, hits) };
      } catch (e) {
        notes.push(`${j.label}: search failed. ${(e as Error).message}`);
        return { j, ranked: [] as Hit[] };
      }
    }));

    const checks: Promise<void>[] = [];
    for (const { j, ranked } of picks) {
      const official = ranked.find((h) => isOfficial(h.url, officialNames, extraDomains));
      for (const h of ranked) {
        if (h === official) break;
        if (!isOfficial(h.url, officialNames, extraDomains)) {
          notOfficial.push(h.url);
          proposed.push({ kind: 'not_official', key: j.key, label: j.label, url: h.url });
          notes.push(`${j.label}: ${h.url} found but not official, needs a human to confirm.`);
        }
      }
      if (!official) { notes.push(`${j.label}: no official page found.`); continue; }

      if (j.key === 'boundary') {
        const r = await importBoundary(db, city.place_geoid, official.url, usage);
        if ('error' in r) {
          notes.push(`${j.label}: ${official.url} accepted, but ${r.error}`);
          proposed.push({ kind: 'boundary', label: j.label, url: official.url, error: r.error });
        } else {
          notes.push(`${j.label}: saved ${r.saved} districts, turned off, from ${r.file}.`);
          proposed.push({ kind: 'boundary', label: j.label, url: official.url, file: r.file, import_batch_id: r.batch, saved: r.saved, names: r.names });
        }
        continue;
      }

      const { data: existing } = await db.from('civic_data_sources').select('id').eq('source_url', official.url).maybeSingle();
      let sourceId = existing?.id as string | undefined;
      if (!sourceId) {
        const { data: ins, error } = await db.from('civic_data_sources').insert({
          geoid: j.geoid, label: j.label, source_url: official.url, jurisdiction_level: j.level,
          check_frequency_hours: 168, active: false, kind: 'office', is_official: true,
          last_error: 'Found by city auto discovery. Check it against the live page before you turn it on.',
        }).select('id').single();
        if (error) { notes.push(`${j.label}: could not save the source. ${error.message}`); continue; }
        sourceId = ins.id;
      }
      const entry: any = { kind: 'source', label: j.label, url: official.url, source_id: sourceId };
      proposed.push(entry);
      notes.push(`${j.label}: accepted ${official.url}.`);
      checks.push(runFirstCheck(sourceId!).then((pulled) => { entry.first_check = pulled; }));
    }
    await Promise.all(checks);
    usage.reads += checks.length;

    const anyFound = proposed.some((p: any) => p.source_id || p.import_batch_id);
    const status = anyFound ? 'proposed' : 'needs_human';
    notes.push(`Web reading service use: ${usage.searches} searches, about ${usage.reads} page reads.`);
    const discoveredAt = new Date().toISOString();
    await db.from('city_onboarding').update({
      status, discovered_at: discoveredAt, proposed_sources: proposed,
      notes: [`Search on ${discoveredAt.slice(0, 16).replace('T', ' ')} UTC`, ...notes].join('\n'), last_error: null,
    }).eq('id', city.id);

    // Tell the super admins.
    const { data: admins } = await db.rpc('super_admin_emails');
    const emailed: string[] = [];
    for (const a of admins ?? []) {
      try {
        const r = await sendAndLog('city-onboarding', a.email, {
          idempotencyKey: `city-${city.id}-${discoveredAt}-${a.email}`,
          templateData: {
            city: `${name}${st ? `, ${st}` : ''}`, status, askedCount: city.requested_by_count, link: ADMIN_LINK,
            sources: proposed.filter((p) => p.kind === 'source').map((p) => ({ label: p.label, url: p.url, pulled: p.first_check ?? 'Not checked' })),
            boundary: proposed.find((p) => p.kind === 'boundary')
              ? (() => { const b = proposed.find((p) => p.kind === 'boundary'); return b.saved ? `${b.saved} districts saved and turned off. ${b.url}` : `${b.url}. ${b.error}`; })()
              : undefined,
            notOfficial,
          },
        });
        emailed.push(r.sent ? 'queued' : 'skipped, this address is blocked');
      } catch (e) {
        emailed.push(`failed ${((e as Error).message ?? '').slice(0, 120)}`);
      }
    }
    await db.from('city_onboarding').update({
      notified_at: emailed.some((e) => e === 'queued') ? new Date().toISOString() : null,
      notes: [`Search on ${discoveredAt.slice(0, 16).replace('T', ' ')} UTC`, ...notes,
        `Email to super admins: ${emailed.length ? emailed.join(', ') : 'no super admin email found'}.`].join('\n'),
    }).eq('id', city.id);
    return { city: name, status, proposed, notes, emailed };
  } catch (e) {
    const msg = (e as Error).message;
    notes.push(`Web reading service use: ${usage.searches} searches, about ${usage.reads} page reads.`);
    await db.from('city_onboarding').update({ status: 'failed', last_error: msg, notes: notes.join('\n'), proposed_sources: proposed }).eq('id', city.id);
    return { city: name, status: 'failed', error: msg };
  }
}

/** An admin said this domain is official. Propose that one page for the city and run its first check. */
async function markOfficial(db: any, userId: string, cityId: string, url: string, label: string) {
  const { data: city } = await db.from('city_onboarding').select('*').eq('id', cityId).maybeSingle();
  if (!city) throw new Error('We could not find that city.');
  const domain = hostOf(url);
  if (!domain) throw new Error('That web address is not valid.');
  const { error: dErr } = await db.from('official_domains').upsert({ domain, label: label || null, added_by: userId }, { onConflict: 'domain', ignoreDuplicates: true });
  if (dErr) throw new Error(dErr.message);

  const l = label.toLowerCase();
  const key = /district map/.test(l) ? 'boundary' : /commission|legislat/.test(l) ? 'county' : /board|school/.test(l) ? 'school' : 'council';
  const geoid = key === 'county' ? city.county_geoid : key === 'school' ? city.school_district_geoid : city.place_geoid;
  const level = key === 'county' ? 'county' : key === 'school' ? 'school' : 'city';
  const usage: Usage = { searches: 0, reads: 0 };
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  let entry: any;
  let note: string;

  if (key === 'boundary') {
    const r = await importBoundary(db, city.place_geoid, url, usage);
    entry = 'error' in r
      ? { kind: 'boundary', label, url, error: r.error }
      : { kind: 'boundary', label, url, file: r.file, import_batch_id: r.batch, saved: r.saved, names: r.names };
    note = 'error' in r ? `${label}: ${url} marked official, but ${r.error}` : `${label}: ${url} marked official. Saved ${r.saved} districts, turned off.`;
  } else {
    const { data: existing } = await db.from('civic_data_sources').select('id').eq('source_url', url).maybeSingle();
    let sourceId = existing?.id as string | undefined;
    if (!sourceId) {
      const { data: ins, error } = await db.from('civic_data_sources').insert({
        geoid, label, source_url: url, jurisdiction_level: level,
        check_frequency_hours: 168, active: false, kind: 'office', is_official: true,
        last_error: 'An admin marked this site official. Check it against the live page before you turn it on.',
      }).select('id').single();
      if (error) throw new Error(`We could not save the source. ${error.message}`);
      sourceId = ins.id;
    }
    entry = { kind: 'source', label, url, source_id: sourceId, marked_official: true };
    entry.first_check = await runFirstCheck(sourceId!);
    note = `${label}: ${url} marked official and accepted.`;
  }

  const { data: fresh } = await db.from('city_onboarding').select('proposed_sources, notes, status').eq('id', cityId).single();
  const list = ((fresh?.proposed_sources ?? []) as any[]).filter((p) => !(p.kind === 'not_official' && hostOf(p.url) === domain));
  list.push(entry);
  const found = list.some((p) => p.source_id || p.import_batch_id);
  const { error: uErr } = await db.from('city_onboarding').update({
    proposed_sources: list,
    status: fresh?.status === 'active' ? 'active' : found ? 'proposed' : fresh?.status,
    notes: [fresh?.notes ?? '', `Marked official on ${stamp} UTC. ${note}`].filter(Boolean).join('\n'),
  }).eq('id', cityId);
  if (uErr) throw new Error(uErr.message);
  return entry;
}

async function runJob(db: any) {
  const { data: cities, error } = await db.rpc('claim_cities_for_discovery', { _limit: 3 });
  if (error) throw new Error(error.message);
  const results = [];
  for (const c of cities ?? []) results.push(await discoverCity(db, c));
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const isCron = !!CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET;
  if (!isCron) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: u } = await db.auth.getUser(token ?? '');
    if (!u?.user) return json({ error: 'Please sign in.' }, 401);
    const { data: ok } = await db.rpc('is_admin', { _user_id: u.user.id });
    if (!ok) return json({ error: 'Only admins can run the city search.' }, 403);
    const body = await req.json().catch(() => ({}));
    const m = body?.mark_official;
    if (m) {
      if (typeof m.city_id !== 'string' || typeof m.url !== 'string' || !/^https?:\/\//.test(m.url) || m.url.length > 2000)
        return json({ error: 'That request is missing the city or the web address.' }, 400);
      const label = typeof m.label === 'string' ? m.label.slice(0, 200) : 'Official page';
      // @ts-ignore EdgeRuntime is available in the Supabase runtime
      EdgeRuntime.waitUntil(markOfficial(db, u.user.id, m.city_id, m.url, label)
        .then((r) => console.log('mark-official done', JSON.stringify(r).slice(0, 2000)))
        .catch((e) => console.error('mark-official failed', (e as Error).message)));
      return json({ started: true, message: `${hostOf(m.url)} is now on the official list. We are checking that page now. This takes a minute or two.` });
    }
  }
  const { count } = await db.from('city_onboarding').select('id', { count: 'exact', head: true }).eq('status', 'requested');
  if (!count) return json({ started: false, message: 'No cities are waiting for a search.' });
  // @ts-ignore EdgeRuntime is available in the Supabase runtime
  EdgeRuntime.waitUntil(runJob(db).then((r) => console.log('city-discovery done', JSON.stringify(r).slice(0, 4000)))
    .catch((e) => console.error('city-discovery failed', e)));
  return json({ started: true, waiting: count, message: `Searching for up to ${Math.min(count, 3)} ${count === 1 ? 'city' : 'cities'} now. This takes a few minutes.` });
});
