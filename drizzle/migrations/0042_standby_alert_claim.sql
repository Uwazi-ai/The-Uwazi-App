CREATE OR REPLACE FUNCTION public.claim_ride_email_alert(_kind text, _id uuid, _actor uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE claim_id uuid; admin_actor uuid; n integer; BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Server only'; END IF;
 IF _kind NOT IN ('ride','waitlist','test') THEN RAISE EXCEPTION 'Invalid alert'; END IF;
 PERFORM pg_advisory_xact_lock(7241330);
 IF _kind='ride' AND (NOT EXISTS(SELECT 1 FROM public.ride_requests WHERE id=_id AND source='web') OR EXISTS(SELECT 1 FROM public.ride_events WHERE request_id=_id AND event_type='notify_claimed')) THEN RETURN NULL; END IF;
 IF _kind='waitlist' AND (NOT EXISTS(SELECT 1 FROM public.poll_ride_waitlist WHERE id=_id AND reason IN ('no_driver','full','standby')) OR EXISTS(SELECT 1 FROM public.ride_admin_log WHERE target_id=_id AND action='notify_waitlist_claimed')) THEN RETURN NULL; END IF;
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
END $function$;
REVOKE ALL ON FUNCTION public.claim_ride_email_alert(text,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ride_email_alert(text,uuid,uuid) TO service_role;