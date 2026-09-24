INSERT INTO public.elections (jurisdiction, election_date, type, registration_deadline, early_voting_start, early_voting_end, absentee_deadline, description)
SELECT * FROM (VALUES
 ('Missouri', DATE '2026-11-03', 'general', DATE '2026-10-07', DATE '2026-10-20', DATE '2026-11-02', DATE '2026-10-21', 'Missouri General Election. Polls open 6am–7pm. No-excuse in-person absentee voting runs Oct 20–Nov 2. Photo ID required.'),
 ('Kansas', DATE '2026-11-03', 'general', DATE '2026-10-13', DATE '2026-10-14', DATE '2026-11-02', DATE '2026-10-27', 'Kansas General Election. Polls open 7am–7pm. Advance in-person voting ends noon Nov 2. Photo ID required.')
) v(j,d,t,r,es,ee,a,descr)
WHERE NOT EXISTS (SELECT 1 FROM public.elections e WHERE e.jurisdiction=v.j AND e.election_date=v.d);