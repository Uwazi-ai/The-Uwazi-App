
CREATE TABLE public.civic_journey_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  min_points integer NOT NULL UNIQUE,
  lab_track text REFERENCES public.lesson_tracks(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.civic_journey_stages TO anon, authenticated;
GRANT ALL ON public.civic_journey_stages TO service_role;
ALTER TABLE public.civic_journey_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read stages" ON public.civic_journey_stages FOR SELECT USING (true);
CREATE POLICY "Admins manage stages" ON public.civic_journey_stages FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.lessons ADD COLUMN dimension_id uuid REFERENCES public.compass_dimensions(id);
ALTER TABLE public.lessons ADD COLUMN min_stage uuid REFERENCES public.civic_journey_stages(id);

CREATE TABLE public.user_civic_persona (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  dimension_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  persona_labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_scope jsonb NOT NULL DEFAULT '{"personalization": false, "research": false}'::jsonb,
  last_updated timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_civic_persona TO authenticated;
GRANT ALL ON public.user_civic_persona TO service_role;
ALTER TABLE public.user_civic_persona ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own persona" ON public.user_civic_persona FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.civic_confidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  confidence_score numeric NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  sample_count integer NOT NULL DEFAULT 1,
  last_updated timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX civic_confidence_user_idx ON public.civic_confidence(user_id, last_updated DESC);
GRANT SELECT ON public.civic_confidence TO authenticated;
GRANT ALL ON public.civic_confidence TO service_role;
ALTER TABLE public.civic_confidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own confidence" ON public.civic_confidence FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.user_points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  points integer NOT NULL,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_points_ledger_user_idx ON public.user_points_ledger(user_id, created_at DESC);
CREATE UNIQUE INDEX user_points_ledger_once_idx ON public.user_points_ledger(user_id, event_type, source_id) WHERE event_type <> 'civic_action';
GRANT SELECT ON public.user_points_ledger TO authenticated;
GRANT ALL ON public.user_points_ledger TO service_role;
ALTER TABLE public.user_points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own points" ON public.user_points_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.prevent_ledger_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'The points ledger is append only' USING ERRCODE = '42501';
END $$;
CREATE TRIGGER user_points_ledger_append_only BEFORE UPDATE OR DELETE ON public.user_points_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_change();

CREATE TABLE public.user_journey_next_step (
  user_id uuid PRIMARY KEY,
  step_type text NOT NULL,
  step_ref text,
  set_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT ON public.user_journey_next_step TO authenticated;
GRANT ALL ON public.user_journey_next_step TO service_role;
ALTER TABLE public.user_journey_next_step ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own next step" ON public.user_journey_next_step FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.journey_step_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step_type text NOT NULL,
  step_ref text,
  set_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX journey_step_history_user_idx ON public.journey_step_history(user_id, set_at DESC);
GRANT SELECT ON public.journey_step_history TO authenticated;
GRANT ALL ON public.journey_step_history TO service_role;
ALTER TABLE public.journey_step_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own step history" ON public.journey_step_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.learn_path_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  slot text NOT NULL,
  offered_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT ON public.learn_path_offers TO authenticated;
GRANT ALL ON public.learn_path_offers TO service_role;
ALTER TABLE public.learn_path_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own path offers" ON public.learn_path_offers FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ask_calibration_state (
  user_id uuid PRIMARY KEY,
  turns_since_prompt integer NOT NULL DEFAULT 99,
  pending_question text,
  pending_since timestamptz,
  last_prompt_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ask_calibration_state TO service_role;
ALTER TABLE public.ask_calibration_state ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.stage_name_for(_points integer)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT name FROM public.civic_journey_stages WHERE min_points <= COALESCE(_points,0) ORDER BY min_points DESC LIMIT 1
$$;

CREATE VIEW public.user_level WITH (security_invoker = on) AS
  SELECT l.user_id, SUM(l.points)::int AS total_points, public.stage_name_for(SUM(l.points)::int) AS stage_name
  FROM public.user_points_ledger l GROUP BY l.user_id;
GRANT SELECT ON public.user_level TO authenticated;

CREATE OR REPLACE FUNCTION public.is_lesson_done(_uid uuid, _lesson uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_lesson_progress WHERE user_id=_uid AND lesson_id=_lesson AND status='completed')
$$;

CREATE OR REPLACE FUNCTION public.next_stage_lesson(_uid uuid, _exclude uuid[] DEFAULT '{}')
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH pts AS (SELECT COALESCE(SUM(points),0)::int p FROM public.user_points_ledger WHERE user_id=_uid),
  st AS (SELECT * FROM public.civic_journey_stages WHERE min_points <= (SELECT p FROM pts) ORDER BY min_points DESC LIMIT 1)
  SELECT l.id FROM public.lessons l
  LEFT JOIN public.lesson_tracks t ON t.id = l.track_id
  LEFT JOIN public.civic_journey_stages ms ON ms.id = l.min_stage
  WHERE l.is_published AND NOT public.is_lesson_done(_uid, l.id) AND NOT (l.id = ANY(_exclude))
  ORDER BY (l.track_id IS NOT DISTINCT FROM (SELECT lab_track FROM st)) DESC,
           (COALESCE(ms.min_points,0) <= (SELECT p FROM pts)) DESC,
           t.order_index NULLS LAST, l.lesson_number NULLS LAST, l.title
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.dimension_lesson(_uid uuid, _ascending boolean, _exclude uuid[] DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_scores jsonb; v_id uuid;
BEGIN
  SELECT dimension_scores INTO v_scores FROM public.user_civic_persona WHERE user_id=_uid;
  IF v_scores IS NULL OR v_scores = '{}'::jsonb THEN RETURN NULL; END IF;
  SELECT l.id INTO v_id FROM public.lessons l JOIN public.compass_dimensions d ON d.id = l.dimension_id
  WHERE l.is_published AND v_scores ? d.slug AND NOT public.is_lesson_done(_uid, l.id) AND NOT (l.id = ANY(_exclude))
  ORDER BY CASE WHEN _ascending THEN (v_scores->>d.slug)::numeric ELSE -(v_scores->>d.slug)::numeric END,
           l.lesson_number NULLS LAST, l.title
  LIMIT 1;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.recompute_next_step(_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last timestamptz; v_cons jsonb; v_type text; v_ref text; cur record;
BEGIN
  SELECT MAX(completed_at) INTO v_last FROM public.compass_sessions WHERE user_id=_uid AND completed_at IS NOT NULL;
  SELECT consent_scope INTO v_cons FROM public.user_civic_persona WHERE user_id=_uid;

  IF v_last IS NULL OR v_last < now() - interval '90 days' THEN
    v_type := 'compass';
  END IF;

  IF v_type IS NULL AND COALESCE((v_cons->>'research')::boolean, false) THEN
    SELECT s.id::text INTO v_ref FROM public.surveys s
     WHERE s.status = 'active' AND COALESCE(s.show_in_app, true)
       AND (s.starts_at IS NULL OR s.starts_at <= now()) AND (s.ends_at IS NULL OR s.ends_at > now())
       AND NOT EXISTS (SELECT 1 FROM public.survey_responses r WHERE r.survey_id = s.id AND r.user_id = _uid)
     ORDER BY s.created_at LIMIT 1;
    IF v_ref IS NOT NULL THEN v_type := 'survey'; END IF;
  END IF;

  IF v_type IS NULL THEN
    IF COALESCE((v_cons->>'personalization')::boolean, false) THEN
      v_ref := public.dimension_lesson(_uid, true)::text;
    END IF;
    IF v_ref IS NULL THEN v_ref := public.next_stage_lesson(_uid)::text; END IF;
    IF v_ref IS NOT NULL THEN v_type := 'lesson'; END IF;
  END IF;

  IF v_type IS NULL AND (public.has_active_subscription(_uid,'live') OR public.has_active_subscription(_uid,'sandbox')) THEN
    SELECT o.id::text INTO v_ref FROM public.civic_offices o
     WHERE NOT EXISTS (SELECT 1 FROM public.user_points_ledger p WHERE p.user_id=_uid AND p.event_type='civic_action' AND p.source_id = o.id::text)
     ORDER BY o.office_title LIMIT 1;
    IF v_ref IS NOT NULL THEN v_type := 'office_action'; END IF;
  END IF;

  IF v_type IS NULL THEN v_type := 'my_city'; v_ref := NULL; END IF;

  SELECT * INTO cur FROM public.user_journey_next_step WHERE user_id=_uid;
  IF NOT FOUND OR cur.step_type <> v_type OR cur.step_ref IS DISTINCT FROM v_ref OR cur.completed_at IS NOT NULL THEN
    INSERT INTO public.user_journey_next_step (user_id, step_type, step_ref, set_at, completed_at)
    VALUES (_uid, v_type, v_ref, now(), NULL)
    ON CONFLICT (user_id) DO UPDATE SET step_type=EXCLUDED.step_type, step_ref=EXCLUDED.step_ref, set_at=now(), completed_at=NULL;
    INSERT INTO public.journey_step_history (user_id, step_type, step_ref) VALUES (_uid, v_type, v_ref);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.award_points(_uid uuid, _event text, _points integer, _source text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur record;
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;
  IF _event <> 'civic_action' AND EXISTS (
    SELECT 1 FROM public.user_points_ledger WHERE user_id=_uid AND event_type=_event AND source_id IS NOT DISTINCT FROM _source) THEN
    RETURN 0;
  END IF;
  INSERT INTO public.user_points_ledger (user_id, event_type, points, source_id) VALUES (_uid, _event, _points, _source);

  SELECT * INTO cur FROM public.user_journey_next_step WHERE user_id=_uid;
  IF FOUND AND cur.completed_at IS NULL AND (
     (cur.step_type='compass' AND _event='compass_complete') OR
     (cur.step_type='lesson' AND _event='lesson_complete' AND cur.step_ref=_source) OR
     (cur.step_type='survey' AND _event='survey_answer' AND cur.step_ref=_source) OR
     (cur.step_type='office_action' AND _event='civic_action' AND cur.step_ref=_source)) THEN
    UPDATE public.user_journey_next_step SET completed_at=now() WHERE user_id=_uid;
    UPDATE public.journey_step_history SET completed_at=now()
     WHERE user_id=_uid AND step_type=cur.step_type AND step_ref IS NOT DISTINCT FROM cur.step_ref AND completed_at IS NULL;
  END IF;

  PERFORM public.recompute_next_step(_uid);
  RETURN _points;
EXCEPTION WHEN unique_violation THEN
  RETURN 0;
END $$;

REVOKE ALL ON FUNCTION public.award_points(uuid,text,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_next_step(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_stage_lesson(uuid,uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dimension_lesson(uuid,boolean,uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_lesson_done(uuid,uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.persona_label(_scores jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE r record; v_short text[] := '{}'; v_names text[] := '{}'; v_label text;
BEGIN
  FOR r IN SELECT d.slug, d.name, (_scores->>d.slug)::numeric AS s FROM public.compass_dimensions d
            WHERE _scores ? d.slug AND (_scores->>d.slug)::numeric >= 0.6
            ORDER BY (_scores->>d.slug)::numeric DESC LIMIT 2 LOOP
    v_names := v_names || replace(r.name, '&', 'and');
    v_short := v_short || CASE r.slug
      WHEN 'local-accountability' THEN 'accountability'
      WHEN 'economic-opportunity' THEN 'opportunity'
      WHEN 'public-safety' THEN 'safety'
      WHEN 'housing-development' THEN 'housing'
      WHEN 'education-youth' THEN 'schools'
      WHEN 'health-wellbeing' THEN 'health'
      WHEN 'infrastructure-mobility' THEN 'getting around'
      WHEN 'civic-participation' THEN 'your voice'
      ELSE lower(r.name) END;
  END LOOP;
  IF array_length(v_short,1) IS NULL THEN
    v_label := 'Sees many sides';
  ELSIF array_length(v_short,1) = 1 THEN
    v_label := initcap(left(v_short[1],1)) || substr(v_short[1],2) || ' first';
  ELSE
    v_label := upper(left(v_short[1],1)) || substr(v_short[1],2) || ' and ' || v_short[2];
  END IF;
  RETURN jsonb_build_object('primary', v_label, 'lead_name', v_names[1], 'top_names', to_jsonb(v_names));
END $$;

CREATE OR REPLACE FUNCTION public.complete_compass_session(_session_id uuid, _personalization boolean, _research boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid(); v_new jsonb := '{}'::jsonb; v_prior jsonb; v_blend jsonb := '{}'::jsonb;
  r record; v_labels jsonb; v_pts integer; v_total integer;
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

  UPDATE public.compass_sessions SET completed_at = COALESCE(completed_at, now()) WHERE id=_session_id;

  SELECT dimension_scores INTO v_prior FROM public.user_civic_persona WHERE user_id=caller;
  FOR r IN SELECT key, value FROM jsonb_each(v_new) LOOP
    IF v_prior ? r.key THEN
      v_blend := v_blend || jsonb_build_object(r.key, ROUND(0.7 * (r.value)::text::numeric + 0.3 * (v_prior->>r.key)::numeric, 3));
    ELSE
      v_blend := v_blend || jsonb_build_object(r.key, r.value);
    END IF;
  END LOOP;
  v_labels := public.persona_label(v_blend);

  INSERT INTO public.user_civic_persona (user_id, dimension_scores, persona_labels, consent_scope, last_updated)
  VALUES (caller, v_blend, v_labels, jsonb_build_object('personalization', COALESCE(_personalization,false), 'research', COALESCE(_research,false)), now())
  ON CONFLICT (user_id) DO UPDATE SET dimension_scores=EXCLUDED.dimension_scores, persona_labels=EXCLUDED.persona_labels,
    consent_scope=EXCLUDED.consent_scope, last_updated=now();

  v_pts := public.award_points(caller, 'compass_complete', 50, _session_id::text);
  IF v_pts = 0 THEN PERFORM public.recompute_next_step(caller); END IF;
  SELECT COALESCE(SUM(points),0) INTO v_total FROM public.user_points_ledger WHERE user_id=caller;

  RETURN jsonb_build_object('points_awarded', v_pts, 'total_points', v_total, 'stage', public.stage_name_for(v_total),
    'label', CASE WHEN _personalization THEN v_labels->>'primary' END);
END $$;

CREATE OR REPLACE FUNCTION public.award_report_unlock(_session_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.compass_sessions WHERE id=_session_id AND user_id=caller AND completed_at IS NOT NULL) THEN RETURN 0; END IF;
  IF NOT (public.has_active_subscription(caller,'live') OR public.has_active_subscription(caller,'sandbox') OR public.is_admin(caller)) THEN RETURN 0; END IF;
  RETURN public.award_points(caller, 'report_unlock', 25, _session_id::text);
END $$;

CREATE OR REPLACE FUNCTION public.log_civic_action(_office_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); v_last timestamptz;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  SELECT MAX(created_at) INTO v_last FROM public.user_points_ledger WHERE user_id=caller AND event_type='civic_action';
  IF v_last IS NOT NULL AND v_last > now() - interval '7 days' THEN
    RETURN jsonb_build_object('ok', false, 'next_allowed_at', v_last + interval '7 days');
  END IF;
  PERFORM public.award_points(caller, 'civic_action', 30, _office_id::text);
  RETURN jsonb_build_object('ok', true, 'points', 30);
END $$;

CREATE OR REPLACE FUNCTION public.award_survey_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.award_points(NEW.user_id, 'survey_answer', 15, NEW.survey_id::text);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER survey_responses_award_points AFTER INSERT ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.award_survey_points();

CREATE OR REPLACE FUNCTION public.lesson_brief(_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _id IS NULL THEN NULL ELSE (
    SELECT jsonb_build_object('id', l.id, 'title', l.title, 'minutes', COALESCE(l.estimated_minutes,3),
      'dimension', d.name, 'dimension_slug', d.slug, 'track_id', l.track_id)
    FROM public.lessons l LEFT JOIN public.compass_dimensions d ON d.id=l.dimension_id WHERE l.id=_id) END
$$;

CREATE OR REPLACE FUNCTION public.get_my_path()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); v_pers boolean := false; v_weak uuid; v_top uuid; v_stage uuid; v_total int;
BEGIN
  IF caller IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE((consent_scope->>'personalization')::boolean,false) INTO v_pers FROM public.user_civic_persona WHERE user_id=caller;
  v_pers := COALESCE(v_pers,false);
  IF v_pers THEN
    v_weak := public.dimension_lesson(caller, true);
    v_top := public.dimension_lesson(caller, false, ARRAY_REMOVE(ARRAY[v_weak], NULL));
  END IF;
  v_stage := public.next_stage_lesson(caller, ARRAY_REMOVE(ARRAY[v_weak, v_top], NULL));
  INSERT INTO public.learn_path_offers (user_id, lesson_id, slot)
    SELECT caller, x.id, x.slot FROM (VALUES (v_weak,'weakest'),(v_top,'top'),(v_stage,'stage')) AS x(id, slot)
    WHERE x.id IS NOT NULL ON CONFLICT (user_id, lesson_id) DO NOTHING;
  SELECT COALESCE(SUM(points),0) INTO v_total FROM public.user_points_ledger WHERE user_id=caller;
  RETURN jsonb_build_object('personalization', v_pers, 'stage', public.stage_name_for(v_total),
    'weakest', public.lesson_brief(v_weak), 'top', public.lesson_brief(v_top), 'stage_lesson', public.lesson_brief(v_stage));
END $$;

CREATE OR REPLACE FUNCTION public.get_my_journey()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); p record; v_pers boolean; v_total int; st record; nx record; ns record; v_step jsonb; v_title text;
BEGIN
  IF caller IS NULL THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_journey_next_step WHERE user_id=caller) THEN
    PERFORM public.recompute_next_step(caller);
  END IF;
  SELECT * INTO p FROM public.user_civic_persona WHERE user_id=caller;
  v_pers := COALESCE((p.consent_scope->>'personalization')::boolean, false);
  SELECT COALESCE(SUM(points),0) INTO v_total FROM public.user_points_ledger WHERE user_id=caller;
  SELECT * INTO st FROM public.civic_journey_stages WHERE min_points <= v_total ORDER BY min_points DESC LIMIT 1;
  SELECT * INTO ns FROM public.civic_journey_stages WHERE min_points > v_total ORDER BY min_points LIMIT 1;
  SELECT * INTO nx FROM public.user_journey_next_step WHERE user_id=caller;
  v_title := CASE nx.step_type
    WHEN 'lesson' THEN (SELECT title FROM public.lessons WHERE id::text = nx.step_ref)
    WHEN 'survey' THEN (SELECT title FROM public.surveys WHERE id::text = nx.step_ref)
    WHEN 'office_action' THEN (SELECT office_title || COALESCE(', ' || current_holder,'') FROM public.civic_offices WHERE id::text = nx.step_ref)
    ELSE NULL END;
  v_step := jsonb_build_object('type', nx.step_type, 'ref', nx.step_ref, 'title', v_title, 'set_at', nx.set_at);

  RETURN jsonb_build_object(
    'personalization', v_pers,
    'research', COALESCE((p.consent_scope->>'research')::boolean, false),
    'label', CASE WHEN v_pers THEN p.persona_labels->>'primary' END,
    'lead_name', CASE WHEN v_pers THEN p.persona_labels->>'lead_name' END,
    'dimension_scores', CASE WHEN v_pers THEN p.dimension_scores END,
    'total_points', v_total,
    'stage', st.name, 'next_stage', ns.name, 'next_stage_points', ns.min_points,
    'next_step', v_step,
    'latest_compass_at', (SELECT MAX(completed_at) FROM public.compass_sessions WHERE user_id=caller),
    'confidence', CASE WHEN v_pers THEN (SELECT COALESCE(jsonb_agg(jsonb_build_object('score', c.confidence_score, 'at', c.last_updated) ORDER BY c.last_updated), '[]'::jsonb)
                       FROM public.civic_confidence c WHERE c.user_id=caller) END,
    'history', (SELECT COALESCE(jsonb_agg(h ORDER BY (h->>'at') DESC), '[]'::jsonb) FROM (
       SELECT jsonb_build_object('event', l.event_type, 'points', l.points, 'at', l.created_at,
         'title', CASE l.event_type
           WHEN 'lesson_complete' THEN (SELECT title FROM public.lessons WHERE id::text = l.source_id)
           WHEN 'survey_answer' THEN (SELECT title FROM public.surveys WHERE id::text = l.source_id)
           WHEN 'civic_action' THEN (SELECT office_title FROM public.civic_offices WHERE id::text = l.source_id)
           ELSE NULL END) AS h
       FROM public.user_points_ledger l WHERE l.user_id=caller ORDER BY l.created_at DESC LIMIT 50) s)
  );
END $$;

CREATE OR REPLACE FUNCTION public.journey_research_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  RETURN (
  WITH r AS (SELECT user_id, persona_labels FROM public.user_civic_persona WHERE COALESCE((consent_scope->>'research')::boolean,false)),
  pts AS (SELECT r.user_id,
      COALESCE((SELECT SUM(points) FROM public.user_points_ledger l WHERE l.user_id=r.user_id),0)::int AS now_p,
      COALESCE((SELECT SUM(points) FROM public.user_points_ledger l WHERE l.user_id=r.user_id AND l.created_at < now() - interval '30 days'),0)::int AS old_p
    FROM r)
  SELECT jsonb_build_object(
    'research_users', (SELECT count(*) FROM r),
    'identities', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC), '[]'::jsonb)
       FROM (SELECT COALESCE(persona_labels->>'primary','No label yet') label, count(*) n FROM r GROUP BY 1) x),
    'stages', (SELECT COALESCE(jsonb_agg(jsonb_build_object('stage', s.name, 'count',
         (SELECT count(*) FROM pts WHERE public.stage_name_for(now_p)=s.name),
       'moved_in', (SELECT count(*) FROM pts WHERE public.stage_name_for(now_p)=s.name AND public.stage_name_for(old_p)<>s.name)) ORDER BY s.min_points), '[]'::jsonb)
       FROM public.civic_journey_stages s),
    'moved_up_30d', (SELECT count(*) FROM pts WHERE public.stage_name_for(now_p) <> public.stage_name_for(old_p)),
    'next_steps', (SELECT COALESCE(jsonb_agg(jsonb_build_object('type', step_type, 'set', n, 'completed', c) ORDER BY step_type), '[]'::jsonb)
       FROM (SELECT h.step_type, count(*) n, count(h.completed_at) c FROM public.journey_step_history h JOIN r ON r.user_id=h.user_id GROUP BY 1) x),
    'path_by_dimension', (SELECT COALESCE(jsonb_agg(jsonb_build_object('dimension', dim, 'offered', n, 'completed', c) ORDER BY dim), '[]'::jsonb)
       FROM (SELECT COALESCE(d.name,'No issue tag') dim, count(*) n, count(o.completed_at) c
             FROM public.learn_path_offers o JOIN r ON r.user_id=o.user_id
             JOIN public.lessons l ON l.id=o.lesson_id LEFT JOIN public.compass_dimensions d ON d.id=l.dimension_id GROUP BY 1) x)
  ));
END $$;

CREATE OR REPLACE FUNCTION public.award_lesson_completion(_lesson_id uuid, _quiz_score integer, _time_spent_seconds integer)
 RETURNS TABLE(xp_awarded integer, new_total_xp integer, new_streak integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  v_xp integer := 0; v_total_xp integer := 0; v_streak integer := 1; v_last_date date;
  v_today date := (now() AT TIME ZONE 'UTC')::date; v_yesterday date := v_today - 1;
  v_passed boolean := COALESCE(_quiz_score, 0) >= 75;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(xp_reward, 0) INTO v_xp FROM public.lessons WHERE id = _lesson_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lesson not found' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.user_lesson_progress (user_id, lesson_id, status, score, quiz_score, time_spent_seconds, quiz_attempts, completed_at)
  VALUES (caller, _lesson_id, 'completed', COALESCE(_quiz_score, 0), COALESCE(_quiz_score, 0), GREATEST(COALESCE(_time_spent_seconds, 0), 0), 1, now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET status = 'completed', score = EXCLUDED.score, quiz_score = EXCLUDED.quiz_score,
        time_spent_seconds = EXCLUDED.time_spent_seconds,
        quiz_attempts = COALESCE(public.user_lesson_progress.quiz_attempts, 0) + 1, completed_at = now();

  INSERT INTO public.civic_scores (user_id, total_xp, lessons_completed, quizzes_passed, civic_literacy_score)
  VALUES (caller, v_xp, 1, CASE WHEN v_passed THEN 1 ELSE 0 END, 5)
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = COALESCE(public.civic_scores.total_xp, 0) + v_xp,
        lessons_completed = COALESCE(public.civic_scores.lessons_completed, 0) + 1,
        quizzes_passed = COALESCE(public.civic_scores.quizzes_passed, 0) + CASE WHEN v_passed THEN 1 ELSE 0 END,
        civic_literacy_score = LEAST(100, COALESCE(public.civic_scores.civic_literacy_score, 0) + 5);
  SELECT total_xp INTO v_total_xp FROM public.civic_scores WHERE user_id = caller;

  SELECT last_active_date INTO v_last_date FROM public.streaks WHERE user_id = caller;
  IF v_last_date IS NULL THEN
    INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_active_date) VALUES (caller, 1, 1, v_today);
    v_streak := 1;
  ELSIF v_last_date = v_today THEN
    SELECT current_streak INTO v_streak FROM public.streaks WHERE user_id = caller;
  ELSIF v_last_date = v_yesterday THEN
    UPDATE public.streaks SET current_streak = COALESCE(current_streak, 0) + 1,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(current_streak, 0) + 1), last_active_date = v_today
     WHERE user_id = caller RETURNING current_streak INTO v_streak;
  ELSE
    UPDATE public.streaks SET current_streak = 1, longest_streak = GREATEST(COALESCE(longest_streak, 0), 1), last_active_date = v_today
     WHERE user_id = caller RETURNING current_streak INTO v_streak;
  END IF;

  UPDATE public.learn_path_offers SET completed_at = now() WHERE user_id = caller AND lesson_id = _lesson_id AND completed_at IS NULL;
  PERFORM public.award_points(caller, 'lesson_complete', 25, _lesson_id::text);

  RETURN QUERY SELECT v_xp, v_total_xp, v_streak;
END;
$function$;
