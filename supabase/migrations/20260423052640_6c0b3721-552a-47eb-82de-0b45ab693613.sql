DROP POLICY IF EXISTS "Authenticated users can insert questions" ON public.uwazi_question_log;

CREATE POLICY "Users can insert their own questions"
ON public.uwazi_question_log
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL
  OR user_id = auth.uid()
);