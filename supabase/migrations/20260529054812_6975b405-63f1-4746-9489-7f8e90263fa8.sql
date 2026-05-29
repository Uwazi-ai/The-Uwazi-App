
CREATE TABLE public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.beta_feedback TO authenticated;
GRANT INSERT ON public.beta_feedback TO anon;
GRANT ALL ON public.beta_feedback TO service_role;

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
ON public.beta_feedback FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their own feedback"
ON public.beta_feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
ON public.beta_feedback FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_beta_feedback_created_at ON public.beta_feedback(created_at DESC);
CREATE INDEX idx_beta_feedback_user_id ON public.beta_feedback(user_id);
