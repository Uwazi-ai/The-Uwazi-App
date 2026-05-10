-- Table 1: civic_registrants
CREATE TABLE public.civic_registrants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text UNIQUE,
  phone text,
  address jsonb,
  date_of_birth date,
  state_code char(2),
  registration_status text,
  source text,
  opt_in_uwazi boolean NOT NULL DEFAULT false,
  opt_in_partner boolean NOT NULL DEFAULT false,
  session_id uuid,
  matched_voter_file boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.civic_registrants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read registrants"
  ON public.civic_registrants FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage registrants"
  ON public.civic_registrants FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages registrants"
  ON public.civic_registrants FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_civic_registrants_updated_at
  BEFORE UPDATE ON public.civic_registrants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_civic_registrants_state ON public.civic_registrants(state_code);
CREATE INDEX idx_civic_registrants_session ON public.civic_registrants(session_id);
CREATE INDEX idx_civic_registrants_created ON public.civic_registrants(created_at DESC);

-- Table 2: civic_sessions
CREATE TABLE public.civic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text NOT NULL,
  state_code char(2),
  county text,
  questions_asked int NOT NULL DEFAULT 0,
  registration_link_clicked boolean NOT NULL DEFAULT false,
  registration_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.civic_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sessions"
  ON public.civic_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update own session by id"
  ON public.civic_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can read sessions"
  ON public.civic_sessions FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages sessions"
  ON public.civic_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_civic_sessions_anon ON public.civic_sessions(anonymous_id);
CREATE INDEX idx_civic_sessions_state ON public.civic_sessions(state_code);
CREATE INDEX idx_civic_sessions_created ON public.civic_sessions(created_at DESC);

-- Table 3: civic_impact_summary
CREATE TABLE public.civic_impact_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  state_code char(2),
  total_sessions int NOT NULL DEFAULT 0,
  total_registration_clicks int NOT NULL DEFAULT 0,
  total_registrations_completed int NOT NULL DEFAULT 0,
  total_opt_ins int NOT NULL DEFAULT 0,
  voter_file_matches int NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.civic_impact_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read impact summary"
  ON public.civic_impact_summary FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages impact summary"
  ON public.civic_impact_summary FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_civic_impact_period ON public.civic_impact_summary(period_start, period_end);
CREATE INDEX idx_civic_impact_state ON public.civic_impact_summary(state_code);