ALTER TABLE public.ballot_contests
  ADD COLUMN IF NOT EXISTS office_name text,
  ADD COLUMN IF NOT EXISTS party text,
  ADD COLUMN IF NOT EXISTS district_type text,
  ADD COLUMN IF NOT EXISTS district_id text,
  ADD COLUMN IF NOT EXISTS vote_for integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fiscal_note text,
  ADD COLUMN IF NOT EXISTS authority_key text,
  ADD COLUMN IF NOT EXISTS status_note text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'verified';

ALTER TABLE public.ballot_contests
  ADD CONSTRAINT ballot_contests_verification_status_chk
  CHECK (verification_status IN ('verified','unverified','needs_review'));

CREATE UNIQUE INDEX IF NOT EXISTS ballot_contests_unique_contest
  ON public.ballot_contests (
    election_date, state,
    coalesce(party,''), coalesce(district_type,''), coalesce(district_id,''),
    coalesce(office_name, measure_title)
  );

CREATE INDEX IF NOT EXISTS ballot_contests_district_idx
  ON public.ballot_contests (state, election_date, district_type, district_id);