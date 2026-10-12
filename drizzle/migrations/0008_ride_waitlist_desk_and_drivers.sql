ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS driver_name text;
COMMENT ON COLUMN public.ride_requests.driver_name IS 'Coordinator-only note of who is driving. Never shown to riders.';
ALTER TABLE public.poll_ride_waitlist ADD COLUMN IF NOT EXISTS texted_at timestamptz;
ALTER TABLE public.poll_ride_waitlist ADD COLUMN IF NOT EXISTS texted_count integer NOT NULL DEFAULT 0;
GRANT ALL ON public.poll_ride_waitlist TO service_role;

-- Coordinator list: no phone, only whether one exists.
CREATE OR REPLACE FUNCTION public.ride_waitlist_list()
RETURNS TABLE(id uuid, state_code text, created_at timestamptz, texted_at timestamptz, texted_count int, has_phone boolean, has_account boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, w.state_code, w.created_at, w.texted_at, w.texted_count,
    coalesce(nullif(w.phone,''), nullif(p.phone_number,'')) IS NOT NULL, w.user_id IS NOT NULL
  FROM public.poll_ride_waitlist w
  LEFT JOIN public.profiles p ON p.id = w.user_id
  WHERE public.is_ride_coordinator(auth.uid())
  ORDER BY w.created_at;
$$;

-- Reveal one phone when a coordinator opens the entry.
CREATE OR REPLACE FUNCTION public.ride_waitlist_phone(_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(nullif(w.phone,''), nullif(p.phone_number,''))
  FROM public.poll_ride_waitlist w LEFT JOIN public.profiles p ON p.id = w.user_id
  WHERE w.id = _id AND public.is_ride_coordinator(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.ride_waitlist_list() FROM public, anon;
REVOKE ALL ON FUNCTION public.ride_waitlist_phone(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ride_waitlist_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ride_waitlist_phone(uuid) TO authenticated;