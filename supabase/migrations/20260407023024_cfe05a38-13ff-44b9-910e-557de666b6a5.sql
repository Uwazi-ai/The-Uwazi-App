
CREATE TABLE public.civic_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_xp int DEFAULT 0,
  civic_literacy_score int DEFAULT 0,
  lessons_completed int DEFAULT 0,
  quizzes_passed int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.civic_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own civic score" ON public.civic_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own civic score" ON public.civic_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own civic score" ON public.civic_scores FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_civic_scores_updated_at
  BEFORE UPDATE ON public.civic_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
