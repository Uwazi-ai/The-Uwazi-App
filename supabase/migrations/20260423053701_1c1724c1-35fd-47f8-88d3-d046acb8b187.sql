CREATE POLICY "Users can view their own question logs"
ON public.uwazi_question_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);