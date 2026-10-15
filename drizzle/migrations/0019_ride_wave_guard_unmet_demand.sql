CREATE TABLE public.ride_turnaways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_day date NOT NULL,
  pickup_time time NOT NULL,
  source text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ride_turnaways TO service_role;
ALTER TABLE public.ride_turnaways ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enforce_ride_wave()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE seats int; ed date; n int; lock_site uuid;
BEGIN
  IF NEW.status NOT IN ('requested','booked','riding','completed') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.ride_day = NEW.ride_day AND OLD.pickup_time = NEW.pickup_time
     AND OLD.destination_site_id IS NOT DISTINCT FROM NEW.destination_site_id
     AND OLD.status IN ('requested','booked','riding','completed') THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ride_wave:' || NEW.ride_day::text || ' ' || NEW.pickup_time::text));
  SELECT seats_per_slot, election_day INTO seats, ed FROM public.ride_settings WHERE id = true;
  SELECT count(*) INTO n FROM public.ride_requests
    WHERE ride_day = NEW.ride_day AND pickup_time = NEW.pickup_time AND id <> NEW.id
      AND status IN ('requested','booked','riding','completed');
  IF n >= coalesce(seats, 3) THEN RAISE EXCEPTION 'wave_full'; END IF;
  IF NEW.ride_day <> ed AND NEW.destination_site_id IS NOT NULL THEN
    SELECT destination_site_id INTO lock_site FROM public.ride_requests
      WHERE ride_day = NEW.ride_day AND pickup_time = NEW.pickup_time AND id <> NEW.id
        AND status IN ('requested','booked','riding','completed') AND destination_site_id IS NOT NULL
      ORDER BY created_at LIMIT 1;
    IF lock_site IS NOT NULL AND lock_site <> NEW.destination_site_id THEN RAISE EXCEPTION 'wave_site'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ride_requests_wave_guard BEFORE INSERT OR UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ride_wave();

CREATE OR REPLACE FUNCTION public.ride_unmet_demand()
RETURNS TABLE(requested_date date, reason text, n bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.requested_date, w.reason, count(*) FROM public.poll_ride_waitlist w
    WHERE public.is_ride_coordinator(auth.uid()) AND w.reason IS NOT NULL
    GROUP BY 1, 2
  UNION ALL
  SELECT t.ride_day, 'turned_away', count(*) FROM public.ride_turnaways t
    WHERE public.is_ride_coordinator(auth.uid())
    GROUP BY 1
  ORDER BY 1, 2;
$$;
REVOKE ALL ON FUNCTION public.ride_unmet_demand() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ride_unmet_demand() TO authenticated;