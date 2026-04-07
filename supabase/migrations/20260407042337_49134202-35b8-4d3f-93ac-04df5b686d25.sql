
CREATE TABLE IF NOT EXISTS public.saved_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  article_url text NOT NULL,
  article_title text,
  article_source text,
  article_image text,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, article_url)
);

ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved articles"
  ON public.saved_articles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save articles"
  ON public.saved_articles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave articles"
  ON public.saved_articles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
