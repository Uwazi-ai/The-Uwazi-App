CREATE OR REPLACE FUNCTION public.norm_office_title(t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(regexp_replace(btrim(coalesce(t,'')), '[\s\-]+', ' ', 'g'))
$$;

ALTER TABLE public.civic_offices ADD COLUMN IF NOT EXISTS seat_key text NOT NULL DEFAULT '';

-- Multi-seat bodies: same title, different people, outside Kansas City.
WITH multi AS (
  SELECT geoid, public.norm_office_title(office_title) nt FROM public.civic_offices
  WHERE geoid <> '2938000'
  GROUP BY 1,2 HAVING count(DISTINCT lower(btrim(current_holder))) > 1
), numbered AS (
  SELECT o.id, row_number() OVER (PARTITION BY o.geoid, public.norm_office_title(o.office_title) ORDER BY o.created_at, o.id) rn
  FROM public.civic_offices o JOIN multi m ON m.geoid = o.geoid AND m.nt = public.norm_office_title(o.office_title)
)
UPDATE public.civic_offices o SET seat_key = n.rn::text FROM numbered n WHERE n.id = o.id;

DO $$
DECLARE g record; k public.civic_offices%ROWTYPE; x record; off_url text; off_src text;
BEGIN
  FOR g IN SELECT geoid, public.norm_office_title(office_title) nt, seat_key FROM public.civic_offices
           GROUP BY 1,2,3 HAVING count(*) > 1 LOOP
    SELECT * INTO k FROM public.civic_offices o
     WHERE o.geoid IS NOT DISTINCT FROM g.geoid AND public.norm_office_title(o.office_title) = g.nt AND o.seat_key = g.seat_key
     ORDER BY (g.nt = 'city council district 6 at large' AND g.geoid = '2938000' AND o.current_holder = 'Kevin McManus') DESC,
              o.last_verified_at DESC NULLS LAST, o.created_at DESC
     LIMIT 1;
    SELECT source_url, data_source INTO off_url, off_src FROM public.civic_offices o
     WHERE o.geoid IS NOT DISTINCT FROM g.geoid AND public.norm_office_title(o.office_title) = g.nt AND o.seat_key = g.seat_key
       AND o.source_url NOT ILIKE '%wikipedia.org%' ORDER BY o.last_verified_at DESC NULLS LAST LIMIT 1;
    FOR x IN SELECT * FROM public.civic_offices o
      WHERE o.geoid IS NOT DISTINCT FROM g.geoid AND public.norm_office_title(o.office_title) = g.nt AND o.seat_key = g.seat_key AND o.id <> k.id LOOP
      UPDATE public.civic_offices SET
        district_type = coalesce(district_type, x.district_type),
        district_code = coalesce(district_code, x.district_code),
        term_end = coalesce(term_end, x.term_end)
      WHERE id = k.id;
      UPDATE public.civic_office_pending_changes SET office_id = k.id WHERE office_id = x.id;
      DELETE FROM public.compass_office_matches m WHERE m.office_id = x.id
        AND EXISTS (SELECT 1 FROM public.compass_office_matches m2 WHERE m2.session_id = m.session_id AND m2.office_id = k.id);
      UPDATE public.compass_office_matches SET office_id = k.id WHERE office_id = x.id;
      DELETE FROM public.civic_offices WHERE id = x.id;
    END LOOP;
    IF off_url IS NOT NULL THEN
      UPDATE public.civic_offices SET source_url = off_url, data_source = off_src WHERE id = k.id;
    END IF;
    IF g.geoid = '2938000' AND g.nt = 'city council district 6 at large' THEN
      UPDATE public.civic_offices SET last_verified_at = now() WHERE id = k.id;
    END IF;
  END LOOP;
END $$;

UPDATE public.civic_offices SET jurisdiction_level = 'county' WHERE geoid ~ '^\d{5}$';

CREATE UNIQUE INDEX IF NOT EXISTS civic_offices_one_per_seat
  ON public.civic_offices (geoid, public.norm_office_title(office_title), seat_key);

CREATE OR REPLACE FUNCTION public.review_office_change(_change_id uuid, _approve boolean)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  c public.civic_office_pending_changes%ROWTYPE;
  s public.civic_office_sources%ROWTYPE;
  v_url text; v_party text; v_geoid text; v_title text; v_existing uuid; v_seats int;
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
      v_geoid := COALESCE(NULLIF(c.proposed->>'geoid',''), s.geoid);
      v_title := c.proposed->>'office_title';
      SELECT count(*) INTO v_seats FROM public.civic_offices
        WHERE geoid IS NOT DISTINCT FROM v_geoid AND norm_office_title(office_title) = norm_office_title(v_title);
      IF v_seats = 1 THEN
        SELECT id INTO v_existing FROM public.civic_offices
          WHERE geoid IS NOT DISTINCT FROM v_geoid AND norm_office_title(office_title) = norm_office_title(v_title);
      ELSIF v_seats > 1 THEN
        SELECT id INTO v_existing FROM public.civic_offices
          WHERE geoid IS NOT DISTINCT FROM v_geoid AND norm_office_title(office_title) = norm_office_title(v_title)
            AND norm_office_title(current_holder) = norm_office_title(c.proposed->>'current_holder') LIMIT 1;
        IF v_existing IS NULL THEN
          RAISE EXCEPTION 'This office has more than one seat. Update the right seat by hand.';
        END IF;
      END IF;
      IF v_existing IS NOT NULL THEN
        UPDATE public.civic_offices SET
          current_holder = c.proposed->>'current_holder',
          term_end = COALESCE(NULLIF(c.proposed->>'term_end',''), term_end),
          source_url = COALESCE(v_url, source_url),
          last_verified_at = now(), updated_at = now()
        WHERE id = v_existing;
        UPDATE public.civic_office_pending_changes SET office_id = v_existing WHERE id = c.id;
      ELSE
        INSERT INTO public.civic_offices (geoid, office_title, jurisdiction_level, current_holder, term_end, data_source, source_url, last_verified_at, district_type, district_code)
        VALUES (v_geoid, v_title,
                CASE WHEN v_geoid ~ '^\d{5}$' THEN 'county' ELSE COALESCE(NULLIF(c.proposed->>'jurisdiction_level',''), s.jurisdiction_level) END,
                c.proposed->>'current_holder', c.proposed->>'term_end',
                COALESCE(NULLIF(c.proposed->>'data_source',''), s.label, 'admin'), v_url, now(),
                NULLIF(c.proposed->>'district_type',''), NULLIF(c.proposed->>'district_code',''));
      END IF;
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

CREATE OR REPLACE FUNCTION public.get_my_offices(_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(id uuid, office_title text, current_holder text, term_end text, jurisdiction_level text, district_type text, district_code text, source_url text, last_verified_at timestamp with time zone, match_level text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
         CASE WHEN o.jurisdiction_level = 'county' THEN 'county'
              WHEN o.jurisdiction_level = 'school' THEN 'school'
              WHEN o.district_code IS NULL THEN 'city' ELSE 'district' END AS match_level
  FROM public.civic_offices o
  WHERE (o.geoid IS NULL OR o.geoid = v_place OR o.geoid = v_county)
    AND (
      o.district_code IS NULL
      OR (o.district_type IS NOT NULL AND r ? o.district_type AND r->>o.district_type = o.district_code)
    )
  ORDER BY (o.district_code IS NOT NULL), o.office_title;
END $function$;