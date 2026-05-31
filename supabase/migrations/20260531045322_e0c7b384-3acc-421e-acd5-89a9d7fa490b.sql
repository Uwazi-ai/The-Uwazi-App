ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ask_uwazi_question_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ask_uwazi_window_start timestamptz;