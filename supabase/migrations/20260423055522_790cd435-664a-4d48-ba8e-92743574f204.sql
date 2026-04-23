CREATE POLICY "Admins can read suppressed emails"
ON public.suppressed_emails
FOR SELECT
USING (public.is_admin(auth.uid()));