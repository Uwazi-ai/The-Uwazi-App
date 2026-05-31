
-- Add columns to profiles for geocoded address + districts
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS city_council_district text,
  ADD COLUMN IF NOT EXISTS mo_house_district text,
  ADD COLUMN IF NOT EXISTS mo_senate_district text,
  ADD COLUMN IF NOT EXISTS us_congressional_district text,
  ADD COLUMN IF NOT EXISTS school_district text,
  ADD COLUMN IF NOT EXISTS precinct_id text,
  ADD COLUMN IF NOT EXISTS districts_resolved_at timestamptz;

-- Cache table for ZIP investment data
CREATE TABLE IF NOT EXISTS public.zip_investment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code varchar(10) NOT NULL,
  level text NOT NULL CHECK (level IN ('city','state','federal')),
  fiscal_year varchar(4) NOT NULL DEFAULT '2024',
  total_investment numeric,
  projects_json jsonb,
  vendors_json jsonb,
  flags_json jsonb,
  meta_json jsonb,
  data_sources text[],
  refreshed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(zip_code, level, fiscal_year)
);

GRANT SELECT ON public.zip_investment_cache TO authenticated;
GRANT ALL ON public.zip_investment_cache TO service_role;

ALTER TABLE public.zip_investment_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read investment cache"
  ON public.zip_investment_cache FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role manages investment cache"
  ON public.zip_investment_cache FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_zic_zip_level ON public.zip_investment_cache(zip_code, level, fiscal_year);

-- Address update log
CREATE TABLE IF NOT EXISTS public.address_update_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_address text,
  new_address text,
  old_zip varchar(10),
  new_zip varchar(10),
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.address_update_log TO authenticated;
GRANT ALL ON public.address_update_log TO service_role;

ALTER TABLE public.address_update_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own address log"
  ON public.address_update_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own address log"
  ON public.address_update_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Service role manages address log"
  ON public.address_update_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);
