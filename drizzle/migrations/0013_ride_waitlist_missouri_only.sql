CREATE OR REPLACE FUNCTION public.ride_waitlist_missouri_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.state_code IS DISTINCT FROM 'MO' THEN
    RAISE EXCEPTION 'Free rides are only in Missouri right now. Questions? Call the ride line at (816) 379-6885.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ride_waitlist_missouri_only ON public.poll_ride_waitlist;
CREATE TRIGGER ride_waitlist_missouri_only BEFORE INSERT OR UPDATE OF state_code ON public.poll_ride_waitlist
FOR EACH ROW EXECUTE FUNCTION public.ride_waitlist_missouri_only();