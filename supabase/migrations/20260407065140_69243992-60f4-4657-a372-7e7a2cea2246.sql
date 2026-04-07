
-- Core question log
CREATE TABLE IF NOT EXISTS public.uwazi_question_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id uuid REFERENCES public.ask_uwazi_sessions(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  question_length int,
  topic_category text,
  sub_topic text,
  intent_type text,
  complexity_level text,
  is_local_question boolean DEFAULT false,
  zip_code text,
  state_code text,
  required_web_search boolean DEFAULT false,
  has_matching_lesson boolean DEFAULT false,
  suggested_lesson_title text,
  lesson_gap_priority text,
  response_helpful boolean,
  follow_up_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  week_number int,
  month_year text
);

-- Topic trends aggregation table
CREATE TABLE IF NOT EXISTS public.question_topic_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_category text NOT NULL,
  sub_topic text,
  question_count int DEFAULT 0,
  unique_user_count int DEFAULT 0,
  avg_complexity text,
  top_zip_codes jsonb,
  week_number int,
  month_year text,
  has_lesson boolean DEFAULT false,
  lesson_gap_score int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Lesson gap recommendations
CREATE TABLE IF NOT EXISTS public.lesson_gap_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_title text NOT NULL,
  suggested_category text,
  suggested_difficulty text,
  question_count int DEFAULT 0,
  example_questions jsonb DEFAULT '[]'::jsonb,
  top_zip_codes jsonb DEFAULT '[]'::jsonb,
  priority_score int DEFAULT 0,
  status text DEFAULT 'pending',
  created_lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger to auto-populate week_number and month_year on insert
CREATE OR REPLACE FUNCTION public.set_question_log_periods()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.week_number := EXTRACT(WEEK FROM NEW.created_at)::int;
  NEW.month_year := to_char(NEW.created_at, 'YYYY-MM');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_question_log_periods
  BEFORE INSERT ON public.uwazi_question_log
  FOR EACH ROW
  EXECUTE FUNCTION public.set_question_log_periods();

-- RLS
ALTER TABLE public.uwazi_question_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_topic_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_gap_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all questions"
  ON public.uwazi_question_log FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert questions"
  ON public.uwazi_question_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage topic trends"
  ON public.question_topic_trends FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage lesson gaps"
  ON public.lesson_gap_recommendations FOR ALL
  USING (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_question_log_topic ON public.uwazi_question_log(topic_category);
CREATE INDEX idx_question_log_subtopic ON public.uwazi_question_log(sub_topic);
CREATE INDEX idx_question_log_zip ON public.uwazi_question_log(zip_code);
CREATE INDEX idx_question_log_created ON public.uwazi_question_log(created_at DESC);
CREATE INDEX idx_question_log_month ON public.uwazi_question_log(month_year);
CREATE INDEX idx_question_log_lesson ON public.uwazi_question_log(has_matching_lesson);
CREATE INDEX idx_question_log_priority ON public.uwazi_question_log(lesson_gap_priority);
CREATE INDEX idx_question_log_user ON public.uwazi_question_log(user_id);
