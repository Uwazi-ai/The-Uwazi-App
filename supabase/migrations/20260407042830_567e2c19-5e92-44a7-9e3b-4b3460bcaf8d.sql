
ALTER TABLE public.voting_plans
  ADD COLUMN IF NOT EXISTS polling_location_name text;
