CREATE TABLE public.plus_access_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, reason text NOT NULL CHECK (reason IN ('student','low_income')), note text, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','approved','declined')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.plus_access_requests TO authenticated;
GRANT UPDATE ON public.plus_access_requests TO authenticated;
GRANT ALL ON public.plus_access_requests TO service_role;
ALTER TABLE public.plus_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members submit their own Plus request" ON public.plus_access_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Members read their own Plus request" ON public.plus_access_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Super admins review Plus requests" ON public.plus_access_requests FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER plus_access_requests_updated_at BEFORE UPDATE ON public.plus_access_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();