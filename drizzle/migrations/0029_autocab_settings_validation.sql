CREATE FUNCTION public.validate_autocab_settings() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v jsonb;
BEGIN
 IF NEW.autocab_base_url <> 'https://autocab-api.azure-api.net/booking/v1' THEN RAISE EXCEPTION 'Use the official Autocab Booking API URL'; END IF;
 IF NEW.autocab_company_id < 1 OR NEW.autocab_customer_id < 1 OR NEW.autocab_driver_id < 1 THEN RAISE EXCEPTION 'Autocab ids must be positive'; END IF;
 IF jsonb_typeof(NEW.autocab_capability_map)<>'object' THEN RAISE EXCEPTION 'Capability map must be an object'; END IF;
 FOR v IN SELECT value FROM jsonb_each(NEW.autocab_capability_map) LOOP
 IF jsonb_typeof(v)<>'number' OR v::text !~ '^[0-9]+$' OR v::text::numeric < 0 THEN RAISE EXCEPTION 'Capability ids must be positive integers or zero for unmapped'; END IF;
 END LOOP;
 IF NEW.autocab_live AND NEW.autocab_customer_id IS NULL THEN RAISE EXCEPTION 'Choose a customer account before enabling LIVE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_autocab_settings BEFORE INSERT OR UPDATE ON public.ride_settings FOR EACH ROW EXECUTE FUNCTION public.validate_autocab_settings();
CREATE FUNCTION public.guard_autocab_insert() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF current_user NOT IN ('postgres','service_role','supabase_admin') AND (NEW.autocab_booking_id IS NOT NULL OR NEW.autocab_status IS NOT NULL OR NEW.autocab_operation_id IS NOT NULL) THEN RAISE EXCEPTION 'Autocab fields are server managed'; END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_autocab_insert BEFORE INSERT ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.guard_autocab_insert();