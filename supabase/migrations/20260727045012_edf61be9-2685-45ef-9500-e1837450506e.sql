CREATE TABLE public.user_ballot_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contest_id UUID NOT NULL REFERENCES public.ballot_contests(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.ballot_candidates(id) ON DELETE SET NULL,
  measure_vote TEXT CHECK (measure_vote IN ('yes','no','undecided')),
  party_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, contest_id)
);

CREATE INDEX user_ballot_selections_user_idx ON public.user_ballot_selections(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ballot_selections TO authenticated;
GRANT ALL ON public.user_ballot_selections TO service_role;

ALTER TABLE public.user_ballot_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own ballot selections"
  ON public.user_ballot_selections
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all ballot selections"
  ON public.user_ballot_selections
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER user_ballot_selections_updated_at
  BEFORE UPDATE ON public.user_ballot_selections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();