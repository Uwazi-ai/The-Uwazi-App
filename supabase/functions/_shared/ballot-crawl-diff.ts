// Pure diff logic for the ballot crawler. No network, no database.
// Findings are proposals only; nothing here writes live ballot rows.

export const OFFICIAL_DOMAINS = [
  'kceb.org', 'sos.mo.gov', 'casscounty.com', 'jcebmo.org', 'jacksongov.org',
  'voteclaycountymo.gov', 'claycountymo.gov', 'plattecountymovotes.gov', 'co.platte.mo.us',
];

export function hostOf(url: string | null | undefined): string {
  try { return new URL(url ?? '').hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}
export function isOfficialUrl(url: string | null | undefined): boolean {
  const h = hostOf(url);
  return !!h && OFFICIAL_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`));
}

export type LiveCandidate = { id: string; name: string; party: string | null; is_incumbent: boolean; sort_order: number | null };
export type LiveContest = {
  id: string; contest_type: string; office_name: string | null; measure_title: string | null;
  district_type: string | null; district_id: string | null; source_name: string | null; source_url: string | null;
  yes_means: string | null; no_means: string | null; plain_summary: string | null; measure_summary: string | null;
  verification_status: string; candidates: LiveCandidate[];
};
export type StagedCandidate = { name: string; party: string | null; printed_order: number };
export type StagedContest = {
  id: string; source_name: string; source_url: string; contest_type: 'candidate_race' | 'ballot_measure' | 'retention';
  title: string; district: string | null; ballot_question: string | null; yes_statement: string | null; no_statement: string | null;
  candidates: StagedCandidate[]; jurisdiction?: string | null;
};
export type Finding = {
  finding_key: string; finding_type: string; summary: string; contest_id: string | null;
  related_contest_ids: string[]; staged_contest_id: string | null; proposed: Record<string, unknown>; safe: boolean;
};

export const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const nameKey = (s: string) => norm(s).replace(/\b(jr|sr|ii|iii|iv)\b/g, '').replace(/\s+/g, ' ').trim();
export const sameName = (a: string, b: string) => {
  const x = nameKey(a).split(' ').filter((t) => t.length > 1), y = nameKey(b).split(' ').filter((t) => t.length > 1);
  if (!x.length || !y.length) return false;
  return x[0] === y[0] && x[x.length - 1] === y[y.length - 1];
};
export const partyKey = (p: string | null | undefined) => {
  const n = norm(p);
  if (!n) return '';
  if (n === 'd' || n.startsWith('dem')) return 'democratic';
  if (n === 'r' || n.startsWith('rep')) return 'republican';
  if (n === 'l' || n.startsWith('lib')) return 'libertarian';
  if (n === 'g' || n.startsWith('gre')) return 'green';
  if (n.startsWith('ind')) return 'independent';
  if (n.startsWith('const')) return 'constitution';
  return n;
};
const isWriteIn = (name: string) => /^write[\s-]*in/i.test(name.trim());

function scopeOf(t: string): string {
  if (/jackson county/.test(t)) return 'jackson';
  if (/clay county/.test(t)) return 'clay';
  if (/platte county/.test(t)) return 'platte';
  if (/cass county/.test(t)) return 'cass';
  if (/kansas city|city of/.test(t)) return 'kc';
  return 'state';
}
const NUM_WORDS: Record<string, string> = { first: '1', second: '2', third: '3', fourth: '4', fifth: '5', sixth: '6', seventh: '7', eighth: '8' };
function districtNum(t: string, fallback?: string | null): string | null {
  const m = t.match(/district\s*(?:no\s*)?(\d+)/) ?? t.match(/(\d+)(?:st|nd|rd|th)?\s*(?:congressional\s*)?district/);
  if (m) return m[1];
  const w = t.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\b/);
  if (w) return NUM_WORDS[w[1]];
  return fallback && /^\d+$/.test(fallback) ? fallback : null;
}
const JUDGE_STOP = new Set(['of', 'the', 'missouri', 'supreme', 'court', 'circuit', 'appeals', 'appeal', 'division', 'be', 'retained', 'western', 'district', 'judge', 'associate', 'in', 'office', 'shall']);

/** Canonical key that lets one contest from two sources be matched. */
export function contestKey(title: string, opts: { district?: string | null; isMeasure?: boolean } = {}): string {
  const t = norm(title);
  if (/\bretain|retention\b/.test(t) && /judge/.test(t)) {
    let name: string[] = [];
    for (const after of t.split(/\bjudge\b/).slice(1)) {
      const toks: string[] = [];
      for (const w of after.split(' ').filter(Boolean)) { if (JUDGE_STOP.has(w)) break; toks.push(w); }
      name = toks.filter((x) => !/^(i|ii|iii|iv|jr|sr)$/.test(x) && x.length > 1);
      if (name.length) break;
    }
    return `retain:${name[name.length - 1] ?? t}`;
  }
  const am = t.match(/\bamendment\s*(?:no\s*)?(\d+)/) ?? t.match(/\b(\d+)\s*amendment\b/);
  if (am) return `${scopeOf(t)}:amendment-${am[1]}`;
  const pr = t.match(/\bproposition\s*([a-z0-9]+)\b/);
  if (pr) return `${scopeOf(t)}:prop-${pr[1]}`;
  const q = t.match(/\bquestion\s*(?:no\s*)?([a-z0-9]+)\b/);
  if (q) return `${scopeOf(t)}:question-${q[1]}`;
  if (/(u s|us|united states)\s*(house|representative)|congress/.test(t)) return `us-house-${districtNum(t, opts.district) ?? '?'}`;
  if (/state auditor/.test(t)) return 'state-auditor';
  if (/state representative|state house/.test(t)) return `mo-house-${districtNum(t, opts.district) ?? '?'}`;
  if (/state senator|state senate/.test(t)) return `mo-senate-${districtNum(t, opts.district) ?? '?'}`;
  if (/county legislat/.test(t)) {
    const al = t.match(/(\d+)(?:st|nd|rd|th)?\s*at large/) ?? t.match(/at large\s*(?:district\s*)?(\d+)/);
    const sc = scopeOf(t) === 'state' ? 'jackson' : scopeOf(t);
    if (/at large/.test(t)) return `${sc}-leg-at-large-${al?.[1] ?? '?'}`;
    return `${sc}-leg-${districtNum(t, opts.district) ?? '?'}`;
  }
  const STOP = new Set(['missouri', 'the', 'for', 'of', 'vote', 'one', 'no', 'mo']);
  return [...new Set(t.split(' ').filter((w) => w && !STOP.has(w)))].sort().join(' ');
}

export const liveTitle = (c: LiveContest) => (c.office_name || c.measure_title || '').trim();
export function liveKey(c: LiveContest): string {
  const d = c.district_type === 'us_house' || c.district_type === 'mo_house' || c.district_type === 'jackson_leg' ? c.district_id : null;
  return contestKey(liveTitle(c), { district: d });
}
export function stagedKey(s: StagedContest): string {
  const t = s.title.trim();
  const j = s.jurisdiction?.trim();
  const local = j && !norm(t).includes(norm(j)) && !/amendment|proposition|retain|u\.?s\.?|united states|congress|state (auditor|representative|senator)/i.test(t);
  const extra = s.contest_type === 'retention' ? ` ${s.ballot_question ?? ''}` : '';
  return contestKey(`${local ? `${j} ` : ''}${t} ${s.district ?? ''}${extra}`.trim());
}
const isRetention = (c: LiveContest) => /^retain\b/i.test(liveTitle(c));
const isVisible = (c: LiveContest) => c.verification_status !== 'flagged';

const PARTISAN = /\b(democrat\w*|republican\w*|gop|liberal\w*|conservative\w*|progressive\w*|\w+[- ]leaning|dismantl\w*|radical\w*|extrem\w*|far[- ](left|right)|partisan\w*|gerrymander\w*)\b/i;

export function excerpt(text: string, idx: number, len = 60) {
  const start = Math.max(0, idx - len), end = Math.min(text.length, idx + len);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

export function diffBallot(live: LiveContest[], staged: StagedContest[]): Finding[] {
  const out: Finding[] = [];
  const add = (f: Finding) => { if (!out.some((x) => x.finding_key === f.finding_key)) out.push(f); };
  const visible = live.filter(isVisible);

  const stagedByKey = new Map<string, StagedContest>();
  for (const s of staged) if (!stagedByKey.has(stagedKey(s))) stagedByKey.set(stagedKey(s), s);

  // 1. Duplicates and incumbent conflicts.
  const groups = new Map<string, LiveContest[]>();
  for (const c of visible) { const k = liveKey(c); groups.set(k, [...(groups.get(k) ?? []), c]); }
  for (const [k, g] of groups) {
    if (g.length < 2) continue;
    const official = g.filter((c) => isOfficialUrl(c.source_url));
    const keeper = official[0];
    for (const c of g) {
      if (keeper && c.id === keeper.id) continue;
      const others = g.filter((x) => x.id !== c.id).map((x) => x.id);
      if (keeper && !isOfficialUrl(c.source_url)) {
        add({ finding_key: `dup:${c.id}`, finding_type: 'duplicate_contest',
          summary: `"${liveTitle(c)}" from ${c.source_name ?? 'unknown'} duplicates the official "${liveTitle(keeper)}" from ${keeper.source_name}.`,
          contest_id: c.id, related_contest_ids: others, staged_contest_id: null,
          proposed: { action: 'hide_contest', official_contest_id: keeper.id }, safe: true });
      } else {
        add({ finding_key: `dup:${c.id}`, finding_type: 'duplicate_contest',
          summary: `"${liveTitle(c)}" from ${c.source_name ?? 'unknown'} appears more than once and no single official entry was found to keep.`,
          contest_id: c.id, related_contest_ids: others, staged_contest_id: null, proposed: { action: 'acknowledge' }, safe: false });
      }
    }
    const seen = new Set<string>();
    for (const a of g) for (const cand of a.candidates) {
      if (isWriteIn(cand.name)) continue;
      const nk = nameKey(cand.name);
      if (seen.has(nk)) continue;
      const flags = g.flatMap((b) => b.candidates.filter((x) => sameName(x.name, cand.name)).map((x) => ({ contest: b, inc: x.is_incumbent })));
      if (new Set(flags.map((f) => f.inc)).size > 1) {
        seen.add(nk);
        add({ finding_key: `inc:${k}:${nk}`, finding_type: 'incumbent_conflict',
          summary: `${cand.name} is marked incumbent in ${flags.filter((f) => f.inc).map((f) => f.contest.source_name).join(', ')} but not in ${flags.filter((f) => !f.inc).map((f) => f.contest.source_name).join(', ')}.`,
          contest_id: a.id, related_contest_ids: g.map((x) => x.id).filter((x) => x !== a.id), staged_contest_id: null,
          proposed: { action: 'acknowledge' }, safe: false });
      }
    }
  }

  for (const c of visible) {
    const s = stagedByKey.get(liveKey(c));
    // 2. Empty titles on candidate races.
    if (c.contest_type === 'candidate_race' && !(c.measure_title ?? '').trim()) {
      add({ finding_key: `title:${c.id}`, finding_type: 'empty_title',
        summary: s ? `"${c.office_name}" has an empty title. The official ballot prints "${s.title}".`
          : `"${c.office_name}" has an empty title. No official ballot match was found.`,
        contest_id: c.id, related_contest_ids: [], staged_contest_id: s?.id ?? null,
        proposed: { action: 'set_title', title: s ? s.title : c.office_name }, safe: !!s });
    }
    // 3. Secondary sources.
    if (!isOfficialUrl(c.source_url)) {
      add({ finding_key: `sec:${c.id}`, finding_type: 'secondary_source',
        summary: `"${liveTitle(c)}" comes only from ${c.source_name ?? hostOf(c.source_url)}${s ? `. The official ballot from ${s.source_name} has it.` : '. No official ballot match was found.'}`,
        contest_id: c.id, related_contest_ids: [], staged_contest_id: s?.id ?? null, proposed: { action: 'acknowledge' }, safe: false });
    }
    // 4. Official yes and no statements.
    if (c.contest_type !== 'candidate_race' && !isRetention(c)) {
      const empty = !(c.yes_means ?? '').trim() && !(c.no_means ?? '').trim();
      const offYes = s?.yes_statement?.trim(), offNo = s?.no_statement?.trim();
      if (empty) {
        add({ finding_key: `yesno:${c.id}`, finding_type: 'missing_yes_no',
          summary: offYes && offNo ? `"${liveTitle(c)}" has no yes and no statements. ${s!.source_name} publishes them.`
            : `"${liveTitle(c)}" has no yes and no statements. No official statement was found.`,
          contest_id: c.id, related_contest_ids: [], staged_contest_id: s?.id ?? null,
          proposed: offYes && offNo ? { action: 'set_yes_no', yes: offYes, no: offNo } : { action: 'acknowledge' }, safe: !!(offYes && offNo) });
      } else if (offYes && offNo && (norm(offYes) !== norm(c.yes_means) || norm(offNo) !== norm(c.no_means))) {
        add({ finding_key: `yesnodiff:${c.id}`, finding_type: 'yes_no_differs',
          summary: `"${liveTitle(c)}" yes and no statements differ from the official text from ${s!.source_name}.`,
          contest_id: c.id, related_contest_ids: [], staged_contest_id: s!.id,
          proposed: { action: 'set_yes_no', yes: offYes, no: offNo, old_yes: c.yes_means, old_no: c.no_means }, safe: false });
      }
    }
    // 6. Candidate differences against the official ballot.
    if (s && c.contest_type === 'candidate_race' && isOfficialUrl(s.source_url) && (isOfficialUrl(c.source_url) || !groups.get(liveKey(c))?.some((x) => x.id !== c.id && isOfficialUrl(x.source_url)))) {
      for (const sc of s.candidates) {
        if (isWriteIn(sc.name)) continue;
        const m = c.candidates.find((x) => sameName(x.name, sc.name));
        if (!m) {
          add({ finding_key: `cand:${c.id}:${nameKey(sc.name)}`, finding_type: 'candidate_missing',
            summary: `${sc.name}${sc.party ? ` (${sc.party})` : ''} is on the official ballot for "${s.title}" but not in the app.`,
            contest_id: c.id, related_contest_ids: [], staged_contest_id: s.id,
            proposed: { action: 'add_candidate', name: sc.name, party: sc.party, sort_order: sc.printed_order, source_url: s.source_url }, safe: false });
        } else if (sc.party && partyKey(sc.party) !== partyKey(m.party)) {
          add({ finding_key: `party:${m.id}:${partyKey(sc.party)}`, finding_type: 'party_differs',
            summary: `${m.name} shows "${m.party ?? 'no party'}" in the app. The official ballot prints "${sc.party}".`,
            contest_id: c.id, related_contest_ids: [], staged_contest_id: s.id,
            proposed: { action: 'set_party', candidate_id: m.id, party: sc.party, old_party: m.party }, safe: false });
        }
      }
    }
    // 7. Neutrality review. Flag only.
    for (const [field, text] of [['plain_summary', c.plain_summary], ['measure_summary', c.measure_summary]] as const) {
      if (!text) continue;
      const m = PARTISAN.exec(text);
      if (m) {
        add({ finding_key: `neutral:${c.id}:${field}`, finding_type: 'neutrality_review',
          summary: `"${liveTitle(c)}" ${field === 'plain_summary' ? 'plain summary' : 'summary'} may not be neutral: "${excerpt(text, m.index)}"`,
          contest_id: c.id, related_contest_ids: [], staged_contest_id: null, proposed: { action: 'acknowledge', field }, safe: false });
      }
    }
  }

  // 5. Official contests the app is missing.
  const liveKeys = new Set(live.map(liveKey));
  for (const [k, s] of stagedByKey) {
    if (liveKeys.has(k) || !isOfficialUrl(s.source_url)) continue;
    add({ finding_key: `missing:${k}`, finding_type: 'missing_contest',
      summary: `"${s.title}"${s.district ? `, ${s.district}` : ''} is on the official ballot from ${s.source_name} but not in the app.`,
      contest_id: null, related_contest_ids: [], staged_contest_id: s.id,
      proposed: { action: 'insert_contest', contest_type: s.contest_type, title: s.title, ballot_question: s.ballot_question,
        yes: s.yes_statement, no: s.no_statement, source_name: s.source_name, source_url: s.source_url,
        candidates: s.candidates.filter((x) => !isWriteIn(x.name)).map((x) => ({ name: x.name, party: x.party })) }, safe: false });
  }
  return out;
}
