
-- Table: election_races
CREATE TABLE public.election_races (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state text NOT NULL,
  office text NOT NULL,
  district integer,
  election_date date NOT NULL,
  phase text NOT NULL DEFAULT 'primary',
  is_partisan boolean NOT NULL DEFAULT true,
  ballotpedia_url text,
  last_scraped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for phase
CREATE OR REPLACE FUNCTION public.validate_race_phase()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.phase NOT IN ('primary', 'general', 'results') THEN
    RAISE EXCEPTION 'Invalid phase: %. Must be primary, general, or results.', NEW.phase;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_race_phase
BEFORE INSERT OR UPDATE ON public.election_races
FOR EACH ROW EXECUTE FUNCTION public.validate_race_phase();

-- Auto-update updated_at
CREATE TRIGGER update_election_races_updated_at
BEFORE UPDATE ON public.election_races
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.election_races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read races"
ON public.election_races FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role manages races"
ON public.election_races FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Index
CREATE INDEX idx_election_races_state_date ON public.election_races (state, election_date);

-- Table: race_candidates
CREATE TABLE public.race_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id uuid NOT NULL REFERENCES public.election_races(id) ON DELETE CASCADE,
  name text NOT NULL,
  party text NOT NULL,
  is_incumbent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  photo_url text,
  ballotpedia_url text,
  vote_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for party
CREATE OR REPLACE FUNCTION public.validate_candidate_party()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.party NOT IN ('democrat', 'republican', 'independent', 'nonpartisan') THEN
    RAISE EXCEPTION 'Invalid party: %. Must be democrat, republican, independent, or nonpartisan.', NEW.party;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_candidate_party
BEFORE INSERT OR UPDATE ON public.race_candidates
FOR EACH ROW EXECUTE FUNCTION public.validate_candidate_party();

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_candidate_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'withdrew', 'won_primary', 'lost_primary', 'won_general', 'lost_general') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be active, withdrew, won_primary, lost_primary, won_general, or lost_general.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_candidate_status
BEFORE INSERT OR UPDATE ON public.race_candidates
FOR EACH ROW EXECUTE FUNCTION public.validate_candidate_status();

-- Auto-update updated_at
CREATE TRIGGER update_race_candidates_updated_at
BEFORE UPDATE ON public.race_candidates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.race_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read candidates"
ON public.race_candidates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role manages candidates"
ON public.race_candidates FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Index
CREATE INDEX idx_race_candidates_race_id ON public.race_candidates (race_id);
