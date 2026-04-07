
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_id ON public.user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_ask_uwazi_sessions_user_id ON public.ask_uwazi_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_legislation_user_id ON public.saved_legislation(user_id);
CREATE INDEX IF NOT EXISTS idx_ballot_selections_user_id ON public.ballot_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_raia_scores_zip_code ON public.raia_scores(zip_code);
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON public.streaks(user_id);
