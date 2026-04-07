
CREATE TABLE public.raia_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code text UNIQUE NOT NULL,
  score int,
  voter_turnout_score int,
  ballot_comprehension_score int,
  policy_awareness_score int,
  trust_score int,
  health_correlation_score int,
  calculated_at timestamptz DEFAULT now(),
  data_sources jsonb
);

ALTER TABLE public.raia_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Raia scores are readable by authenticated users" ON public.raia_scores FOR SELECT TO authenticated USING (true);
