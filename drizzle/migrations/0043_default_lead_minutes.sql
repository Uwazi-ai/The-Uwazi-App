ALTER TABLE public.ride_settings ADD COLUMN IF NOT EXISTS default_lead_minutes integer NOT NULL DEFAULT 120;
CREATE OR REPLACE FUNCTION public.validate_default_lead_minutes()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.default_lead_minutes IS NULL OR NEW.default_lead_minutes < 30 OR NEW.default_lead_minutes > 1440 THEN
    RAISE EXCEPTION 'Other days notice must be 30 to 1440 minutes';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_default_lead_minutes
BEFORE INSERT OR UPDATE OF default_lead_minutes ON public.ride_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_default_lead_minutes();