
ALTER TABLE public.civic_office_sources ADD COLUMN IF NOT EXISTS source_health text, ADD COLUMN IF NOT EXISTS last_page_text text;

CREATE OR REPLACE FUNCTION public.is_office_reviewer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_user_id) OR public.has_role(_user_id, 'reviewer')
$$;

CREATE POLICY "Reviewers read sources" ON public.civic_office_sources FOR SELECT TO authenticated USING (public.is_office_reviewer(auth.uid()));
CREATE POLICY "Reviewers read changes" ON public.civic_office_pending_changes FOR SELECT TO authenticated USING (public.is_office_reviewer(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_office_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF NEW.origin NOT IN ('scraper','user_reported','manual') THEN RAISE EXCEPTION 'Invalid origin'; END IF;
  IF NEW.source_health IS NOT NULL THEN NULL; END IF;
  RETURN NEW;
EXCEPTION WHEN undefined_column THEN RETURN NEW;
END $$;
-- simpler version without the odd column reference
CREATE OR REPLACE FUNCTION public.validate_office_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF NEW.origin NOT IN ('scraper','user_reported','manual') THEN RAISE EXCEPTION 'Invalid origin'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.validate_source_health()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.source_health IS NOT NULL AND NEW.source_health NOT IN ('ok','blocked','unclear','broken') THEN
    RAISE EXCEPTION 'Invalid source health';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_source_health BEFORE INSERT OR UPDATE ON public.civic_office_sources
  FOR EACH ROW EXECUTE FUNCTION public.validate_source_health();

CREATE OR REPLACE FUNCTION public.office_reviewer_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT uid)::int FROM (
    SELECT user_id uid FROM public.user_roles WHERE role::text IN ('super_admin','reviewer')
    UNION SELECT user_id FROM public.profiles WHERE is_admin = true
  ) t
$$;

CREATE OR REPLACE FUNCTION public.review_office_change(_change_id uuid, _approve boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  c public.civic_office_pending_changes%ROWTYPE;
  s public.civic_office_sources%ROWTYPE;
  v_url text;
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
  v_url := COALESCE(c.proposed->>'source_url', s.source_url, (SELECT source_url FROM public.civic_offices WHERE id = c.office_id));

  IF c.office_id IS NULL THEN
    IF c.proposed IS NULL OR COALESCE(c.proposed->>'office_title','') = '' THEN
      RAISE EXCEPTION 'This change has no office to add';
    END IF;
    INSERT INTO public.civic_offices (geoid, office_title, jurisdiction_level, current_holder, term_end, data_source, source_url, last_verified_at)
    VALUES (COALESCE(NULLIF(c.proposed->>'geoid',''), s.geoid), c.proposed->>'office_title',
            COALESCE(NULLIF(c.proposed->>'jurisdiction_level',''), s.jurisdiction_level),
            c.proposed->>'current_holder', c.proposed->>'term_end',
            COALESCE(NULLIF(c.proposed->>'data_source',''), s.label, 'admin'), v_url, now());
  ELSIF c.field_changed IN ('current_holder','office_title','term_end') THEN
    EXECUTE format('UPDATE public.civic_offices SET %I = $1, last_verified_at = now(), source_url = COALESCE($2, source_url) WHERE id = $3', c.field_changed)
      USING c.new_value, v_url, c.office_id;
  ELSE
    UPDATE public.civic_offices SET last_verified_at = now() WHERE id = c.office_id;
  END IF;

  UPDATE public.civic_office_pending_changes SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=c.id;
  RETURN 'approved';
END $function$;

CREATE OR REPLACE FUNCTION public.add_manual_office(_office_title text, _current_holder text, _term_end text,
  _jurisdiction_level text, _geoid text, _data_source text, _source_url text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
      'source_url', left(btrim(_source_url),1000)),
    auth.uid(), 'manual')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.office_recent_decisions()
RETURNS TABLE(id uuid, office_title text, field_changed text, new_value text, origin text, status text, reviewed_at timestamptz, reviewer_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, COALESCE(o.office_title, c.proposed->>'office_title'), c.field_changed, c.new_value, c.origin, c.status, c.reviewed_at, u.email::text
  FROM public.civic_office_pending_changes c
  LEFT JOIN public.civic_offices o ON o.id = c.office_id
  LEFT JOIN auth.users u ON u.id = c.reviewed_by
  WHERE public.is_office_reviewer(auth.uid()) AND c.status IN ('approved','rejected')
  ORDER BY c.reviewed_at DESC NULLS LAST
  LIMIT 50
$$;

CREATE OR REPLACE FUNCTION public.list_office_reviewers()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.user_id, u.email::text FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id
  WHERE public.is_admin(auth.uid()) AND r.role::text = 'reviewer' ORDER BY u.email
$$;

CREATE OR REPLACE FUNCTION public.set_office_reviewer(_email text, _grant boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(btrim(_email)) LIMIT 1;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No account uses that email'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'reviewer') ON CONFLICT (user_id, role) DO NOTHING;
    RETURN 'granted';
  ELSE
    DELETE FROM public.user_roles WHERE user_id = v_uid AND role = 'reviewer';
    RETURN 'removed';
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.add_manual_office(text,text,text,text,text,text,text), public.office_recent_decisions(), public.list_office_reviewers(), public.set_office_reviewer(text,boolean), public.office_reviewer_count(), public.is_office_reviewer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_manual_office(text,text,text,text,text,text,text), public.office_recent_decisions(), public.list_office_reviewers(), public.set_office_reviewer(text,boolean), public.office_reviewer_count(), public.is_office_reviewer(uuid) TO authenticated, service_role;
