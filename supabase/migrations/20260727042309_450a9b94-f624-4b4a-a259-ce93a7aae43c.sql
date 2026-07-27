
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS county_name text,
  ADD COLUMN IF NOT EXISTS election_authority_key text,
  ADD COLUMN IF NOT EXISTS party_preference text,
  ADD COLUMN IF NOT EXISTS registration_verified_at timestamptz;

-- Allow users to self-update these fields (column-level UPDATE grants).
-- The row-level policy already restricts UPDATE to auth.uid() = user_id.
GRANT UPDATE (county_name, election_authority_key, party_preference, registration_verified_at)
  ON public.profiles TO authenticated;

-- 2. elections_published
CREATE TABLE public.elections_published (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state text NOT NULL,
  election_date date NOT NULL,
  election_name text NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  sample_ballot_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state, election_date)
);
GRANT SELECT ON public.elections_published TO anon, authenticated;
GRANT ALL ON public.elections_published TO service_role;
ALTER TABLE public.elections_published ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published elections"
  ON public.elections_published FOR SELECT USING (true);
CREATE POLICY "Admins manage published elections"
  ON public.elections_published FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_elections_published_updated_at
  BEFORE UPDATE ON public.elections_published
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. ballot_contests
CREATE TABLE public.ballot_contests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state text NOT NULL,
  election_date date NOT NULL,
  contest_type text NOT NULL DEFAULT 'ballot_measure',
  sort_order int NOT NULL DEFAULT 0,
  measure_title text NOT NULL,
  measure_summary text,
  plain_summary text,
  yes_means text,
  no_means text,
  supporters_say text,
  opponents_say text,
  measure_full_text_url text,
  source_name text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ballot_contests_state_date ON public.ballot_contests (state, election_date, sort_order);
GRANT SELECT ON public.ballot_contests TO anon, authenticated;
GRANT ALL ON public.ballot_contests TO service_role;
ALTER TABLE public.ballot_contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ballot contests"
  ON public.ballot_contests FOR SELECT USING (true);
CREATE POLICY "Admins manage ballot contests"
  ON public.ballot_contests FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_ballot_contests_updated_at
  BEFORE UPDATE ON public.ballot_contests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. election_authorities
CREATE TABLE public.election_authorities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  state text NOT NULL,
  county_name text,
  display_name text NOT NULL,
  covers_note text,
  phone text,
  website text,
  lookup_url text,
  poll_hours text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.election_authorities TO anon, authenticated;
GRANT ALL ON public.election_authorities TO service_role;
ALTER TABLE public.election_authorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view election authorities"
  ON public.election_authorities FOR SELECT USING (true);
CREATE POLICY "Admins manage election authorities"
  ON public.election_authorities FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_election_authorities_updated_at
  BEFORE UPDATE ON public.election_authorities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEEDS ============

-- Published elections (Aug 4, 2026 primaries)
INSERT INTO public.elections_published (state, election_date, election_name, is_published, sample_ballot_url) VALUES
  ('MO', '2026-08-04', 'Missouri Primary Election', true, 'https://www.sos.mo.gov/elections/petitions/2026BallotMeasures'),
  ('KS', '2026-08-04', 'Kansas Primary Election', true, 'https://www.sos.ks.gov/elections/elections.html')
ON CONFLICT (state, election_date) DO NOTHING;

-- Election authorities
INSERT INTO public.election_authorities (key, state, county_name, display_name, covers_note, phone, website, lookup_url, poll_hours) VALUES
  ('mo-kcmo-eb', 'MO', 'Jackson',
    'Kansas City Election Board',
    'Covers Kansas City residents within Jackson, Clay, Platte, and Cass counties.',
    '(816) 842-4820',
    'https://www.kceb.org',
    'https://s1.sos.mo.gov/elections/voterlookup/',
    '6:00 AM – 7:00 PM on Election Day'),
  ('mo-jackson-eb', 'MO', 'Jackson',
    'Jackson County Election Board',
    'Covers Jackson County residents outside Kansas City limits.',
    '(816) 325-4600',
    'https://www.jcebmo.org',
    'https://s1.sos.mo.gov/elections/voterlookup/',
    '6:00 AM – 7:00 PM on Election Day'),
  ('ks-johnson-eo', 'KS', 'Johnson',
    'Johnson County Election Office',
    'Covers all Johnson County, Kansas voters.',
    '(913) 715-6800',
    'https://www.jocoelection.org',
    'https://myvoteinfo.voteks.org/voterview/',
    NULL),
  ('mo-sos-fallback', 'MO', NULL,
    'Missouri Secretary of State',
    'Statewide voter services for Missouri.',
    '(573) 751-2301',
    'https://www.sos.mo.gov/elections',
    'https://s1.sos.mo.gov/elections/voterlookup/',
    '6:00 AM – 7:00 PM on Election Day'),
  ('ks-sos-fallback', 'KS', NULL,
    'Kansas Secretary of State',
    'Statewide voter services for Kansas.',
    '(785) 296-4561',
    'https://sos.ks.gov/elections/elections.html',
    'https://myvoteinfo.voteks.org/voterview/',
    NULL)
ON CONFLICT (key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  covers_note = EXCLUDED.covers_note,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  lookup_url = EXCLUDED.lookup_url,
  poll_hours = EXCLUDED.poll_hours;

-- Ballot measures — Missouri (4 constitutional amendments, placeholders for editorial fill-in)
INSERT INTO public.ballot_contests
  (state, election_date, contest_type, sort_order, measure_title, measure_summary, plain_summary, yes_means, no_means, source_name, source_url)
VALUES
  ('MO', '2026-08-04', 'ballot_measure', 1,
    'Constitutional Amendment 1',
    'Official ballot language will be published by the Missouri Secretary of State ahead of the election.',
    'The UWAZI plain-language summary is being finalized. Check back soon.',
    'A yes vote adopts the proposed constitutional change.',
    'A no vote keeps the Missouri Constitution as it is today.',
    'Missouri Secretary of State',
    'https://www.sos.mo.gov/elections/petitions/2026BallotMeasures'),
  ('MO', '2026-08-04', 'ballot_measure', 2,
    'Constitutional Amendment 2',
    'Official ballot language will be published by the Missouri Secretary of State ahead of the election.',
    'The UWAZI plain-language summary is being finalized. Check back soon.',
    'A yes vote adopts the proposed constitutional change.',
    'A no vote keeps the Missouri Constitution as it is today.',
    'Missouri Secretary of State',
    'https://www.sos.mo.gov/elections/petitions/2026BallotMeasures'),
  ('MO', '2026-08-04', 'ballot_measure', 3,
    'Constitutional Amendment 3',
    'Official ballot language will be published by the Missouri Secretary of State ahead of the election.',
    'The UWAZI plain-language summary is being finalized. Check back soon.',
    'A yes vote adopts the proposed constitutional change.',
    'A no vote keeps the Missouri Constitution as it is today.',
    'Missouri Secretary of State',
    'https://www.sos.mo.gov/elections/petitions/2026BallotMeasures'),
  ('MO', '2026-08-04', 'ballot_measure', 4,
    'Constitutional Amendment 4',
    'Official ballot language will be published by the Missouri Secretary of State ahead of the election.',
    'The UWAZI plain-language summary is being finalized. Check back soon.',
    'A yes vote adopts the proposed constitutional change.',
    'A no vote keeps the Missouri Constitution as it is today.',
    'Missouri Secretary of State',
    'https://www.sos.mo.gov/elections/petitions/2026BallotMeasures'),
  ('KS', '2026-08-04', 'ballot_measure', 1,
    'Kansas Constitutional Amendment',
    'Official ballot language will be published by the Kansas Secretary of State ahead of the election.',
    'The UWAZI plain-language summary is being finalized. Check back soon.',
    'A yes vote adopts the proposed constitutional change.',
    'A no vote keeps the Kansas Constitution as it is today.',
    'Kansas Secretary of State',
    'https://sos.ks.gov/elections/elections.html');
