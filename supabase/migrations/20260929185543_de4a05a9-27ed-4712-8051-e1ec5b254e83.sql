CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.district_boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_geoid text,
  district_type text NOT NULL,
  district_code text NOT NULL,
  name text,
  geometry extensions.geometry(Geometry, 4326),
  source_url text,
  last_verified_at timestamptz,
  active boolean NOT NULL DEFAULT false,
  import_batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.district_boundaries TO authenticated;
GRANT ALL ON public.district_boundaries TO service_role;
ALTER TABLE public.district_boundaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage district boundaries" ON public.district_boundaries
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS district_boundaries_geom_idx ON public.district_boundaries USING gist (geometry);
CREATE INDEX IF NOT EXISTS district_boundaries_batch_idx ON public.district_boundaries (import_batch_id);
CREATE TRIGGER district_boundaries_updated_at BEFORE UPDATE ON public.district_boundaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_districts (
  user_id uuid PRIMARY KEY,
  resolved jsonb NOT NULL DEFAULT '{}'::jsonb,
  precision text NOT NULL DEFAULT 'zip',
  resolved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_districts TO authenticated;
GRANT ALL ON public.user_districts TO service_role;
ALTER TABLE public.user_districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own districts" ON public.user_districts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER user_districts_updated_at BEFORE UPDATE ON public.user_districts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.civic_offices ADD COLUMN IF NOT EXISTS district_type text;
ALTER TABLE public.civic_offices ADD COLUMN IF NOT EXISTS district_code text;

-- Match a point to the active district boundaries. Used by the address step only.
CREATE OR REPLACE FUNCTION public.match_district_codes(_lat double precision, _lon double precision)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT COALESCE(jsonb_object_agg(district_type, district_code), '{}'::jsonb)
  FROM (
    SELECT DISTINCT ON (district_type) district_type, district_code
    FROM public.district_boundaries
    WHERE active
      AND geometry IS NOT NULL
      AND extensions.ST_Contains(geometry, extensions.ST_SetSRID(extensions.ST_MakePoint(_lon, _lat), 4326))
    ORDER BY district_type, district_code
  ) m;
$$;

CREATE OR REPLACE FUNCTION public.import_district_boundary(
  _jurisdiction_geoid text, _district_type text, _district_code text, _name text,
  _geojson jsonb, _source_url text, _batch uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
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

CREATE OR REPLACE FUNCTION public.activate_district_batch(_batch uuid, _on boolean)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.district_boundaries
  SET active = _on, last_verified_at = CASE WHEN _on THEN now() ELSE last_verified_at END
  WHERE import_batch_id = _batch;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION public.district_batches()
RETURNS TABLE(import_batch_id uuid, jurisdiction_geoid text, district_type text, source_url text,
              feature_count bigint, active_count bigint, names text[], imported_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.import_batch_id, min(b.jurisdiction_geoid), min(b.district_type), min(b.source_url),
         count(*), count(*) FILTER (WHERE b.active),
         array_agg(COALESCE(b.name, b.district_code) ORDER BY b.district_code),
         min(b.created_at)
  FROM public.district_boundaries b
  WHERE public.is_admin(auth.uid()) AND b.import_batch_id IS NOT NULL
  GROUP BY b.import_batch_id
  ORDER BY min(b.created_at) DESC;
$$;

-- Offices that match the person's resolved codes: city level plus their districts.
CREATE OR REPLACE FUNCTION public.get_my_offices(_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(id uuid, office_title text, current_holder text, term_end text,
              jurisdiction_level text, district_type text, district_code text,
              source_url text, last_verified_at timestamptz, match_level text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r jsonb; v_place text; v_county text;
BEGIN
  IF auth.uid() IS NULL OR (_user_id <> auth.uid() AND NOT public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT ud.resolved INTO r FROM public.user_districts ud WHERE ud.user_id = _user_id;
  IF r IS NULL THEN RETURN; END IF;
  v_place := r->>'place';
  v_county := r->>'county';

  RETURN QUERY
  SELECT o.id, o.office_title, o.current_holder, o.term_end, o.jurisdiction_level,
         o.district_type, o.district_code, o.source_url, o.last_verified_at,
         CASE WHEN o.district_code IS NULL THEN 'city' ELSE 'district' END AS match_level
  FROM public.civic_offices o
  WHERE (o.geoid IS NULL OR o.geoid = v_place OR o.geoid = v_county)
    AND (
      o.district_code IS NULL
      OR (o.district_type IS NOT NULL AND r ? o.district_type AND r->>o.district_type = o.district_code)
    )
  ORDER BY (o.district_code IS NOT NULL), o.office_title;
END $$;

-- Review step: allow district tagging changes.
CREATE OR REPLACE FUNCTION public.review_office_change(_change_id uuid, _approve boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c public.civic_office_pending_changes%ROWTYPE;
  s public.civic_office_sources%ROWTYPE;
  v_url text;
  v_party text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_office_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM public.civic_office_pending_changes WHERE id = _change_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change not found'; END IF;
  IF c.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  IF NOT _approve THEN
    UPDATE public.civic_office_pending_changes SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=c.id;
    RETURN 'rejected';
  END IF;

  IF c.origin = 'manual' AND c.reported_by = auth.uid() AND public.office_reviewer_count() >= 2 THEN
    RAISE EXCEPTION 'Another admin or reviewer must approve an office you entered' USING ERRCODE = '42501';
  END IF;

  IF c.source_id IS NOT NULL THEN SELECT * INTO s FROM public.civic_office_sources WHERE id = c.source_id; END IF;

  IF c.target_table = 'race_candidates' THEN
    v_party := lower(COALESCE(c.proposed->>'party', ''));
    v_party := CASE WHEN v_party LIKE 'dem%' THEN 'democrat' WHEN v_party LIKE 'rep%' THEN 'republican'
                    WHEN v_party LIKE 'non%' THEN 'nonpartisan' ELSE 'independent' END;
    IF c.field_changed = 'new_candidate' THEN
      INSERT INTO public.race_candidates (race_id, name, party, is_incumbent, status)
      VALUES (c.contest_ref, c.proposed->>'name', v_party, COALESCE((c.proposed->>'is_incumbent')::boolean, false), 'active');
    ELSIF c.field_changed = 'party' THEN
      UPDATE public.race_candidates SET party = v_party, updated_at = now() WHERE id = c.candidate_id;
    ELSIF c.field_changed = 'withdrawn' THEN
      UPDATE public.race_candidates SET status = 'withdrew', updated_at = now() WHERE id = c.candidate_id;
    END IF;
  ELSIF c.target_table = 'ballot_candidates' THEN
    IF c.field_changed = 'new_candidate' THEN
      INSERT INTO public.ballot_candidates (contest_id, name, party, is_incumbent, source_url, sort_order)
      VALUES (c.contest_ref, c.proposed->>'name', NULLIF(c.proposed->>'party',''),
              COALESCE((c.proposed->>'is_incumbent')::boolean, false), s.source_url,
              COALESCE((SELECT max(sort_order) + 1 FROM public.ballot_candidates WHERE contest_id = c.contest_ref), 0));
    ELSIF c.field_changed = 'party' THEN
      UPDATE public.ballot_candidates SET party = c.new_value, source_url = COALESCE(s.source_url, source_url), updated_at = now() WHERE id = c.candidate_id;
    ELSIF c.field_changed = 'withdrawn' THEN
      UPDATE public.ballot_candidates SET withdrawn_at = now(), updated_at = now() WHERE id = c.candidate_id;
    END IF;
  ELSE
    v_url := COALESCE(c.proposed->>'source_url', s.source_url, (SELECT source_url FROM public.civic_offices WHERE id = c.office_id));
    IF c.office_id IS NULL THEN
      IF c.proposed IS NULL OR COALESCE(c.proposed->>'office_title','') = '' THEN
        RAISE EXCEPTION 'This change has no office to add';
      END IF;
      INSERT INTO public.civic_offices (geoid, office_title, jurisdiction_level, current_holder, term_end, data_source, source_url, last_verified_at, district_type, district_code)
      VALUES (COALESCE(NULLIF(c.proposed->>'geoid',''), s.geoid), c.proposed->>'office_title',
              COALESCE(NULLIF(c.proposed->>'jurisdiction_level',''), s.jurisdiction_level),
              c.proposed->>'current_holder', c.proposed->>'term_end',
              COALESCE(NULLIF(c.proposed->>'data_source',''), s.label, 'admin'), v_url, now(),
              NULLIF(c.proposed->>'district_type',''), NULLIF(c.proposed->>'district_code',''));
    ELSIF c.field_changed IN ('current_holder','office_title','term_end','district_type','district_code') THEN
      EXECUTE format('UPDATE public.civic_offices SET %I = $1, last_verified_at = now(), source_url = COALESCE($2, source_url) WHERE id = $3', c.field_changed)
        USING NULLIF(c.new_value,''), v_url, c.office_id;
      IF c.field_changed = 'district_code' AND COALESCE(c.proposed->>'district_type','') <> '' THEN
        UPDATE public.civic_offices SET district_type = c.proposed->>'district_type' WHERE id = c.office_id;
      END IF;
    ELSE
      UPDATE public.civic_offices SET last_verified_at = now() WHERE id = c.office_id;
    END IF;
  END IF;

  UPDATE public.civic_office_pending_changes SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=c.id;
  RETURN 'approved';
END $function$;

CREATE OR REPLACE FUNCTION public.add_manual_office(
  _office_title text, _current_holder text, _term_end text, _jurisdiction_level text,
  _geoid text, _data_source text, _source_url text,
  _district_type text DEFAULT NULL, _district_code text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_office_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(btrim(_office_title),'') = '' THEN RAISE EXCEPTION 'Add the office name'; END IF;
  IF COALESCE(btrim(_source_url),'') !~* '^https?://' THEN RAISE EXCEPTION 'Add the full web address of the official page'; END IF;
  INSERT INTO public.civic_office_pending_changes (office_id, field_changed, old_value, new_value, proposed, reported_by, origin)
  VALUES (NULL, 'new_office', NULL, left(COALESCE(NULLIF(btrim(_current_holder),''), btrim(_office_title)),300),
    jsonb_build_object(
      'office_title', left(btrim(_office_title),200),
      'current_holder', left(NULLIF(btrim(_current_holder),''),200),
      'term_end', left(NULLIF(btrim(_term_end),''),100),
      'jurisdiction_level', left(NULLIF(btrim(_jurisdiction_level),''),50),
      'geoid', left(NULLIF(btrim(_geoid),''),30),
      'data_source', left(NULLIF(btrim(_data_source),''),200),
      'district_type', left(NULLIF(btrim(_district_type),''),30),
      'district_code', left(NULLIF(btrim(_district_code),''),40),
      'source_url', left(btrim(_source_url),1000)),
    auth.uid(), 'manual')
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$;

-- Propose a district tag for an existing office. Admins and reviewers only.
CREATE OR REPLACE FUNCTION public.propose_office_district(_office_id uuid, _district_type text, _district_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid; o public.civic_offices%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_office_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO o FROM public.civic_offices WHERE id = _office_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Office not found'; END IF;
  INSERT INTO public.civic_office_pending_changes (office_id, field_changed, old_value, new_value, proposed, reported_by, origin)
  VALUES (_office_id, 'district_code', o.district_code, left(COALESCE(btrim(_district_code),''),40),
          jsonb_build_object('district_type', left(NULLIF(btrim(_district_type),''),30)), auth.uid(), 'manual')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;