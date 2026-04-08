
-- Ballotpedia candidates cache
CREATE TABLE IF NOT EXISTS public.ballotpedia_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  party text,
  party_color text,
  office text NOT NULL,
  office_level text,
  district text,
  state_code text,
  city text,
  election_name text,
  election_date date,
  election_year int,
  election_type text,
  ballotpedia_url text,
  campaign_website text,
  incumbent boolean DEFAULT false,
  withdrew boolean DEFAULT false,
  scraped_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '24 hours'
);

-- Ballotpedia ballot measures cache
CREATE TABLE IF NOT EXISTS public.ballotpedia_ballot_measures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  measure_number text,
  measure_type text,
  state_code text,
  city text,
  county text,
  jurisdiction_level text,
  summary text,
  full_text_url text,
  ballotpedia_url text,
  election_date date,
  election_year int,
  result text,
  yes_votes int,
  no_votes int,
  yes_pct numeric,
  no_pct numeric,
  scraped_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '24 hours'
);

-- Ballotpedia elected officials cache
CREATE TABLE IF NOT EXISTS public.ballotpedia_officials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  office text NOT NULL,
  party text,
  state_code text,
  city text,
  district text,
  assumed_office date,
  term_ends date,
  ballotpedia_url text,
  photo_url text,
  scraped_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '24 hours'
);

-- Ballotpedia elections cache
CREATE TABLE IF NOT EXISTS public.ballotpedia_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_name text NOT NULL,
  election_date date NOT NULL,
  election_type text,
  election_year int,
  state_code text,
  city text,
  ballotpedia_url text,
  is_upcoming boolean DEFAULT true,
  scraped_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '24 hours'
);

-- Scraper job log
CREATE TABLE IF NOT EXISTS public.ballotpedia_scraper_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text,
  state_code text,
  city text,
  status text,
  records_scraped int DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Indexes
CREATE INDEX idx_bp_candidates_state_year ON public.ballotpedia_candidates(state_code, election_year);
CREATE INDEX idx_bp_candidates_city_year ON public.ballotpedia_candidates(city, election_year);
CREATE INDEX idx_bp_candidates_expires ON public.ballotpedia_candidates(expires_at);
CREATE INDEX idx_bp_measures_state ON public.ballotpedia_ballot_measures(state_code);
CREATE INDEX idx_bp_measures_city ON public.ballotpedia_ballot_measures(city);
CREATE INDEX idx_bp_officials_state_city ON public.ballotpedia_officials(state_code, city);
CREATE INDEX idx_bp_elections_state_date ON public.ballotpedia_elections(state_code, election_date);

-- Enable RLS
ALTER TABLE public.ballotpedia_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballotpedia_ballot_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballotpedia_officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballotpedia_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballotpedia_scraper_log ENABLE ROW LEVEL SECURITY;

-- Public read for cached civic data
CREATE POLICY "Authenticated users can read candidates" ON public.ballotpedia_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read measures" ON public.ballotpedia_ballot_measures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read officials" ON public.ballotpedia_officials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read elections" ON public.ballotpedia_elections FOR SELECT TO authenticated USING (true);

-- Service role write access for all cache tables
CREATE POLICY "Service role manages candidates" ON public.ballotpedia_candidates FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages measures" ON public.ballotpedia_ballot_measures FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages officials" ON public.ballotpedia_officials FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages elections" ON public.ballotpedia_elections FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Scraper log: admins can read, service role can write
CREATE POLICY "Admins can read scraper logs" ON public.ballotpedia_scraper_log FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Service role manages scraper logs" ON public.ballotpedia_scraper_log FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
