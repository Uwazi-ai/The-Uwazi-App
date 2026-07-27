CREATE TABLE IF NOT EXISTS public.ballot_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.ballot_contests(id) ON DELETE CASCADE,
  name text NOT NULL,
  party text,
  is_incumbent boolean DEFAULT false,
  website text,
  bio text,
  source_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ballot_candidates TO anon, authenticated;
GRANT ALL ON public.ballot_candidates TO service_role;

ALTER TABLE public.ballot_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ballot_candidates public read"
  ON public.ballot_candidates FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS ballot_candidates_contest_idx
  ON public.ballot_candidates (contest_id, sort_order);

DROP TRIGGER IF EXISTS ballot_candidates_touch ON public.ballot_candidates;
CREATE TRIGGER ballot_candidates_touch
  BEFORE UPDATE ON public.ballot_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
