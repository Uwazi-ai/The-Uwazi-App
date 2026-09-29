ALTER TABLE public.civic_office_sources
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'office',
  ADD COLUMN IF NOT EXISTS target_table text,
  ADD COLUMN IF NOT EXISTS race_id uuid REFERENCES public.election_races(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ballot_state text,
  ADD COLUMN IF NOT EXISTS ballot_election_date date,
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT true;

ALTER TABLE public.civic_office_pending_changes
  ADD COLUMN IF NOT EXISTS candidate_id uuid,
  ADD COLUMN IF NOT EXISTS contest_ref uuid,
  ADD COLUMN IF NOT EXISTS target_table text;

ALTER TABLE public.ballot_candidates ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;

CREATE OR REPLACE FUNCTION public.validate_source_health()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.source_health IS NOT NULL AND NEW.source_health NOT IN ('ok','blocked','unclear','broken') THEN
    RAISE EXCEPTION 'Invalid source health';
  END IF;
  IF NEW.kind NOT IN ('office','candidates') THEN RAISE EXCEPTION 'Invalid source kind'; END IF;
  IF NEW.kind = 'candidates' THEN
    IF NEW.target_table NOT IN ('race_candidates','ballot_candidates') THEN RAISE EXCEPTION 'Pick where candidate changes go'; END IF;
    IF NEW.target_table = 'race_candidates' AND NEW.race_id IS NULL THEN RAISE EXCEPTION 'Pick a race'; END IF;
    IF NEW.target_table = 'ballot_candidates' AND (NEW.ballot_state IS NULL OR NEW.ballot_election_date IS NULL) THEN RAISE EXCEPTION 'Pick a state and election date'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.review_office_change(_change_id uuid, _approve boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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

  -- Candidate changes
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
    -- Office changes
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
  END IF;

  UPDATE public.civic_office_pending_changes SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=c.id;
  RETURN 'approved';
END $function$;

CREATE OR REPLACE FUNCTION public.office_recent_decisions()
RETURNS TABLE(id uuid, office_title text, field_changed text, new_value text, origin text, status text, reviewed_at timestamptz, reviewer_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id, COALESCE(o.office_title, c.proposed->>'office_title', c.proposed->>'contest'), c.field_changed, c.new_value, c.origin, c.status, c.reviewed_at, u.email::text
  FROM public.civic_office_pending_changes c
  LEFT JOIN public.civic_offices o ON o.id = c.office_id
  LEFT JOIN auth.users u ON u.id = c.reviewed_by
  WHERE public.is_office_reviewer(auth.uid()) AND c.status IN ('approved','rejected')
  ORDER BY c.reviewed_at DESC NULLS LAST
  LIMIT 50
$$;