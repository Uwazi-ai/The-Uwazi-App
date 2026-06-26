
-- 1) user_civic_stats: remove client-side write access
DROP POLICY IF EXISTS civic_stats_owner ON public.user_civic_stats;

CREATE POLICY "Users can view their own civic stats"
  ON public.user_civic_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.user_civic_stats FROM authenticated, anon;
GRANT SELECT ON public.user_civic_stats TO authenticated;
GRANT ALL ON public.user_civic_stats TO service_role;

-- 2) uwazi_question_log: split insert policy per role to prevent anon spoofing
DROP POLICY IF EXISTS "Users can insert their own questions" ON public.uwazi_question_log;

CREATE POLICY "Anon can insert anonymous questions"
  ON public.uwazi_question_log
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated users insert own questions"
  ON public.uwazi_question_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
