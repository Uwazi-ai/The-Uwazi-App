CREATE TABLE public.survey_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  intro text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_dimension_filter jsonb,
  delivery_channel text NOT NULL DEFAULT 'in_app',
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_definitions TO authenticated;
GRANT ALL ON public.survey_definitions TO service_role;
ALTER TABLE public.survey_definitions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.survey_dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.survey_definitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'in_app',
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  responded_at timestamptz,
  response_id uuid,
  UNIQUE (survey_id, user_id, channel)
);
GRANT SELECT ON public.survey_dispatch TO authenticated;
GRANT ALL ON public.survey_dispatch TO service_role;
ALTER TABLE public.survey_dispatch ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.survey_definitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, user_id)
);
GRANT SELECT ON public.research_survey_responses TO authenticated;
GRANT ALL ON public.research_survey_responses TO service_role;
ALTER TABLE public.research_survey_responses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.survey_dispatch ADD CONSTRAINT survey_dispatch_response_fk
  FOREIGN KEY (response_id) REFERENCES public.research_survey_responses(id) ON DELETE SET NULL;

CREATE POLICY "Super admins manage survey definitions" ON public.survey_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "People read surveys sent to them" ON public.survey_definitions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.survey_dispatch d WHERE d.survey_id = id AND d.user_id = auth.uid()));
CREATE POLICY "People read their own dispatch" ON public.survey_dispatch FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "People read their own research answers" ON public.research_survey_responses FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER survey_definitions_updated BEFORE UPDATE ON public.survey_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_survey_definition() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE q jsonb;
BEGIN
  IF NEW.delivery_channel NOT IN ('in_app','email','both') THEN RAISE EXCEPTION 'Bad delivery channel'; END IF;
  IF jsonb_typeof(NEW.questions) <> 'array' THEN RAISE EXCEPTION 'Questions must be a list'; END IF;
  FOR q IN SELECT * FROM jsonb_array_elements(NEW.questions) LOOP
    IF COALESCE(q->>'id','') = '' OR COALESCE(q->>'prompt','') = '' THEN RAISE EXCEPTION 'Each question needs an id and a prompt'; END IF;
    IF q->>'type' NOT IN ('single_choice','multi_choice','scale','short_text') THEN RAISE EXCEPTION 'Bad question type'; END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER survey_definitions_validate BEFORE INSERT OR UPDATE ON public.survey_definitions
  FOR EACH ROW EXECUTE FUNCTION public.validate_survey_definition();

-- Does a person match a filter? Filter: {"personas":[slugs], "dimensions":{slug:{"min":0.6,"max":1}}}
CREATE OR REPLACE FUNCTION public.survey_matches(_uid uuid, _filter jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p record; k text; v jsonb; s numeric;
BEGIN
  SELECT * INTO p FROM public.user_civic_persona WHERE user_id=_uid;
  IF NOT FOUND OR NOT COALESCE((p.consent_scope->>'research')::boolean,false) THEN RETURN false; END IF;
  IF _filter IS NULL OR _filter = '{}'::jsonb THEN RETURN true; END IF;
  IF jsonb_typeof(_filter->'personas')='array' AND jsonb_array_length(_filter->'personas')>0 THEN
    IF NOT (_filter->'personas') ? COALESCE(p.persona_labels->>'persona','') THEN RETURN false; END IF;
  END IF;
  IF jsonb_typeof(_filter->'dimensions')='object' THEN
    FOR k, v IN SELECT * FROM jsonb_each(_filter->'dimensions') LOOP
      s := COALESCE((p.dimension_scores->>k)::numeric, 0);
      IF v ? 'min' AND s < (v->>'min')::numeric THEN RETURN false; END IF;
      IF v ? 'max' AND s > (v->>'max')::numeric THEN RETURN false; END IF;
    END LOOP;
  END IF;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.survey_matches(uuid,jsonb) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.preview_survey_targets(_filter jsonb) RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  RETURN (SELECT count(*) FROM public.user_civic_persona p WHERE public.survey_matches(p.user_id, _filter));
END $$;

-- Internal: dispatch one survey to everyone who matches and has not got it yet.
CREATE OR REPLACE FUNCTION public.dispatch_survey_internal(_survey_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s record; n integer := 0; u uuid;
BEGIN
  SELECT * INTO s FROM public.survey_definitions WHERE id=_survey_id;
  IF NOT FOUND OR NOT s.active OR (s.ends_at IS NOT NULL AND s.ends_at <= now()) OR (s.starts_at IS NOT NULL AND s.starts_at > now()) THEN RETURN 0; END IF;
  FOR u IN SELECT p.user_id FROM public.user_civic_persona p
    WHERE public.survey_matches(p.user_id, s.target_dimension_filter)
      AND NOT EXISTS (SELECT 1 FROM public.survey_dispatch d WHERE d.survey_id=_survey_id AND d.user_id=p.user_id AND d.channel='in_app')
  LOOP
    INSERT INTO public.survey_dispatch (survey_id, user_id, channel, delivered_at) VALUES (_survey_id, u, 'in_app', now())
      ON CONFLICT DO NOTHING;
    PERFORM public.recompute_next_step(u);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.dispatch_survey_internal(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.send_research_survey(_survey_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  UPDATE public.survey_definitions SET active=true, starts_at=LEAST(COALESCE(starts_at, now()), now()) WHERE id=_survey_id;
  RETURN public.dispatch_survey_internal(_survey_id);
END $$;

-- Hourly: send scheduled surveys once their start time arrives, and reach people who newly match.
CREATE OR REPLACE FUNCTION public.dispatch_due_surveys() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s record; n integer := 0;
BEGIN
  FOR s IN SELECT id FROM public.survey_definitions WHERE active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()) LOOP
    n := n + public.dispatch_survey_internal(s.id);
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.dispatch_due_surveys() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_research_surveys() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN '[]'::jsonb; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_civic_persona WHERE user_id=caller AND COALESCE((consent_scope->>'research')::boolean,false)) THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'intro', s.intro, 'questions', s.questions, 'ends_at', s.ends_at) ORDER BY d.sent_at)
    FROM public.survey_dispatch d JOIN public.survey_definitions s ON s.id=d.survey_id
    WHERE d.user_id=caller AND d.responded_at IS NULL AND s.active
      AND (s.starts_at IS NULL OR s.starts_at <= now()) AND (s.ends_at IS NULL OR s.ends_at > now())), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.submit_research_survey(_survey_id uuid, _answers jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid := auth.uid(); s record; q jsonb; a jsonb; rid uuid; pts integer; opts jsonb;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_civic_persona WHERE user_id=caller AND COALESCE((consent_scope->>'research')::boolean,false)) THEN
    RAISE EXCEPTION 'Research is turned off for you' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.survey_dispatch WHERE survey_id=_survey_id AND user_id=caller) THEN
    RAISE EXCEPTION 'This survey was not sent to you' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM public.survey_definitions WHERE id=_survey_id;
  IF NOT s.active OR (s.ends_at IS NOT NULL AND s.ends_at <= now()) THEN RAISE EXCEPTION 'This survey has ended'; END IF;
  IF EXISTS (SELECT 1 FROM public.research_survey_responses WHERE survey_id=_survey_id AND user_id=caller) THEN
    RAISE EXCEPTION 'You already answered this survey'; END IF;
  IF jsonb_typeof(_answers) <> 'object' THEN RAISE EXCEPTION 'Bad answers'; END IF;
  FOR q IN SELECT * FROM jsonb_array_elements(s.questions) LOOP
    a := _answers->(q->>'id');
    IF a IS NULL THEN CONTINUE; END IF;
    opts := COALESCE(q->'options','[]'::jsonb);
    IF q->>'type'='single_choice' AND NOT (jsonb_typeof(a)='string' AND opts ? (a#>>'{}')) THEN RAISE EXCEPTION 'Bad answer'; END IF;
    IF q->>'type'='multi_choice' AND NOT (jsonb_typeof(a)='array' AND opts @> a) THEN RAISE EXCEPTION 'Bad answer'; END IF;
    IF q->>'type'='scale' AND NOT (jsonb_typeof(a)='number' AND (a#>>'{}')::numeric BETWEEN 1 AND 5) THEN RAISE EXCEPTION 'Bad answer'; END IF;
    IF q->>'type'='short_text' AND NOT (jsonb_typeof(a)='string' AND length(a#>>'{}') <= 500) THEN RAISE EXCEPTION 'Bad answer'; END IF;
  END LOOP;
  INSERT INTO public.research_survey_responses (survey_id, user_id, answers) VALUES (_survey_id, caller, _answers) RETURNING id INTO rid;
  UPDATE public.survey_dispatch SET responded_at=now(), response_id=rid WHERE survey_id=_survey_id AND user_id=caller;
  pts := public.award_points(caller, 'survey_answer', 15, _survey_id::text);
  PERFORM public.recompute_next_step(caller);
  RETURN pts;
END $$;

CREATE OR REPLACE FUNCTION public.research_survey_results(_survey_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s record; q jsonb; out jsonb := '[]'::jsonb; counts jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM public.survey_definitions WHERE id=_survey_id;
  FOR q IN SELECT * FROM jsonb_array_elements(s.questions) LOOP
    IF q->>'type' = 'short_text' THEN
      counts := jsonb_build_object('answered', (SELECT count(*) FROM public.research_survey_responses r WHERE r.survey_id=_survey_id AND COALESCE(r.answers->>(q->>'id'),'') <> ''));
    ELSIF q->>'type' = 'multi_choice' THEN
      counts := COALESCE((SELECT jsonb_object_agg(x, c) FROM (SELECT x, count(*) c FROM public.research_survey_responses r, jsonb_array_elements_text(COALESCE(r.answers->(q->>'id'),'[]'::jsonb)) x WHERE r.survey_id=_survey_id GROUP BY x) t), '{}'::jsonb);
    ELSE
      counts := COALESCE((SELECT jsonb_object_agg(x, c) FROM (SELECT r.answers->>(q->>'id') x, count(*) c FROM public.research_survey_responses r WHERE r.survey_id=_survey_id AND r.answers ? (q->>'id') GROUP BY 1) t), '{}'::jsonb);
    END IF;
    out := out || jsonb_build_array(jsonb_build_object('id', q->>'id', 'prompt', q->>'prompt', 'type', q->>'type', 'options', q->'options', 'counts', counts));
  END LOOP;
  RETURN jsonb_build_object('responses', (SELECT count(*) FROM public.research_survey_responses WHERE survey_id=_survey_id), 'questions', out);
END $$;

CREATE OR REPLACE FUNCTION public.research_survey_stats() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'active', s.active,
      'sent', (SELECT count(*) FROM public.survey_dispatch d WHERE d.survey_id=s.id),
      'responses', (SELECT count(*) FROM public.research_survey_responses r WHERE r.survey_id=s.id)) ORDER BY s.created_at DESC)
    FROM public.survey_definitions s), '[]'::jsonb);
END $$;

-- Next step: research surveys sent to the person come first among surveys.
CREATE OR REPLACE FUNCTION public.recompute_next_step(_uid uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_last timestamptz; v_cons jsonb; v_type text; v_ref text; cur record; v_lean text; v_office text;
BEGIN
  SELECT MAX(completed_at) INTO v_last FROM public.compass_sessions WHERE user_id=_uid AND completed_at IS NOT NULL;
  SELECT consent_scope INTO v_cons FROM public.user_civic_persona WHERE user_id=_uid;
  IF COALESCE((v_cons->>'personalization')::boolean, false) THEN
    SELECT cp.next_step_lean INTO v_lean FROM public.user_civic_persona p JOIN public.compass_personas cp ON cp.slug = p.persona_labels->>'persona' WHERE p.user_id=_uid;
  END IF;

  IF v_last IS NULL OR v_last < now() - interval '90 days' THEN
    v_type := 'compass';
  END IF;

  IF v_type IS NULL AND COALESCE((v_cons->>'research')::boolean, false) THEN
    SELECT s.id::text INTO v_ref FROM public.survey_dispatch d JOIN public.survey_definitions s ON s.id=d.survey_id
     WHERE d.user_id=_uid AND d.responded_at IS NULL AND s.active
       AND (s.starts_at IS NULL OR s.starts_at <= now()) AND (s.ends_at IS NULL OR s.ends_at > now())
     ORDER BY d.sent_at LIMIT 1;
    IF v_ref IS NULL THEN
      SELECT s.id::text INTO v_ref FROM public.surveys s
       WHERE s.status = 'active' AND COALESCE(s.show_in_app, true)
         AND (s.starts_at IS NULL OR s.starts_at <= now()) AND (s.ends_at IS NULL OR s.ends_at > now())
         AND NOT EXISTS (SELECT 1 FROM public.survey_responses r WHERE r.survey_id = s.id AND r.user_id = _uid)
       ORDER BY s.created_at LIMIT 1;
    END IF;
    IF v_ref IS NOT NULL THEN v_type := 'survey'; END IF;
  END IF;

  IF v_type IS NULL THEN
    IF COALESCE((v_cons->>'personalization')::boolean, false) THEN
      v_ref := public.dimension_lesson(_uid, true)::text;
    END IF;
    IF v_ref IS NULL THEN v_ref := public.next_stage_lesson(_uid)::text; END IF;
    IF v_ref IS NOT NULL THEN v_type := 'lesson'; END IF;
  END IF;

  IF v_type IS NULL THEN
    IF public.has_active_subscription(_uid,'live') OR public.has_active_subscription(_uid,'sandbox') THEN
      SELECT o.id::text INTO v_office FROM public.civic_offices o
       WHERE NOT EXISTS (SELECT 1 FROM public.user_points_ledger p WHERE p.user_id=_uid AND p.event_type='civic_action' AND p.source_id = o.id::text)
       ORDER BY o.office_title LIMIT 1;
    END IF;
    IF v_office IS NOT NULL AND v_lean IS DISTINCT FROM 'my_city' THEN
      v_type := 'office_action'; v_ref := v_office;
    ELSE
      v_type := 'my_city'; v_ref := NULL;
    END IF;
  END IF;

  SELECT * INTO cur FROM public.user_journey_next_step WHERE user_id=_uid;
  IF NOT FOUND OR cur.step_type <> v_type OR cur.step_ref IS DISTINCT FROM v_ref OR cur.completed_at IS NOT NULL THEN
    INSERT INTO public.user_journey_next_step (user_id, step_type, step_ref, set_at, completed_at)
    VALUES (_uid, v_type, v_ref, now(), NULL)
    ON CONFLICT (user_id) DO UPDATE SET step_type=EXCLUDED.step_type, step_ref=EXCLUDED.step_ref, set_at=now(), completed_at=NULL;
    INSERT INTO public.journey_step_history (user_id, step_type, step_ref) VALUES (_uid, v_type, v_ref);
  END IF;
END $function$;