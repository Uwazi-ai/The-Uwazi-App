CREATE TABLE public.voter_guide_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  county_fips text,
  election_date date NOT NULL,
  kind text NOT NULL,
  label text NOT NULL,
  starts_on date NOT NULL,
  ends_on date,
  note text,
  source_name text,
  source_url text,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified','unverified','flagged')),
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.voter_guide_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  county_fips text NOT NULL,
  election_date date NOT NULL,
  site_type text NOT NULL CHECK (site_type IN ('early','polling','dropbox','office')),
  precinct_key text,
  name text NOT NULL,
  address text NOT NULL,
  room text,
  hours text,
  source_name text,
  source_url text,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified','unverified','flagged')),
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX voter_guide_dates_lookup ON public.voter_guide_dates (state, election_date, county_fips);
CREATE INDEX voter_guide_sites_lookup ON public.voter_guide_sites (county_fips, election_date, site_type, precinct_key);

GRANT SELECT ON public.voter_guide_dates, public.voter_guide_sites TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.voter_guide_dates, public.voter_guide_sites TO authenticated;
GRANT ALL ON public.voter_guide_dates, public.voter_guide_sites TO service_role;

ALTER TABLE public.voter_guide_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voter_guide_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified guide dates are public" ON public.voter_guide_dates FOR SELECT USING (verification_status = 'verified' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage guide dates" ON public.voter_guide_dates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Verified guide sites are public" ON public.voter_guide_sites FOR SELECT USING (verification_status = 'verified' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage guide sites" ON public.voter_guide_sites FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER voter_guide_dates_updated BEFORE UPDATE ON public.voter_guide_dates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER voter_guide_sites_updated BEFORE UPDATE ON public.voter_guide_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();