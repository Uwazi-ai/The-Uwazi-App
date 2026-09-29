CREATE TABLE public.official_domains (
  domain text PRIMARY KEY,
  label text,
  added_by uuid,
  added_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_domains TO authenticated;
GRANT ALL ON public.official_domains TO service_role;
ALTER TABLE public.official_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and reviewers read official domains" ON public.official_domains FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_office_reviewer(auth.uid()));
CREATE POLICY "Admins add official domains" ON public.official_domains FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins change official domains" ON public.official_domains FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins remove official domains" ON public.official_domains FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));