CREATE TABLE IF NOT EXISTS public.civic_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geoid text,
  office_title text NOT NULL,
  jurisdiction_level text,
  current_holder text,
  term_end text,
  data_source text,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.civic_offices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.civic_offices TO authenticated;
GRANT ALL ON public.civic_offices TO service_role;
ALTER TABLE public.civic_offices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read offices" ON public.civic_offices FOR SELECT USING (true);
CREATE POLICY "Admins write offices" ON public.civic_offices FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER civic_offices_touch BEFORE UPDATE ON public.civic_offices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.civic_office_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geoid text,
  label text NOT NULL,
  source_url text NOT NULL,
  jurisdiction_level text,
  check_frequency_hours integer NOT NULL DEFAULT 168,
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  last_result jsonb,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.civic_office_sources TO authenticated;
GRANT ALL ON public.civic_office_sources TO service_role;
ALTER TABLE public.civic_office_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage sources" ON public.civic_office_sources FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.civic_office_pending_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.civic_office_sources(id) ON DELETE CASCADE,
  office_id uuid REFERENCES public.civic_offices(id) ON DELETE CASCADE,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  proposed jsonb,
  note text,
  reported_by uuid,
  extracted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  origin text NOT NULL DEFAULT 'scraper',
  reviewed_by uuid,
  reviewed_at timestamptz
);
GRANT SELECT, UPDATE ON public.civic_office_pending_changes TO authenticated;
GRANT ALL ON public.civic_office_pending_changes TO service_role;
ALTER TABLE public.civic_office_pending_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read changes" ON public.civic_office_pending_changes FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admins update changes" ON public.civic_office_pending_changes FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_office_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF NEW.origin NOT IN ('scraper','user_reported') THEN RAISE EXCEPTION 'Invalid origin'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_office_change BEFORE INSERT OR UPDATE ON public.civic_office_pending_changes FOR EACH ROW EXECUTE FUNCTION public.validate_office_change();

CREATE OR REPLACE FUNCTION public.review_office_change(_change_id uuid, _approve boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.civic_office_pending_changes%ROWTYPE;
  s public.civic_office_sources%ROWTYPE;
  v_url text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM public.civic_office_pending_changes WHERE id = _change_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change not found'; END IF;
  IF c.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  IF NOT _approve THEN
    UPDATE public.civic_office_pending_changes SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=c.id;
    RETURN 'rejected';
  END IF;

  IF c.source_id IS NOT NULL THEN SELECT * INTO s FROM public.civic_office_sources WHERE id = c.source_id; END IF;
  v_url := COALESCE(s.source_url, (SELECT source_url FROM public.civic_offices WHERE id = c.office_id));

  IF c.office_id IS NULL THEN
    IF c.proposed IS NULL OR COALESCE(c.proposed->>'office_title','') = '' THEN
      RAISE EXCEPTION 'This change has no office to add';
    END IF;
    INSERT INTO public.civic_offices (geoid, office_title, jurisdiction_level, current_holder, term_end, data_source, source_url, last_verified_at)
    VALUES (s.geoid, c.proposed->>'office_title', s.jurisdiction_level, c.proposed->>'current_holder', c.proposed->>'term_end',
            COALESCE(s.label, 'admin'), v_url, now());
  ELSIF c.field_changed IN ('current_holder','office_title','term_end') THEN
    EXECUTE format('UPDATE public.civic_offices SET %I = $1, last_verified_at = now(), source_url = COALESCE($2, source_url) WHERE id = $3', c.field_changed)
      USING c.new_value, v_url, c.office_id;
  ELSE
    UPDATE public.civic_offices SET last_verified_at = now() WHERE id = c.office_id;
  END IF;

  UPDATE public.civic_office_pending_changes SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=c.id;
  RETURN 'approved';
END $$;

CREATE OR REPLACE FUNCTION public.report_office_issue(_office_id uuid, _field text, _correct_value text, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old text; v_id uuid; o public.civic_offices%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_active_subscription(auth.uid(),'live') OR public.has_active_subscription(auth.uid(),'sandbox') OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'UWAZI+ required' USING ERRCODE='42501';
  END IF;
  IF _field NOT IN ('current_holder','office_title','term_end','other') THEN RAISE EXCEPTION 'Invalid field'; END IF;
  SELECT * INTO o FROM public.civic_offices WHERE id = _office_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Office not found'; END IF;
  IF (SELECT count(*) FROM public.civic_office_pending_changes WHERE reported_by = auth.uid() AND extracted_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'Too many reports today';
  END IF;
  v_old := CASE _field WHEN 'current_holder' THEN o.current_holder WHEN 'office_title' THEN o.office_title WHEN 'term_end' THEN o.term_end ELSE NULL END;
  INSERT INTO public.civic_office_pending_changes (office_id, field_changed, old_value, new_value, note, reported_by, origin)
  VALUES (_office_id, _field, v_old, left(NULLIF(btrim(_correct_value),''),300), left(NULLIF(btrim(_note),''),1000), auth.uid(), 'user_reported')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;