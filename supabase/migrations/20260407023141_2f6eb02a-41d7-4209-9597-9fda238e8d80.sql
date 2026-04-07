
ALTER TABLE public.voting_plans
  ADD COLUMN IF NOT EXISTS election_date date,
  ADD COLUMN IF NOT EXISTS polling_location text,
  ADD COLUMN IF NOT EXISTS transport_method text,
  ADD COLUMN IF NOT EXISTS reminder_time timestamptz,
  ADD COLUMN IF NOT EXISTS plan_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS notes text;
