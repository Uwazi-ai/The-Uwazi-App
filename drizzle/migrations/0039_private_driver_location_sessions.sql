ALTER TABLE public.ride_settings ADD COLUMN show_driver_to_riders boolean NOT NULL DEFAULT false;
CREATE TABLE public.driver_location_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL UNIQUE, label text NOT NULL DEFAULT 'zTrip car', service_date date NOT NULL, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, consented_at timestamptz, last_seen_at timestamptz, stopped_at timestamptz, revoked_at timestamptz);
GRANT ALL ON public.driver_location_sessions TO service_role;
REVOKE ALL ON public.driver_location_sessions FROM anon, authenticated;
ALTER TABLE public.driver_location_sessions ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.driver_location_points (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.driver_location_sessions(id) ON DELETE CASCADE, lat double precision NOT NULL, lng double precision NOT NULL, accuracy_m double precision NOT NULL, heading double precision, speed_mps double precision, recorded_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.driver_location_points TO service_role;
REVOKE ALL ON public.driver_location_points FROM anon, authenticated;
ALTER TABLE public.driver_location_points ENABLE ROW LEVEL SECURITY;
CREATE INDEX driver_location_points_session_received ON public.driver_location_points(session_id, received_at DESC);
CREATE INDEX driver_location_sessions_service_date ON public.driver_location_sessions(service_date, created_at DESC);
CREATE FUNCTION public.validate_driver_location_session() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF NEW.token_hash !~ '^[a-f0-9]{64}$' OR length(NEW.label)>80 OR NEW.expires_at<=NEW.created_at OR NEW.expires_at>NEW.created_at+interval '16 hours' OR NEW.expires_at>((NEW.service_date+1)::timestamp AT TIME ZONE 'America/Chicago')+interval '2 hours' THEN RAISE EXCEPTION 'Invalid driver session'; END IF; RETURN NEW; END $$;
CREATE TRIGGER validate_driver_location_session BEFORE INSERT OR UPDATE ON public.driver_location_sessions FOR EACH ROW EXECUTE FUNCTION public.validate_driver_location_session();
CREATE FUNCTION public.create_driver_location_session(_hash text, _label text, _actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d date:=(now() AT TIME ZONE 'America/Chicago')::date; s public.driver_location_sessions; BEGIN
IF auth.role()<>'service_role' OR NOT public.is_ride_coordinator(_actor) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('driver-day:'||d::text,0));
UPDATE public.driver_location_sessions SET revoked_at=now() WHERE service_date=d AND revoked_at IS NULL;
DELETE FROM public.driver_location_points WHERE session_id IN (SELECT id FROM public.driver_location_sessions WHERE service_date=d AND revoked_at IS NOT NULL);
INSERT INTO public.driver_location_sessions(token_hash,label,service_date,created_by,expires_at) VALUES(_hash,left(coalesce(nullif(trim(_label),''),'zTrip car'),80),d,_actor,least(now()+interval '16 hours',((d+1)::timestamp AT TIME ZONE 'America/Chicago')+interval '2 hours')) RETURNING * INTO s;
RETURN jsonb_build_object('id',s.id,'expires_at',s.expires_at,'service_date',d,'label',s.label); END $$;
REVOKE ALL ON FUNCTION public.create_driver_location_session(text,text,uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.create_driver_location_session(text,text,uuid) TO service_role;
CREATE FUNCTION public.revoke_driver_location_session(_id uuid, _actor uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.role()<>'service_role' OR NOT public.is_ride_coordinator(_actor) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
PERFORM id FROM public.driver_location_sessions WHERE id=_id FOR UPDATE; IF NOT FOUND THEN RETURN false; END IF;
UPDATE public.driver_location_sessions SET revoked_at=coalesce(revoked_at,now()) WHERE id=_id;
DELETE FROM public.driver_location_points WHERE session_id=_id; RETURN true; END $$;
REVOKE ALL ON FUNCTION public.revoke_driver_location_session(uuid,uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.revoke_driver_location_session(uuid,uuid) TO service_role;
CREATE FUNCTION public.driver_location_ping(_hash text, _consent boolean, _point jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s public.driver_location_sessions; la double precision; ln double precision; ac double precision; hd double precision; sp double precision; rec timestamptz; BEGIN
IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
SELECT * INTO s FROM public.driver_location_sessions WHERE token_hash=_hash FOR UPDATE;
IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'status','invalid'); END IF;
IF s.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'status','revoked','stopped',true,'expires_at',s.expires_at); END IF;
IF s.stopped_at IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'status','stopped','stopped',true,'expires_at',s.expires_at); END IF;
IF s.expires_at<=now() THEN RETURN jsonb_build_object('ok',false,'status','expired','stopped',true,'expires_at',s.expires_at); END IF;
IF _point IS NULL THEN RETURN jsonb_build_object('ok',true,'status','ready','expires_at',s.expires_at,'stopped',false); END IF;
IF s.consented_at IS NULL AND NOT coalesce(_consent,false) THEN RETURN jsonb_build_object('ok',false,'status','consent_required'); END IF;
la:=(_point->>'lat')::double precision; ln:=(_point->>'lng')::double precision; ac:=(_point->>'accuracy_m')::double precision; hd:=(_point->>'heading')::double precision; sp:=(_point->>'speed_mps')::double precision; rec:=(_point->>'recorded_at')::timestamptz;
IF la IS NULL OR ln IS NULL OR ac IS NULL OR rec IS NULL OR NOT (la BETWEEN 38.6 AND 39.5) OR NOT (ln BETWEEN -95.2 AND -94.0) OR NOT (ac BETWEEN 0 AND 100000) OR (hd IS NOT NULL AND NOT (hd>=0 AND hd<360)) OR (sp IS NOT NULL AND NOT (sp>=0 AND sp<=100)) OR rec>now()+interval '1 minute' OR rec<now()-interval '5 minutes' THEN RETURN jsonb_build_object('ok',false,'status','invalid_point'); END IF;
IF ac>500 THEN RETURN jsonb_build_object('ok',true,'status','accuracy_ignored','expires_at',s.expires_at,'stopped',false); END IF;
IF s.last_seen_at>now()-interval '5 seconds' THEN RETURN jsonb_build_object('ok',false,'status','too_fast','expires_at',s.expires_at,'stopped',false); END IF;
UPDATE public.driver_location_sessions SET consented_at=coalesce(consented_at,now()),last_seen_at=now() WHERE id=s.id;
INSERT INTO public.driver_location_points(session_id,lat,lng,accuracy_m,heading,speed_mps,recorded_at) VALUES(s.id,la,ln,ac,hd,sp,rec);
RETURN jsonb_build_object('ok',true,'status','saved','expires_at',s.expires_at,'stopped',false); END $$;
REVOKE ALL ON FUNCTION public.driver_location_ping(text,boolean,jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.driver_location_ping(text,boolean,jsonb) TO service_role;
CREATE FUNCTION public.stop_driver_location_session(_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s public.driver_location_sessions; BEGIN
IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
SELECT * INTO s FROM public.driver_location_sessions WHERE token_hash=_hash FOR UPDATE;
IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'status','invalid'); END IF;
UPDATE public.driver_location_sessions SET stopped_at=coalesce(stopped_at,now()) WHERE id=s.id;
RETURN jsonb_build_object('ok',true,'status','stopped','stopped',true,'expires_at',s.expires_at); END $$;
REVOKE ALL ON FUNCTION public.stop_driver_location_session(text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.stop_driver_location_session(text) TO service_role;
CREATE FUNCTION public.purge_driver_location_points() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN
DELETE FROM public.driver_location_points p USING public.driver_location_sessions s WHERE p.session_id=s.id AND least(s.expires_at,coalesce(s.stopped_at,s.expires_at),coalesce(s.revoked_at,s.expires_at))<=now()-interval '48 hours'; GET DIAGNOSTICS n=ROW_COUNT; RETURN n; END $$;
REVOKE ALL ON FUNCTION public.purge_driver_location_points() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.purge_driver_location_points() TO service_role;
COMMENT ON TABLE public.driver_location_sessions IS 'Driver-consented desk-only sharing. Token hashes only. Coordinate-free session audit rows are retained.';
COMMENT ON TABLE public.driver_location_points IS 'Private coordinates. Revoke purges immediately. Daily purge removes points 48 hours after session ends or expires, with up to 24 hours scheduling delay.';