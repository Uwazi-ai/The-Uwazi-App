CREATE OR REPLACE FUNCTION public.complete_compass_session(_session_id uuid, _personalization boolean, _research boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid(); v_new jsonb := '{}'::jsonb; v_prior jsonb; v_blend jsonb := '{}'::jsonb;
  r record; v_done boolean := false; v_labels jsonb; v_pts integer; v_total integer; v_ev text;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.compass_sessions WHERE id=_session_id AND user_id=caller) THEN
    RAISE EXCEPTION 'Session not found' USING ERRCODE='42501';
  END IF;

  FOR r IN SELECT d.slug,
      ROUND(((SUM((CASE WHEN q.reverse_scored THEN 6 - cr.answer_value ELSE cr.answer_value END) * COALESCE(q.weight,1))
             / NULLIF(SUM(COALESCE(q.weight,1)),0)) - 1) / 4, 3) AS s
    FROM public.compass_responses cr
    JOIN public.compass_questions q ON q.id = cr.question_id
    JOIN public.compass_dimensions d ON d.id = q.dimension_id
    WHERE cr.session_id = _session_id GROUP BY d.slug LOOP
    IF r.s IS NOT NULL THEN v_new := v_new || jsonb_build_object(r.slug, r.s); END IF;
  END LOOP;
  IF v_new = '{}'::jsonb THEN RAISE EXCEPTION 'No answers saved for this quiz'; END IF;

  SELECT completed_at IS NOT NULL INTO v_done FROM public.compass_sessions WHERE id=_session_id;
  UPDATE public.compass_sessions SET completed_at = COALESCE(completed_at, now()) WHERE id=_session_id;

  SELECT dimension_scores INTO v_prior FROM public.user_civic_persona WHERE user_id=caller;
  -- A session that was already finished must not blend a second time.
  IF v_done AND v_prior IS NOT NULL THEN v_blend := v_prior; ELSE
  FOR r IN SELECT key, value FROM jsonb_each(v_new) LOOP
    IF v_prior ? r.key THEN
      v_blend := v_blend || jsonb_build_object(r.key, ROUND(0.7 * (r.value)::text::numeric + 0.3 * (v_prior->>r.key)::numeric, 3));
    ELSE
      v_blend := v_blend || jsonb_build_object(r.key, r.value);
    END IF;
  END LOOP;
  END IF;
  v_labels := public.persona_label(v_blend);
  v_ev := public.persona_evidence(caller, v_labels->>'persona');
  v_labels := v_labels || jsonb_build_object('evidence', v_ev);

  INSERT INTO public.user_civic_persona (user_id, dimension_scores, persona_labels, consent_scope, last_updated)
  VALUES (caller, v_blend, v_labels, jsonb_build_object('personalization', COALESCE(_personalization,false), 'research', COALESCE(_research,false)), now())
  ON CONFLICT (user_id) DO UPDATE SET dimension_scores=EXCLUDED.dimension_scores, persona_labels=EXCLUDED.persona_labels,
    consent_scope=EXCLUDED.consent_scope, last_updated=now();

  IF NOT EXISTS (SELECT 1 FROM public.persona_history WHERE session_id=_session_id AND source='quiz') THEN
    INSERT INTO public.persona_history (user_id, session_id, persona, streak) VALUES (caller, _session_id, v_labels->>'persona', v_labels->>'streak');
  END IF;

  v_pts := public.award_points(caller, 'compass_complete', 50, _session_id::text);
  IF v_pts = 0 THEN PERFORM public.recompute_next_step(caller); END IF;
  SELECT COALESCE(SUM(points),0) INTO v_total FROM public.user_points_ledger WHERE user_id=caller;

  RETURN jsonb_build_object('points_awarded', v_pts, 'total_points', v_total, 'stage', public.stage_name_for(v_total),
    'label', CASE WHEN _personalization THEN v_labels->>'primary' END,
    'persona', CASE WHEN _personalization THEN v_labels->>'persona' END,
    'streak', CASE WHEN _personalization THEN v_labels->>'streak' END,
    'evidence', CASE WHEN _personalization THEN v_ev END);
END $function$;