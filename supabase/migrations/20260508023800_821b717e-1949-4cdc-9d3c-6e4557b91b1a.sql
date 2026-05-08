
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS voter_address_street TEXT,
  ADD COLUMN IF NOT EXISTS voter_address_city TEXT,
  ADD COLUMN IF NOT EXISTS voter_address_state TEXT,
  ADD COLUMN IF NOT EXISTS voter_address_zip TEXT;
