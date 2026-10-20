ALTER TABLE public.ride_settings
  ADD COLUMN IF NOT EXISTS autocab_base_capability_id integer,
  ADD COLUMN IF NOT EXISTS autocab_expected_account_code text NOT NULL DEFAULT '37765',
  ADD COLUMN IF NOT EXISTS autocab_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS autocab_verified_accounts jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.validate_autocab_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v jsonb; server boolean := current_user IN ('postgres','service_role','supabase_admin');
BEGIN
 IF NEW.autocab_base_url <> 'https://autocab-api.azure-api.net/booking/v1' THEN RAISE EXCEPTION 'Use the official Autocab Booking API URL'; END IF;
 IF NEW.autocab_company_id < 1 OR NEW.autocab_customer_id < 1 OR NEW.autocab_driver_id < 1 THEN RAISE EXCEPTION 'Autocab ids must be positive'; END IF;
 IF NEW.autocab_base_capability_id IS NOT NULL AND NEW.autocab_base_capability_id < 1 THEN RAISE EXCEPTION 'Dispatch capability id must be positive'; END IF;
 IF NEW.autocab_expected_account_code IS NULL OR btrim(NEW.autocab_expected_account_code) = '' OR length(NEW.autocab_expected_account_code) > 50 THEN RAISE EXCEPTION 'Expected account code is required'; END IF;
 IF jsonb_typeof(NEW.autocab_capability_map)<>'object' THEN RAISE EXCEPTION 'Capability map must be an object'; END IF;
 FOR v IN SELECT value FROM jsonb_each(NEW.autocab_capability_map) LOOP
 IF jsonb_typeof(v)<>'number' OR v::text !~ '^[0-9]+$' OR v::text::numeric < 0 THEN RAISE EXCEPTION 'Capability ids must be positive integers or zero for unmapped'; END IF;
 END LOOP;
 IF jsonb_typeof(NEW.autocab_verified_accounts)<>'object' THEN RAISE EXCEPTION 'Verified accounts must be an object'; END IF;
 IF TG_OP = 'UPDATE' AND NOT server AND (NEW.autocab_verified_at IS DISTINCT FROM OLD.autocab_verified_at OR NEW.autocab_verified_accounts IS DISTINCT FROM OLD.autocab_verified_accounts) THEN
   RAISE EXCEPTION 'Connection verification is set only by Test connection';
 END IF;
 IF NEW.autocab_live AND NEW.autocab_customer_id IS NULL THEN RAISE EXCEPTION 'Choose a customer account before enabling LIVE'; END IF;
 IF NEW.autocab_live AND (TG_OP = 'INSERT' OR NOT OLD.autocab_live OR NEW.autocab_customer_id IS DISTINCT FROM OLD.autocab_customer_id OR NEW.autocab_expected_account_code IS DISTINCT FROM OLD.autocab_expected_account_code) THEN
   IF NEW.autocab_verified_at IS NULL OR NEW.autocab_verified_at < now() - interval '10 minutes' THEN RAISE EXCEPTION 'Run Test connection within the last 10 minutes before enabling LIVE'; END IF;
   IF COALESCE(NEW.autocab_verified_accounts ->> NEW.autocab_customer_id::text, '') <> NEW.autocab_expected_account_code THEN
     RAISE EXCEPTION 'LIVE needs the expected account %', NEW.autocab_expected_account_code;
   END IF;
 END IF;
 RETURN NEW;
END $function$;