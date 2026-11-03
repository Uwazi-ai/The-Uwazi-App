ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ballot_county_chk;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_ballot_county_chk
  CHECK (ballot_county IS NULL OR ballot_county IN ('jackson','clay','platte','cass','other','chicago','suburban_cook','dupage','lake','will','kane','mchenry','il_other'));
COMMENT ON COLUMN public.profiles.ballot_county IS 'Voter-chosen county (Missouri or Illinois) for ballot filtering. Not a trust signal.';