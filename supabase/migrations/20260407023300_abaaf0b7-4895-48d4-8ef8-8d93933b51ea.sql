
CREATE TABLE public.saved_legislation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bill_id text NOT NULL,
  bill_title text,
  bill_url text,
  jurisdiction text,
  zip_code text,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, bill_id)
);

ALTER TABLE public.saved_legislation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved legislation" ON public.saved_legislation FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save legislation" ON public.saved_legislation FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave legislation" ON public.saved_legislation FOR DELETE USING (auth.uid() = user_id);
