
CREATE TABLE IF NOT EXISTS public.bill_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bill_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, bill_id)
);

ALTER TABLE public.bill_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all upvotes"
  ON public.bill_upvotes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own upvotes"
  ON public.bill_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upvotes"
  ON public.bill_upvotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
