CREATE OR REPLACE FUNCTION public.ride_paused_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id FROM public.ride_requests r
  JOIN public.ride_sms_optouts o
    ON o.phone_hash = encode(sha256(convert_to('+1' || right(regexp_replace(r.phone, '\D', '', 'g'), 10), 'UTF8')), 'hex')
  WHERE public.is_ride_coordinator(auth.uid());
$$;
REVOKE ALL ON FUNCTION public.ride_paused_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ride_paused_ids() TO authenticated;