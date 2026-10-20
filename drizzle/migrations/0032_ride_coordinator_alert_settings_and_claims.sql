ALTER TABLE public.ride_settings ADD COLUMN notify_emails text[] NOT NULL DEFAULT ARRAY['myke@uwazi.ai']::text[], ADD COLUMN notify_new_requests boolean NOT NULL DEFAULT true, ADD COLUMN notify_waitlist boolean NOT NULL DEFAULT true, ADD COLUMN notify_include_contact boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.validate_ride_alert_settings() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF cardinality(NEW.notify_emails) <> 1 OR NEW.notify_emails[1] !~ '^[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN RAISE EXCEPTION 'Enter one valid coordinator email address'; END IF; RETURN NEW; END $$;
CREATE TRIGGER validate_ride_alert_settings BEFORE INSERT OR UPDATE OF notify_emails ON public.ride_settings FOR EACH ROW EXECUTE FUNCTION public.validate_ride_alert_settings();
CREATE UNIQUE INDEX ride_alert_one_claim_per_ride ON public.ride_events(request_id) WHERE event_type='notify_claimed';
CREATE UNIQUE INDEX ride_alert_one_claim_per_waitlist ON public.ride_admin_log(target_id) WHERE action='notify_waitlist_claimed';
CREATE OR REPLACE FUNCTION public.claim_ride_email_alert(_kind text, _id uuid, _actor uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claim_id uuid; admin_actor uuid; n integer; BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Server only'; END IF;
 IF _kind NOT IN ('ride','waitlist','test') THEN RAISE EXCEPTION 'Invalid alert'; END IF;
 PERFORM pg_advisory_xact_lock(7241330);
 IF _kind='ride' AND (NOT EXISTS(SELECT 1 FROM public.ride_requests WHERE id=_id AND source='web') OR EXISTS(SELECT 1 FROM public.ride_events WHERE request_id=_id AND event_type='notify_claimed')) THEN RETURN NULL; END IF;
 IF _kind='waitlist' AND (NOT EXISTS(SELECT 1 FROM public.poll_ride_waitlist WHERE id=_id AND reason IN ('no_driver','full')) OR EXISTS(SELECT 1 FROM public.ride_admin_log WHERE target_id=_id AND action='notify_waitlist_claimed')) THEN RETURN NULL; END IF;
 SELECT (SELECT count(*) FROM public.ride_events WHERE event_type='notify_claimed' AND created_at>now()-interval '1 hour') + (SELECT count(*) FROM public.ride_admin_log WHERE action IN ('notify_waitlist_claimed','notify_test_claimed') AND created_at>now()-interval '1 hour') INTO n;
 IF n>=30 THEN RETURN NULL; END IF;
 IF _kind='ride' THEN INSERT INTO public.ride_events(request_id,event_type,note) VALUES(_id,'notify_claimed','coordinator email') RETURNING id INTO claim_id;
 ELSE
 SELECT user_id INTO admin_actor FROM public.user_roles WHERE role='super_admin' ORDER BY created_at LIMIT 1;
 IF _kind='test' THEN admin_actor:=_actor; END IF;
 IF admin_actor IS NULL OR NOT public.is_admin(admin_actor) THEN RETURN NULL; END IF;
 INSERT INTO public.ride_admin_log(actor,action,target_id,note) VALUES(admin_actor,CASE WHEN _kind='test' THEN 'notify_test_claimed' ELSE 'notify_waitlist_claimed' END,_id,'coordinator email') RETURNING id INTO claim_id;
 END IF;
 RETURN claim_id;
END $$;
REVOKE ALL ON FUNCTION public.claim_ride_email_alert(text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ride_email_alert(text,uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.dispatch_needs_place_alert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE job_token text; BEGIN
 IF NEW.source='web' AND NEW.needs_destination AND NOT OLD.needs_destination AND NEW.created_at >= '2026-10-20T05:45:00Z'::timestamptz THEN
 BEGIN
 SELECT token INTO job_token FROM public.system_job_token WHERE id=true;
 IF job_token IS NOT NULL THEN PERFORM net.http_post(url:='https://zigemhmhbzegwbgvvmpc.supabase.co/functions/v1/ride-request-alert',headers:=jsonb_build_object('Content-Type','application/json','x-ride-alert-token',job_token),body:=jsonb_build_object('action','ride','id',NEW.id),timeout_milliseconds:=5000); END IF;
 EXCEPTION WHEN OTHERS THEN INSERT INTO public.ride_events(request_id,event_type,note) VALUES(NEW.id,'note','notify_failed'); END;
 END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_needs_place_alert() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER ride_needs_place_alert AFTER UPDATE OF needs_destination ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.dispatch_needs_place_alert();