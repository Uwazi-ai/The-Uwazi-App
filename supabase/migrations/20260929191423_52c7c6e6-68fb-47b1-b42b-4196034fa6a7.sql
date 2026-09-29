CREATE TABLE public.city_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_geoid text NOT NULL UNIQUE,
  place_name text,
  state text,
  county_geoid text,
  school_district_geoid text,
  status text NOT NULL DEFAULT 'requested',
  requested_by_count integer NOT NULL DEFAULT 0,
  first_requested_at timestamptz NOT NULL DEFAULT now(),
  discovered_at timestamptz,
  proposed_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  last_error text,
  notified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.city_onboarding TO authenticated;
GRANT ALL ON public.city_onboarding TO service_role;
ALTER TABLE public.city_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviewers can read cities" ON public.city_onboarding FOR SELECT TO authenticated
  USING (public.is_office_reviewer(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_city_onboarding() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('requested','discovering','proposed','needs_human','approved','active','failed') THEN
    RAISE EXCEPTION 'Bad city status';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_city_onboarding BEFORE INSERT OR UPDATE ON public.city_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.validate_city_onboarding();

-- Called by resolve-address with the service key
CREATE OR REPLACE FUNCTION public.request_city_onboarding(_place text, _name text, _state text, _county text, _school text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  IF _place IS NULL OR btrim(_place) = '' THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM civic_office_sources WHERE geoid = _place AND active)
     OR EXISTS (SELECT 1 FROM district_boundaries WHERE jurisdiction_geoid = _place AND active) THEN
    RETURN 'covered';
  END IF;
  INSERT INTO city_onboarding (place_geoid, place_name, state, county_geoid, school_district_geoid, status, requested_by_count)
  VALUES (_place, _name, _state, _county, _school, 'requested', 1)
  ON CONFLICT (place_geoid) DO UPDATE SET
    requested_by_count = city_onboarding.requested_by_count + 1,
    place_name = COALESCE(city_onboarding.place_name, EXCLUDED.place_name),
    state = COALESCE(city_onboarding.state, EXCLUDED.state),
    county_geoid = COALESCE(city_onboarding.county_geoid, EXCLUDED.county_geoid),
    school_district_geoid = COALESCE(city_onboarding.school_district_geoid, EXCLUDED.school_district_geoid)
  RETURNING status INTO v_status;
  RETURN v_status;
END $$;
REVOKE EXECUTE ON FUNCTION public.request_city_onboarding(text,text,text,text,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_city_onboarding(text,text,text,text,text) TO service_role;

-- Single flight claim for the discovery job
CREATE OR REPLACE FUNCTION public.claim_cities_for_discovery(_limit integer)
RETURNS SETOF public.city_onboarding LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE city_onboarding c SET status = 'discovering', last_error = NULL
  WHERE c.id IN (SELECT id FROM city_onboarding WHERE status = 'requested'
                 ORDER BY requested_by_count DESC, first_requested_at LIMIT LEAST(GREATEST(_limit,0),3)
                 FOR UPDATE SKIP LOCKED)
  RETURNING c.*;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_cities_for_discovery(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_cities_for_discovery(integer) TO service_role;

-- Admin: search again
CREATE OR REPLACE FUNCTION public.city_search_again(_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE city_onboarding SET status = 'requested', last_error = NULL, notified_at = NULL
  WHERE id = _id AND status NOT IN ('discovering','active');
  RETURN 'ok';
END $$;
REVOKE EXECUTE ON FUNCTION public.city_search_again(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.city_search_again(uuid) TO authenticated;

-- What the signed in user sees
CREATE OR REPLACE FUNCTION public.get_my_city_status()
RETURNS TABLE(place_name text, status text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.place_name, c.status FROM user_districts u
  JOIN city_onboarding c ON c.place_geoid = u.resolved->>'place'
  WHERE u.user_id = auth.uid() AND c.status <> 'active';
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_city_status() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_city_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.super_admin_emails()
RETURNS TABLE(email text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.email::text FROM user_roles r JOIN auth.users u ON u.id = r.user_id
  WHERE r.role = 'super_admin' AND u.email IS NOT NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.super_admin_emails() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_emails() TO service_role;

-- Flip a city to active once one source and one boundary batch are on
CREATE OR REPLACE FUNCTION public.refresh_city_active(_place text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _place IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM civic_office_sources WHERE geoid = _place AND active)
     AND EXISTS (SELECT 1 FROM district_boundaries WHERE jurisdiction_geoid = _place AND active) THEN
    UPDATE city_onboarding SET status = 'active' WHERE place_geoid = _place AND status <> 'active';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.refresh_city_active(text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_city_active_sources() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.active THEN PERFORM public.refresh_city_active(NEW.geoid); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER city_active_from_sources AFTER INSERT OR UPDATE OF active ON public.civic_office_sources
  FOR EACH ROW EXECUTE FUNCTION public.trg_city_active_sources();

CREATE OR REPLACE FUNCTION public.trg_city_active_boundaries() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.active THEN PERFORM public.refresh_city_active(NEW.jurisdiction_geoid); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER city_active_from_boundaries AFTER INSERT OR UPDATE OF active ON public.district_boundaries
  FOR EACH ROW EXECUTE FUNCTION public.trg_city_active_boundaries();

-- Let the discovery job use the same import path
CREATE OR REPLACE FUNCTION public.import_district_boundary(
  _jurisdiction_geoid text, _district_type text, _district_code text, _name text,
  _geojson jsonb, _source_url text, _batch uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
DECLARE v_id uuid;
BEGIN
  IF COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') <> 'service_role'
     AND (auth.uid() IS NULL OR NOT public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _district_type NOT IN ('council','commission','school_board','ward') THEN
    RAISE EXCEPTION 'Pick a district type we support';
  END IF;
  INSERT INTO public.district_boundaries (jurisdiction_geoid, district_type, district_code, name, geometry, source_url, active, import_batch_id)
  VALUES (NULLIF(btrim(_jurisdiction_geoid),''), _district_type, left(btrim(_district_code),40), left(NULLIF(btrim(_name),''),200),
          extensions.ST_SetSRID(extensions.ST_Multi(extensions.ST_GeomFromGeoJSON(_geojson::text)), 4326),
          left(NULLIF(btrim(_source_url),''),1000), false, _batch)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.import_district_boundary(text, text, text, text, jsonb, text, uuid) TO service_role;