// Public nationwide ballot lookup for the Nov 3, 2026 general election.
// Calls Google Civic voterinfo and returns data exactly as given, with
// attribution. The address is never logged or stored. Results are cached
// in this function's memory for at most 24 hours.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { keyedHash, underLimit } from '../_shared/public-rate.ts';

const ELECTION_ID = '12000'; // "2026 General Midterm Election", 2026-11-03
const ELECTION_DATE = '2026-11-03';
const TTL_MS = 24 * 60 * 60 * 1000;
const SOURCE = 'Voting Information Project via Google';
const cache = new Map<string, { at: number; data: any }>();

const Body = z.object({
  address: z.string().trim().min(5).max(200).optional(),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
  zip: z.string().trim().regex(/^\d{5}$/).optional(),
}).refine((b) => b.address || b.state, { message: 'Address or state is required' });

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function site(s: any) {
  const a = s?.address ?? {};
  return {
    name: a.locationName || s?.name || null,
    address: [a.line1, a.line2, a.line3, a.city, a.state, a.zip].filter(Boolean).join(', ') || null,
    hours: s?.pollingHours || null,
    notes: s?.notes || null,
    startDate: s?.startDate || null,
    endDate: s?.endDate || null,
  };
}
function contest(c: any) {
  return {
    type: c.type ?? null,
    office: c.office ?? null,
    district: c.district?.name ?? null,
    candidates: (c.candidates ?? []).map((k: any) => ({ name: k.name ?? null, party: k.party ?? null })),
    referendumTitle: c.referendumTitle ?? null,
    referendumSubtitle: c.referendumSubtitle ?? null,
    referendumText: c.referendumText ?? null,
    referendumUrl: c.referendumUrl ?? null,
  };
}
function phoneOf(body: any): string | null {
  for (const o of body?.electionOfficials ?? []) if (o?.officePhoneNumber) return o.officePhoneNumber;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: 'Enter a street address, or pick a state.' }, 400);
    if (!(await underLimit(db, 'ballot-lookup', req, 20, 10))) return json({ error: 'Too many lookups. Try again in a few minutes.', code: 'rate_limited' }, 429);

    const { address, zip } = parsed.data;
    let state = parsed.data.state ?? null;
    let google: any = null;
    let status: 'ok' | 'no_data' | 'state_only' = 'state_only';

    if (address) {
      const ck = await keyedHash(`addr:${address.toLowerCase().replace(/\s+/g, ' ')}`);
      const hit = cache.get(ck);
      if (hit && Date.now() - hit.at < TTL_MS) google = hit.data;
      else {
        const key = Deno.env.get('GOOGLE_CIVIC_API_KEY');
        if (key) {
          const qs = new URLSearchParams({ address, electionId: ELECTION_ID, key });
          const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
          try {
            const r = await fetch(`https://www.googleapis.com/civicinfo/v2/voterinfo?${qs}`, { signal: ctl.signal });
            if (r.ok) { google = await r.json(); cache.set(ck, { at: Date.now(), data: google }); }
            else console.warn('voterinfo not ok', r.status);
          } catch (_) { console.warn('voterinfo failed'); } finally { clearTimeout(t); }
        }
      }
      status = google ? 'ok' : 'no_data';
      if (google?.normalizedInput?.state) state = String(google.normalizedInput.state).toUpperCase();
    }

    const { data: link } = state
      ? await db.from('state_election_links').select('state_name, website_url, check_url, sample_ballot_url, phone').eq('state_code', state).maybeSingle()
      : { data: null };
    const { count: verified } = state
      ? await db.from('ballot_contests').select('id', { count: 'exact', head: true }).eq('state', state).eq('election_date', ELECTION_DATE).eq('verification_status', 'verified')
      : { count: 0 };

    const sb = google?.state?.[0]?.electionAdministrationBody ?? {};
    const lb = google?.state?.[0]?.local_jurisdiction?.electionAdministrationBody ?? {};
    const all = (k: string) => (google?.[k] ?? []) as any[];

    return json({
      status,
      state,
      zip: zip ?? null,
      election: { name: google?.election?.name ?? '2026 General Election', date: ELECTION_DATE },
      officialBallotUrl: sb.ballotInfoUrl || link?.sample_ballot_url || link?.check_url || link?.website_url || null,
      officialBallotFrom: sb.ballotInfoUrl ? 'google' : 'state_table',
      stateLinks: link ?? null,
      electionInfoUrl: sb.electionInfoUrl ?? null,
      votingLocationFinderUrl: sb.votingLocationFinderUrl ?? null,
      office: {
        name: lb.name || sb.name || (link ? `${link.state_name} election office` : null),
        phone: phoneOf(lb) || phoneOf(sb) || link?.phone || null,
        url: lb.electionInfoUrl || sb.electionInfoUrl || link?.website_url || null,
      },
      pollingLocations: all('pollingLocations').slice(0, 5).map(site),
      pollingTotal: all('pollingLocations').length,
      earlyVoteSites: all('earlyVoteSites').slice(0, 5).map(site),
      earlyTotal: all('earlyVoteSites').length,
      dropOffLocations: all('dropOffLocations').slice(0, 5).map(site),
      dropOffTotal: all('dropOffLocations').length,
      contests: all('contests').map(contest),
      hasVerifiedUwaziContests: (verified ?? 0) > 0,
      attribution: google ? SOURCE : null,
    });
  } catch (_e) {
    console.error('ballot-lookup error');
    return json({ error: 'Lookup failed. Use your state link below.' }, 500);
  }
});
