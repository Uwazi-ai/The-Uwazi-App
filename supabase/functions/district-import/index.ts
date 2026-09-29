// Import district boundaries from an official GeoJSON file.
// Admin only. Rows land turned off until an admin turns the batch on.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const TYPES = ['council', 'commission', 'school_board', 'ward'];

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function readWithFirecrawl(url: string): Promise<string> {
  if (!LOVABLE_API_KEY || !FIRECRAWL_API_KEY) throw new Error('The web reading service is not set up.');
  const res = await fetch('https://connector-gateway.lovable.dev/firecrawl/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': FIRECRAWL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['rawHtml'], onlyMainContent: false, waitFor: 3000 }),
    signal: AbortSignal.timeout(120000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`The web reading service failed [${res.status}]: ${body.slice(0, 300)}`);
  let data: any = {};
  try { data = JSON.parse(body); } catch { /* empty */ }
  const raw = data.rawHtml ?? data.data?.rawHtml ?? data.markdown ?? data.data?.markdown ?? '';
  return String(raw);
}

function parseGeoJson(text: string): any {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* keep going */ }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error('That file is not map data we can read.');
}

const CODE_KEYS = [/^district$/i, /district.*(num|no|id|code)/i, /^(council|ward|precinct)(_?(num|no|id|code))?$/i, /^(coun_dist|councildist|dist)$/i];
const NAME_KEYS = [/^name$/i, /district.*name/i, /^label$/i, /^title$/i, /council.*member/i, /^rep$/i];

function pickProp(props: Record<string, any>, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const key = Object.keys(props).find((k) => p.test(k));
    if (key != null && props[key] != null && String(props[key]).trim() !== '') return String(props[key]).trim();
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Please sign in.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims) return json({ error: 'Please sign in.' }, 401);

    const body = await req.json().catch(() => ({}));
    const geojsonUrl = String(body.geojson_url ?? '').trim();
    const districtType = String(body.district_type ?? '').trim();
    const jurisdictionGeoid = String(body.jurisdiction_geoid ?? '').trim();
    const sourceUrl = String(body.source_url ?? '').trim();

    if (!/^https?:\/\//i.test(geojsonUrl)) return json({ error: 'Add the full web address of the map file.' }, 400);
    if (!TYPES.includes(districtType)) return json({ error: 'Pick a district type we support.' }, 400);
    if (!/^https?:\/\//i.test(sourceUrl)) return json({ error: 'Add the full web address of the official page.' }, 400);

    let readMethod = 'fetch';
    let text = '';
    try {
      const res = await fetch(geojsonUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (UWAZI district import; +https://uwaziapp.uwazi.ai)', Accept: 'application/json' },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
      if (!text.trim().startsWith('{')) throw new Error('Not map data');
    } catch (_e) {
      readMethod = 'firecrawl';
      text = await readWithFirecrawl(geojsonUrl);
    }

    const geo = parseGeoJson(text);
    const features: any[] = geo.type === 'FeatureCollection' ? geo.features ?? [] : geo.type === 'Feature' ? [geo] : [];
    if (!features.length) return json({ error: 'We did not find any districts in that file.' }, 400);

    const batch = crypto.randomUUID();
    const names: string[] = [];
    const skipped: string[] = [];
    let saved = 0;

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const props: Record<string, any> = f.properties ?? {};
      const code = pickProp(props, CODE_KEYS) ?? String(i + 1);
      const name = pickProp(props, NAME_KEYS) ?? `District ${code}`;
      if (!f.geometry) { skipped.push(name); continue; }
      const { error } = await userClient.rpc('import_district_boundary', {
        _jurisdiction_geoid: jurisdictionGeoid || null,
        _district_type: districtType,
        _district_code: code,
        _name: name,
        _geojson: f.geometry,
        _source_url: sourceUrl,
        _batch: batch,
      });
      if (error) { skipped.push(`${name}: ${error.message}`); continue; }
      names.push(`${code}. ${name}`);
      saved++;
    }

    if (!saved) return json({ error: 'We could not save any districts from that file.', skipped }, 400);

    return json({ import_batch_id: batch, saved, names, skipped, read_method: readMethod });
  } catch (err) {
    console.error('district-import error', err);
    return json({ error: err instanceof Error ? err.message : 'Something went wrong.' }, 500);
  }
});
