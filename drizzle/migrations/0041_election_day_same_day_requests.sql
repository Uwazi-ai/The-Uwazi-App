ALTER TABLE public.ride_settings
  ADD COLUMN IF NOT EXISTS same_day_dates date[] NOT NULL DEFAULT '{2026-11-03}'::date[],
  ADD COLUMN IF NOT EXISTS same_day_lead_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS requests_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pause_message text NOT NULL DEFAULT 'We are full right now. Call (816) 379-6885 and we will do our best to help.';

CREATE OR REPLACE FUNCTION public.validate_same_day_settings()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.same_day_lead_minutes IS NULL OR NEW.same_day_lead_minutes < 30 OR NEW.same_day_lead_minutes > 240 THEN
    RAISE EXCEPTION 'Same day notice must be 30 to 240 minutes';
  END IF;
  IF NEW.same_day_dates IS NULL OR cardinality(NEW.same_day_dates) > 14 THEN
    RAISE EXCEPTION 'Pick up to 14 same day dates';
  END IF;
  NEW.pause_message := btrim(coalesce(NEW.pause_message, ''));
  IF length(NEW.pause_message) < 5 OR length(NEW.pause_message) > 300 THEN
    RAISE EXCEPTION 'Pause message must be 5 to 300 characters';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_same_day_settings
BEFORE INSERT OR UPDATE OF same_day_dates, same_day_lead_minutes, requests_paused, pause_message ON public.ride_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_same_day_settings();

ALTER TABLE public.poll_ride_waitlist
  ADD COLUMN IF NOT EXISTS name_initial text,
  ADD COLUMN IF NOT EXISTS time_window text;
ALTER TABLE public.poll_ride_waitlist DROP CONSTRAINT IF EXISTS poll_ride_waitlist_reason_check;
ALTER TABLE public.poll_ride_waitlist ADD CONSTRAINT poll_ride_waitlist_reason_check
  CHECK (reason IS NULL OR reason = ANY (ARRAY['no_driver'::text, 'full'::text, 'standby'::text]));
ALTER TABLE public.poll_ride_waitlist ADD CONSTRAINT poll_ride_waitlist_name_initial_check
  CHECK (name_initial IS NULL OR length(name_initial) <= 44);
ALTER TABLE public.poll_ride_waitlist ADD CONSTRAINT poll_ride_waitlist_time_window_check
  CHECK (time_window IS NULL OR time_window = ANY (ARRAY['asap'::text, 'morning'::text, 'midday'::text, 'afternoon'::text, 'evening'::text]));