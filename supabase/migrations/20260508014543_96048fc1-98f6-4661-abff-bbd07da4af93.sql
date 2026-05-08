ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS voter_elections_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS voter_elections_cached_at timestamptz DEFAULT NULL;