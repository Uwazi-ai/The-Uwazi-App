CREATE TABLE public.ride_waitlist_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id uuid NOT NULL REFERENCES public.poll_ride_waitlist(id) ON DELETE CASCADE,
  actor uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ride_waitlist_calls TO authenticated;
GRANT ALL ON public.ride_waitlist_calls TO service_role;
ALTER TABLE public.ride_waitlist_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coordinators read waitlist calls" ON public.ride_waitlist_calls FOR SELECT TO authenticated USING (public.is_ride_coordinator(auth.uid()));
CREATE POLICY "Coordinators log waitlist calls" ON public.ride_waitlist_calls FOR INSERT TO authenticated WITH CHECK (public.is_ride_coordinator(auth.uid()) AND actor = auth.uid());

CREATE OR REPLACE FUNCTION public.ride_waitlist_calls_due()
RETURNS TABLE(id uuid, requested_date date, reason text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, w.requested_date, w.reason, w.phone
  FROM poll_ride_waitlist w
  WHERE public.is_ride_coordinator(auth.uid())
    AND w.phone IS NOT NULL
    AND w.requested_date IN (SELECT service_date FROM ride_service_days)
    AND EXISTS (SELECT 1 FROM ride_requests r WHERE r.ride_day = w.requested_date AND r.status = 'cancelled' AND r.provider = 'ztrip')
    AND NOT EXISTS (SELECT 1 FROM ride_waitlist_calls c WHERE c.waitlist_id = w.id)
  ORDER BY w.requested_date, w.created_at
$$;
REVOKE ALL ON FUNCTION public.ride_waitlist_calls_due() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ride_waitlist_calls_due() TO authenticated;