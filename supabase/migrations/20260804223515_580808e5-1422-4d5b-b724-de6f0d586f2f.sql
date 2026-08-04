REVOKE SELECT ON public.ballot_contests FROM anon, authenticated;

GRANT SELECT (id, state, election_date, contest_type, sort_order, measure_title, measure_summary, plain_summary, yes_means, no_means, supporters_say, opponents_say, measure_full_text_url, source_name, source_url, created_at, updated_at, office_name, party, district_type, district_id, vote_for, fiscal_note, authority_key, status_note, verification_status, verified_at, review_note)
ON public.ballot_contests TO anon, authenticated;

GRANT ALL ON public.ballot_contests TO service_role;