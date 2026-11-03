import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { contestKey, diffBallot, isOfficialUrl, type LiveContest, type StagedContest } from './ballot-crawl-diff.ts';

const live = (o: Partial<LiveContest>): LiveContest => ({
  id: crypto.randomUUID(), contest_type: 'candidate_race', office_name: null, measure_title: null, district_type: null, district_id: null,
  source_name: 'x', source_url: 'https://www.kceb.org', yes_means: null, no_means: null, plain_summary: null, measure_summary: null,
  verification_status: 'verified', candidates: [], ...o,
});
const staged = (o: Partial<StagedContest>): StagedContest => ({
  id: crypto.randomUUID(), source_name: 'KCEB', source_url: 'https://kceb.org/sample', contest_type: 'candidate_race', title: '',
  district: null, ballot_question: null, yes_statement: null, no_statement: null, candidates: [], ...o,
});

Deno.test('keys match the same contest from two sources', () => {
  assertEquals(contestKey('U.S. House of Representatives, Missouri District 5'), contestKey('U.S. Representative, 5th District'));
  assertEquals(contestKey('Missouri State Auditor'), contestKey('State Auditor'));
  assertEquals(contestKey('Retain Judge Paul C. Wilson — Missouri Supreme Court'), contestKey('Shall Judge Paul C. Wilson of the Supreme Court be retained in office?'));
  assertEquals(contestKey('Constitutional Amendment No. 3'), 'state:amendment-3');
});

Deno.test('only official election authority domains count as official', () => {
  assertEquals(isOfficialUrl('https://www.kceb.org'), true);
  assertEquals(isOfficialUrl('https://www.sos.mo.gov/x'), true);
  assertEquals(isOfficialUrl('https://www.kcur.org/x'), false);
  assertEquals(isOfficialUrl('https://www.voteclaycountymo.gov/x'), true);
  assertEquals(isOfficialUrl('https://theballotbrief.com/state/missouri'), false);
  assertEquals(isOfficialUrl('https://ballotpedia.org/x'), false);
});

Deno.test('secondary duplicate gets a safe hide, official stays, incumbent conflict flagged', () => {
  const off = live({ office_name: 'State Auditor', measure_title: 'State Auditor', candidates: [{ id: 'a', name: 'Scott Fitzpatrick', party: 'Republican', is_incumbent: false, sort_order: 1 }] });
  const sec = live({ office_name: 'Missouri State Auditor', source_name: 'Ballotpedia', source_url: 'https://ballotpedia.org/x',
    candidates: [{ id: 'b', name: 'Scott Fitzpatrick', party: 'Republican', is_incumbent: true, sort_order: 1 }] });
  const f = diffBallot([off, sec], []);
  const dup = f.filter((x) => x.finding_type === 'duplicate_contest');
  assertEquals(dup.length, 1);
  assertEquals(dup[0].contest_id, sec.id);
  assertEquals(dup[0].safe, true);
  assertEquals(dup[0].proposed.action, 'hide_contest');
  assertEquals(f.filter((x) => x.finding_type === 'incumbent_conflict').length, 1);
});

Deno.test('empty title fills from official ballot only when matched', () => {
  const c = live({ office_name: 'Clay County Presiding Commissioner', district_type: 'county', district_id: '29047', source_url: 'https://theballotbrief.com/x' });
  const s = staged({ title: 'Presiding Commissioner', jurisdiction: 'Clay County', source_url: 'https://www.claycoelections.com/b.pdf' });
  const withMatch = diffBallot([c], [s]).find((x) => x.finding_type === 'empty_title')!;
  assertEquals(withMatch.safe, true);
  assertEquals(withMatch.proposed.title, 'Presiding Commissioner');
  const noMatch = diffBallot([c], []).find((x) => x.finding_type === 'empty_title')!;
  assertEquals(noMatch.safe, false);
});

Deno.test('yes and no statements are safe only when empty and official', () => {
  const c = live({ contest_type: 'ballot_measure', measure_title: 'Amendment 7' });
  const s = staged({ contest_type: 'ballot_measure', title: 'Amendment 7', source_url: 'https://www.sos.mo.gov/m', yes_statement: 'A "yes" vote will A.', no_statement: 'A "no" vote will B.' });
  const f = diffBallot([c], [s]).find((x) => x.finding_type === 'missing_yes_no')!;
  assertEquals(f.safe, true);
  assertEquals(f.proposed.action, 'set_yes_no');
  const none = diffBallot([c], []).find((x) => x.finding_type === 'missing_yes_no')!;
  assertEquals(none.safe, false);
});

Deno.test('partisan wording is flagged, never rewritten', () => {
  const c = live({ contest_type: 'ballot_measure', measure_title: 'Proposition A', plain_summary: 'The law dismantled the Democratic leaning 5th District.' });
  const f = diffBallot([c], []).find((x) => x.finding_type === 'neutrality_review')!;
  assertEquals(f.proposed.action, 'acknowledge');
  assertEquals(f.safe, false);
});

Deno.test('official contest missing from the app is a non-safe insert', () => {
  const s = staged({ contest_type: 'ballot_measure', title: 'Jackson County Question 1', source_url: 'https://kceb.org/s' });
  const f = diffBallot([], [s]).find((x) => x.finding_type === 'missing_contest')!;
  assertEquals(f.safe, false);
  assertEquals(f.proposed.action, 'insert_contest');
});

Deno.test('findings never propose supporters or opponents text', () => {
  const c = live({ contest_type: 'ballot_measure', measure_title: 'Amendment 3', plain_summary: 'Republican plan.' });
  for (const f of diffBallot([c], [])) assertEquals(JSON.stringify(f.proposed).includes('supporters'), false);
});

Deno.test('jumbled PDF headings, at-large seats and county offices still match', () => {
  assertEquals(contestKey('CONSTITUTIONAL 3 AMENDMENT NO.'), contestKey('Constitutional Amendment 3'));
  assertEquals(contestKey('County Legislator, 2nd At-Large') === contestKey('County Legislator, 3rd At-Large'), false);
  assertEquals(contestKey('For County Executive - Jackson County Jackson County'), contestKey('Jackson County Executive'));
  assertEquals(contestKey('Cass County FOR COUNTY AUDITOR'), contestKey('Cass County Auditor'));
});

Deno.test('retention keys use the judge name from the question', () => {
  assertEquals(contestKey('MISSOURI COURT OF APPEALS JUDGE, WESTERN DISTRICT Lisa White Hardwick Shall Judge Lisa White Hardwick of the Missouri Court of Appeals be retained in office?'),
    contestKey('Retain Judge Lisa White Hardwick — Court of Appeals, Western District'));
  assertEquals(contestKey('Retain Judge Kenneth R. Garrett, III — Circuit Judge, Division 1'), 'retain:garrett');
});

Deno.test('SOS parser reads only the Nov 3 section, never the Aug 4 primary measures', async () => {
  const { sosNovemberSection } = await import('./ballot-crawl-diff.ts');
  const page = 'Home 2026 Ballot Measures The following ballot measures have been certified for the November 3, 2026 general election. ' +
    'Official Ballot Title Amendment 3 text. Official Ballot Title Amendment 6 text. Official Ballot Title Amendment 7 text. ' +
    'Official Ballot Title Amendment 8 text. Proposition A text. ' +
    'The following ballot measures appeared on the ballot at the August 4, 2026 primary election. ' +
    'Official Ballot Title Amendment 1 text. Amendment 2 text. Amendment 4 text. Amendment 5 text.';
  const nov = sosNovemberSection(page)!;
  for (const m of ['Amendment 3', 'Amendment 6', 'Amendment 7', 'Amendment 8', 'Proposition A']) assertEquals(nov.includes(m), true, m);
  for (const m of ['Amendment 1 ', 'Amendment 2 ', 'Amendment 4 ', 'Amendment 5 ', 'August 4']) assertEquals(nov.includes(m), false, m);
  assertEquals(sosNovemberSection('The following measures appeared at the August 4, 2026 primary election. Amendment 1.'), null);
});
