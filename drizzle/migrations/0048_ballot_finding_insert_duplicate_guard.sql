CREATE OR REPLACE FUNCTION public.apply_ballot_finding_internal(_id uuid, _actor uuid, _safe_only boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE f public.ballot_crawl_findings; p jsonb; a text; old_status text; new_id uuid; c jsonb; i int := 0;
BEGIN
  SELECT * INTO f FROM public.ballot_crawl_findings WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  IF f.status <> 'pending' THEN RETURN 'not_pending'; END IF;
  IF _safe_only AND NOT f.safe THEN RETURN 'not_safe'; END IF;
  p := f.proposed; a := p->>'action';
  IF a = 'hide_contest' THEN
    SELECT verification_status INTO old_status FROM public.ballot_contests WHERE id = f.contest_id;
    IF old_status IS NULL THEN RAISE EXCEPTION 'Contest not found'; END IF;
    UPDATE public.ballot_contests SET verification_status = 'flagged',
      review_note = trim(coalesce(review_note,'') || ' Hidden: secondary duplicate of official contest ' || (p->>'official_contest_id') || '.')
      WHERE id = f.contest_id;
    INSERT INTO public.ballot_verification_log (contest_id, actor_id, old_status, new_status, note)
      VALUES (f.contest_id, _actor, old_status, 'flagged', 'Ballot crawler finding ' || f.id || ' approved.');
  ELSIF a = 'set_title' THEN
    UPDATE public.ballot_contests SET measure_title = p->>'title' WHERE id = f.contest_id AND coalesce(measure_title,'') = '';
  ELSIF a = 'set_yes_no' THEN
    IF _safe_only OR f.safe THEN
      UPDATE public.ballot_contests SET yes_means = p->>'yes', no_means = p->>'no'
        WHERE id = f.contest_id AND coalesce(yes_means,'') = '' AND coalesce(no_means,'') = '';
    ELSE
      UPDATE public.ballot_contests SET yes_means = p->>'yes', no_means = p->>'no' WHERE id = f.contest_id;
    END IF;
  ELSIF a = 'set_party' THEN
    UPDATE public.ballot_candidates SET party = p->>'party' WHERE id = (p->>'candidate_id')::uuid;
  ELSIF a = 'add_candidate' THEN
    INSERT INTO public.ballot_candidates (contest_id, name, party, sort_order, source_url)
      VALUES (f.contest_id, p->>'name', p->>'party', coalesce((p->>'sort_order')::int, 99), p->>'source_url');
  ELSIF a = 'insert_contest' THEN
    -- New crawler contests have no district yet. A second one with the same title would break the
    -- one-contest-per-key rule, so stop and ask for a district instead of raising a raw error.
    IF EXISTS (SELECT 1 FROM public.ballot_contests b
      WHERE b.election_date = '2026-11-03' AND b.state = 'MO'
        AND coalesce(b.party,'') = '' AND coalesce(b.district_type,'') = '' AND coalesce(b.district_id,'') = ''
        AND coalesce(b.office_name, b.measure_title) = p->>'title') THEN
      UPDATE public.ballot_crawl_findings
        SET apply_error = 'Same title already added with no district. Set its district in Ballot Review, then approve again.'
        WHERE id = _id;
      RETURN 'needs_district';
    END IF;
    INSERT INTO public.ballot_contests (state, election_date, contest_type, office_name, measure_title, measure_summary,
      yes_means, no_means, source_name, source_url, verification_status, review_note, sort_order)
    VALUES ('MO', '2026-11-03', CASE WHEN p->>'contest_type' = 'candidate_race' THEN 'candidate_race' ELSE 'ballot_measure' END,
      CASE WHEN p->>'contest_type' = 'candidate_race' THEN p->>'title' END, p->>'title', p->>'ballot_question',
      p->>'yes', p->>'no', p->>'source_name', p->>'source_url', 'needs_review',
      'Added from official ballot by crawler. Needs district and review before voters see it.', 900)
    RETURNING id INTO new_id;
    FOR c IN SELECT * FROM jsonb_array_elements(coalesce(p->'candidates','[]'::jsonb)) LOOP
      i := i + 1;
      INSERT INTO public.ballot_candidates (contest_id, name, party, sort_order, source_url)
        VALUES (new_id, c->>'name', c->>'party', i, p->>'source_url');
    END LOOP;
  ELSIF a = 'acknowledge' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Unknown action';
  END IF;
  UPDATE public.ballot_crawl_findings SET status = 'approved', reviewed_by = _actor, reviewed_at = now(), apply_error = NULL WHERE id = _id;
  RETURN 'approved';
END $function$;