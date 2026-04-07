
CREATE TABLE public.ballot_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  election_id text,
  race_id text,
  candidate_or_choice text,
  zip_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, race_id)
);

ALTER TABLE public.ballot_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ballot selections" ON public.ballot_selections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ballot selections" ON public.ballot_selections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ballot selections" ON public.ballot_selections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ballot selections" ON public.ballot_selections FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_ballot_selections_updated_at
  BEFORE UPDATE ON public.ballot_selections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
