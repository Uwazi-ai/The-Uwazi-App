
ALTER TABLE public.race_candidates
  ADD COLUMN bio text,
  ADD COLUMN website_url text,
  ADD COLUMN positions jsonb,
  ADD COLUMN prior_office text,
  ADD COLUMN last_election_pct numeric;
