
DROP POLICY "System can insert questions" ON public.uwazi_question_log;

CREATE POLICY "Authenticated users can insert questions"
  ON public.uwazi_question_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
