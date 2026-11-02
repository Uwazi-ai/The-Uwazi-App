ALTER TABLE public.ballot_contests
  ADD COLUMN IF NOT EXISTS scope_level text,
  ADD COLUMN IF NOT EXISTS scope_counties text[],
  ADD COLUMN IF NOT EXISTS scope_district_type text,
  ADD COLUMN IF NOT EXISTS scope_district_id text,
  ADD COLUMN IF NOT EXISTS scope_note text;
ALTER TABLE public.ballot_contests ADD CONSTRAINT ballot_contests_scope_level_chk
  CHECK (scope_level IS NULL OR scope_level IN ('statewide','county','district'));
ALTER TABLE public.ballot_contests ADD CONSTRAINT ballot_contests_scope_district_chk
  CHECK (scope_district_type IS NULL OR scope_district_type IN ('us_house','state_senate','state_house','county_leg'));
COMMENT ON COLUMN public.ballot_contests.scope_level IS 'Who sees this contest: statewide, county (scope_counties), or district (scope_district_type/id). Null means not yet scoped and voters do not see it.';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ballot_county text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_ballot_county_chk
  CHECK (ballot_county IS NULL OR ballot_county IN ('jackson','clay','platte','cass','other'));
COMMENT ON COLUMN public.profiles.ballot_county IS 'Voter-chosen Missouri county for ballot filtering. Not a trust signal.';