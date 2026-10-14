DROP POLICY IF EXISTS "Anon waitlist insert" ON public.poll_ride_waitlist;
DROP POLICY IF EXISTS "Own waitlist insert" ON public.poll_ride_waitlist;
REVOKE INSERT ON public.poll_ride_waitlist FROM anon, authenticated;
GRANT ALL ON public.poll_ride_waitlist TO service_role;