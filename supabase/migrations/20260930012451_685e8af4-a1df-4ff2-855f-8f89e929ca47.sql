CREATE TABLE public.identity_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  original_label text,
  chosen_dimension text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.identity_feedback TO authenticated;
GRANT ALL ON public.identity_feedback TO service_role;
ALTER TABLE public.identity_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own identity feedback" ON public.identity_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read identity feedback" ON public.identity_feedback FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX identity_feedback_user_idx ON public.identity_feedback (user_id, created_at DESC);

ALTER TABLE public.user_points_ledger ADD COLUMN verified boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_points_ledger ADD COLUMN note text;
CREATE INDEX user_points_ledger_unverified_idx ON public.user_points_ledger (created_at DESC) WHERE verified = false;

CREATE OR REPLACE FUNCTION public.persona_label(_scores jsonb)
 RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE r record; v_short text[] := '{}'; v_names text[] := '{}'; v_label text;
  v_top_slugs text[] := '{}'; v_s1 numeric; v_s2 numeric; v_rule text;
BEGIN
  SELECT array_agg(slug ORDER BY s DESC) INTO v_top_slugs FROM (
    SELECT d.slug, (_scores->>d.slug)::numeric s FROM public.compass_dimensions d WHERE _scores ? d.slug ORDER BY 2 DESC LIMIT 3) t;
  SELECT (_scores->>v_top_slugs[1])::numeric, (_scores->>v_top_slugs[2])::numeric INTO v_s1, v_s2;
  FOR r IN SELECT d.slug, d.name, (_scores->>d.slug)::numeric AS s FROM public.compass_dimensions d
            WHERE _scores ? d.slug AND (_scores->>d.slug)::numeric >= 0.6
            ORDER BY (_scores->>d.slug)::numeric DESC LIMIT 2 LOOP
    v_names := v_names || replace(r.name, '&', 'and');
    v_short := v_short || CASE r.slug
      WHEN 'local-accountability' THEN 'accountability' WHEN 'economic-opportunity' THEN 'opportunity'
      WHEN 'public-safety' THEN 'safety' WHEN 'housing-development' THEN 'housing'
      WHEN 'education-youth' THEN 'schools' WHEN 'health-wellbeing' THEN 'health'
      WHEN 'infrastructure-mobility' THEN 'getting around' WHEN 'civic-participation' THEN 'your voice'
      ELSE lower(r.name) END;
  END LOOP;
  IF v_s1 IS NOT NULL AND v_s2 IS NOT NULL AND abs(v_s1 - v_s2) <= 0.05 THEN
    v_label := 'Balanced across issues'; v_rule := 'balanced';
  ELSIF array_length(v_short,1) IS NULL THEN
    v_label := 'Sees many sides'; v_rule := 'no_strong_lead';
  ELSIF array_length(v_short,1) = 1 THEN
    v_label := upper(left(v_short[1],1)) || substr(v_short[1],2) || ' first'; v_rule := 'one_lead';
  ELSE
    v_label := upper(left(v_short[1],1)) || substr(v_short[1],2) || ' and ' || v_short[2]; v_rule := 'two_leads';
  END IF;
  RETURN jsonb_build_object('primary', v_label, 'lead_name', CASE WHEN v_rule='balanced' THEN NULL ELSE v_names[1] END,
    'top_names', to_jsonb(v_names), 'top_slugs', to_jsonb(COALESCE(v_top_slugs,'{}')), 'rule', v_rule);
END $function$;

CREATE OR REPLACE FUNCTION public.set_my_consent(_personalization boolean DEFAULT NULL, _research boolean DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); v jsonb;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  INSERT INTO public.user_civic_persona (user_id) VALUES (caller) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_civic_persona SET consent_scope = consent_scope
    || CASE WHEN _personalization IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('personalization', _personalization) END
    || CASE WHEN _research IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('research', _research) END,
    last_updated = now()
   WHERE user_id = caller RETURNING consent_scope INTO v;
  PERFORM public.recompute_next_step(caller);
  RETURN v;
END $function$;

CREATE OR REPLACE FUNCTION public.choose_identity_dimension(_slug text, _session_id uuid DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); p record; v_name text; v_short text; v_label text; v_top text[];
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  SELECT * INTO p FROM public.user_civic_persona WHERE user_id = caller;
  IF NOT FOUND THEN RAISE EXCEPTION 'Take the Compass first'; END IF;
  SELECT array_agg(key ORDER BY value::text::numeric DESC) INTO v_top FROM (
    SELECT key, value FROM jsonb_each(p.dimension_scores) ORDER BY value::text::numeric DESC LIMIT 3) t;
  IF NOT (_slug = ANY(COALESCE(v_top,'{}'))) THEN RAISE EXCEPTION 'Pick one of your top three issues'; END IF;
  IF _session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.compass_sessions WHERE id=_session_id AND user_id=caller) THEN
    _session_id := NULL;
  END IF;
  SELECT replace(name,'&','and') INTO v_name FROM public.compass_dimensions WHERE slug = _slug;
  v_short := CASE _slug
      WHEN 'local-accountability' THEN 'accountability' WHEN 'economic-opportunity' THEN 'opportunity'
      WHEN 'public-safety' THEN 'safety' WHEN 'housing-development' THEN 'housing'
      WHEN 'education-youth' THEN 'schools' WHEN 'health-wellbeing' THEN 'health'
      WHEN 'infrastructure-mobility' THEN 'getting around' WHEN 'civic-participation' THEN 'your voice'
      ELSE lower(v_name) END;
  v_label := upper(left(v_short,1)) || substr(v_short,2) || ' first';
  INSERT INTO public.identity_feedback (user_id, session_id, original_label, chosen_dimension)
    VALUES (caller, _session_id, p.persona_labels->>'primary', _slug);
  UPDATE public.user_civic_persona SET persona_labels = persona_labels || jsonb_build_object(
      'primary', v_label, 'lead_name', v_name, 'rule', 'self_chosen', 'chosen_slug', _slug), last_updated = now()
   WHERE user_id = caller;
  RETURN jsonb_build_object('label', v_label, 'lead_name', v_name);
END $function$;

CREATE OR REPLACE FUNCTION public.delete_my_compass_data()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); n int;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  DELETE FROM public.compass_sessions WHERE user_id = caller;
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM public.user_civic_persona WHERE user_id = caller;
  DELETE FROM public.civic_confidence WHERE user_id = caller;
  DELETE FROM public.identity_feedback WHERE user_id = caller;
  PERFORM public.recompute_next_step(caller);
  RETURN jsonb_build_object('sessions_deleted', n);
END $function$;

CREATE OR REPLACE FUNCTION public.export_my_data()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'exported_at', now(),
    'compass', jsonb_build_object(
      'sessions', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', s.id, 'started_at', s.started_at, 'completed_at', s.completed_at) ORDER BY s.started_at), '[]') FROM public.compass_sessions s WHERE s.user_id=caller),
      'answers', (SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', r.session_id, 'question', q.prompt, 'answer', r.answer_value) ORDER BY r.created_at), '[]')
         FROM public.compass_responses r JOIN public.compass_sessions s ON s.id=r.session_id LEFT JOIN public.compass_questions q ON q.id=r.question_id WHERE s.user_id=caller),
      'scores', (SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', r.session_id, 'dimension_scores', r.dimension_scores, 'top_dimensions', r.top_dimensions, 'computed_at', r.computed_at)), '[]')
         FROM public.compass_results r JOIN public.compass_sessions s ON s.id=r.session_id WHERE s.user_id=caller)),
    'budget_split', (SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', b.session_id, 'allocation', b.allocation, 'created_at', b.created_at)), '[]')
         FROM public.compass_budget_priorities b JOIN public.compass_sessions s ON s.id=b.session_id WHERE s.user_id=caller),
    'identity', (SELECT jsonb_build_object('label', p.persona_labels->>'primary', 'labels', p.persona_labels, 'blended_scores', p.dimension_scores, 'consent', p.consent_scope, 'updated_at', p.last_updated)
         FROM public.user_civic_persona p WHERE p.user_id=caller),
    'identity_feedback', (SELECT COALESCE(jsonb_agg(jsonb_build_object('original_label', f.original_label, 'chosen_dimension', f.chosen_dimension, 'created_at', f.created_at)), '[]') FROM public.identity_feedback f WHERE f.user_id=caller),
    'points', (SELECT COALESCE(jsonb_agg(jsonb_build_object('event', l.event_type, 'points', l.points, 'verified', l.verified, 'note', l.note, 'at', l.created_at) ORDER BY l.created_at), '[]') FROM public.user_points_ledger l WHERE l.user_id=caller),
    'badges', (SELECT COALESCE(jsonb_agg(jsonb_build_object('badge', b.name, 'earned_at', ub.earned_at)), '[]') FROM public.user_badges ub LEFT JOIN public.badges b ON b.id=ub.badge_id WHERE ub.user_id=caller),
    'confidence', (SELECT COALESCE(jsonb_agg(jsonb_build_object('score', c.confidence_score, 'samples', c.sample_count, 'at', c.last_updated)), '[]') FROM public.civic_confidence c WHERE c.user_id=caller),
    'lessons', (SELECT COALESCE(jsonb_agg(jsonb_build_object('lesson', le.title, 'status', p.status, 'quiz_score', p.quiz_score, 'completed_at', p.completed_at)), '[]') FROM public.user_lesson_progress p LEFT JOIN public.lessons le ON le.id=p.lesson_id WHERE p.user_id=caller),
    'surveys', (SELECT COALESCE(jsonb_agg(jsonb_build_object('survey', sv.title, 'answers', r.answers, 'completed_at', r.completed_at)), '[]') FROM public.survey_responses r LEFT JOIN public.surveys sv ON sv.id=r.survey_id WHERE r.user_id=caller),
    'districts', (SELECT jsonb_build_object('district_codes', d.resolved, 'precision', d.precision, 'resolved_at', d.resolved_at, 'note', 'We keep only district codes. We do not keep your street address here.') FROM public.user_districts d WHERE d.user_id=caller)
  );
END $function$;

DROP FUNCTION IF EXISTS public.log_civic_action(uuid);
CREATE OR REPLACE FUNCTION public.log_civic_action(_office_id uuid DEFAULT NULL, _note text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); v_last timestamptz; v_note text := NULLIF(left(btrim(COALESCE(_note,'')), 200), ''); cur record;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  SELECT MAX(created_at) INTO v_last FROM public.user_points_ledger WHERE user_id=caller AND event_type='civic_action';
  IF v_last IS NOT NULL AND v_last > now() - interval '7 days' THEN
    RETURN jsonb_build_object('ok', false, 'next_allowed_at', v_last + interval '7 days');
  END IF;
  INSERT INTO public.user_points_ledger (user_id, event_type, points, source_id, verified, note)
    VALUES (caller, 'civic_action', 30, _office_id::text, false, v_note);
  SELECT * INTO cur FROM public.user_journey_next_step WHERE user_id=caller;
  IF FOUND AND cur.completed_at IS NULL AND cur.step_type='office_action' AND cur.step_ref IS NOT DISTINCT FROM _office_id::text THEN
    UPDATE public.user_journey_next_step SET completed_at=now() WHERE user_id=caller;
    UPDATE public.journey_step_history SET completed_at=now()
     WHERE user_id=caller AND step_type=cur.step_type AND step_ref IS NOT DISTINCT FROM cur.step_ref AND completed_at IS NULL;
  END IF;
  PERFORM public.recompute_next_step(caller);
  RETURN jsonb_build_object('ok', true, 'points', 30);
END $function$;

CREATE OR REPLACE FUNCTION public.admin_unverified_actions()
 RETURNS TABLE(id uuid, user_id uuid, email text, office text, note text, points integer, created_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT l.id, l.user_id, u.email::text, o.office_title, l.note, l.points, l.created_at
    FROM public.user_points_ledger l
    LEFT JOIN auth.users u ON u.id = l.user_id
    LEFT JOIN public.civic_offices o ON o.id::text = l.source_id
   WHERE l.verified = false ORDER BY l.created_at DESC LIMIT 100;
END $function$;

REVOKE EXECUTE ON FUNCTION public.set_my_consent(boolean, boolean), public.choose_identity_dimension(text, uuid), public.delete_my_compass_data(), public.export_my_data(), public.log_civic_action(uuid, text), public.admin_unverified_actions() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_my_consent(boolean, boolean), public.choose_identity_dimension(text, uuid), public.delete_my_compass_data(), public.export_my_data(), public.log_civic_action(uuid, text), public.admin_unverified_actions() TO authenticated;