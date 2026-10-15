ALTER TABLE public.ride_requests ADD COLUMN ride_rating smallint CHECK (ride_rating BETWEEN 1 AND 5), ADD COLUMN rights_card_sms_claimed_at timestamptz, ADD COLUMN driver_on_way_sms_claimed_at timestamptz;
COMMENT ON COLUMN public.ride_requests.ride_rating IS 'Optional numeric rider rating. Token-validated server write only.';
CREATE OR REPLACE FUNCTION public.my_ride_demo_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.has_role(auth.uid(), 'super_admin'::public.app_role) $$;
REVOKE ALL ON FUNCTION public.my_ride_demo_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_ride_demo_access() TO authenticated, service_role;