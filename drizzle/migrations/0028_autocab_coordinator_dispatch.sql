ALTER TABLE public.ride_settings ADD COLUMN IF NOT EXISTS autocab_base_url text NOT NULL DEFAULT 'https://autocab-api.azure-api.net/booking/v1', ADD COLUMN IF NOT EXISTS autocab_customer_id integer, ADD COLUMN IF NOT EXISTS autocab_company_id integer NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS autocab_driver_id integer, ADD COLUMN IF NOT EXISTS autocab_capability_map jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN IF NOT EXISTS autocab_live boolean NOT NULL DEFAULT false;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS autocab_status text, ADD COLUMN IF NOT EXISTS autocab_operation_id uuid;
CREATE TABLE public.autocab_operations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor uuid NOT NULL, ride_ids uuid[] NOT NULL, fingerprint text NOT NULL, mode text NOT NULL, state text NOT NULL DEFAULT 'quoted', quote jsonb, expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes', booking_id text, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.autocab_operations TO service_role;
REVOKE ALL ON public.autocab_operations FROM anon, authenticated;
ALTER TABLE public.autocab_operations ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.autocab_poll_cache (booking_id text PRIMARY KEY, next_poll_at timestamptz NOT NULL DEFAULT now(), failures integer NOT NULL DEFAULT 0, data jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz);
GRANT SELECT ON public.autocab_poll_cache TO authenticated;
GRANT ALL ON public.autocab_poll_cache TO service_role;
REVOKE ALL ON public.autocab_poll_cache FROM anon;
ALTER TABLE public.autocab_poll_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coordinators read Autocab status" ON public.autocab_poll_cache FOR SELECT TO authenticated USING (public.is_ride_coordinator(auth.uid()));
CREATE FUNCTION public.autocab_claim_operation(_id uuid, _actor uuid, _fingerprint text, _mode text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE op public.autocab_operations; n integer;
BEGIN
 SELECT * INTO op FROM public.autocab_operations WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR op.state<>'quoted' OR op.actor<>_actor OR op.expires_at<now() OR op.fingerprint<>_fingerprint OR op.mode<>_mode THEN RETURN false; END IF;
 PERFORM id FROM public.ride_requests WHERE id=ANY(op.ride_ids) ORDER BY id FOR UPDATE;
 SELECT count(*) INTO n FROM public.ride_requests WHERE id=ANY(op.ride_ids) AND autocab_operation_id IS NULL AND autocab_booking_id IS NULL AND status IN ('requested','booked');
 IF n<>cardinality(op.ride_ids) THEN RETURN false; END IF;
 UPDATE public.ride_requests SET autocab_operation_id=_id WHERE id=ANY(op.ride_ids);
 UPDATE public.autocab_operations SET state='sending' WHERE id=_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.autocab_claim_operation(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.autocab_claim_operation(uuid,uuid,text,text) TO service_role;
CREATE FUNCTION public.autocab_finish_operation(_id uuid, _booking_id text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE op public.autocab_operations;
BEGIN
 SELECT * INTO op FROM public.autocab_operations WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR op.state<>'sending' THEN RAISE EXCEPTION 'Invalid operation'; END IF;
 UPDATE public.autocab_operations SET booking_id=_booking_id,state='booked' WHERE id=_id;
 UPDATE public.ride_requests SET autocab_booking_id=_booking_id,autocab_status='Booked' WHERE autocab_operation_id=_id;
 INSERT INTO public.ride_events(request_id,event_type,actor,note) SELECT unnest(op.ride_ids),'autocab_booked',op.actor,op.mode;
END $$;
REVOKE ALL ON FUNCTION public.autocab_finish_operation(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.autocab_finish_operation(uuid,text) TO service_role;
CREATE FUNCTION public.autocab_finish_cancel(_id uuid, _actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE op public.autocab_operations;
BEGIN
 SELECT * INTO op FROM public.autocab_operations WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR op.state<>'cancelling' THEN RAISE EXCEPTION 'Invalid operation'; END IF;
 UPDATE public.ride_requests SET autocab_booking_id=NULL,autocab_operation_id=NULL,autocab_status='Cancelled' WHERE autocab_operation_id=_id;
 INSERT INTO public.ride_events(request_id,event_type,actor,note) SELECT unnest(op.ride_ids),'autocab_cancelled',_actor,op.mode;
 UPDATE public.autocab_operations SET state='cancelled' WHERE id=_id;
END $$;
REVOKE ALL ON FUNCTION public.autocab_finish_cancel(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.autocab_finish_cancel(uuid,uuid) TO service_role;
CREATE FUNCTION public.guard_autocab_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF current_user NOT IN ('postgres','service_role','supabase_admin') AND (NEW.autocab_booking_id IS DISTINCT FROM OLD.autocab_booking_id OR NEW.autocab_status IS DISTINCT FROM OLD.autocab_status OR NEW.autocab_operation_id IS DISTINCT FROM OLD.autocab_operation_id) THEN RAISE EXCEPTION 'Autocab fields are server managed'; END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_autocab_fields BEFORE UPDATE ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.guard_autocab_fields();