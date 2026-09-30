CREATE TABLE public.compass_personas (
  slug text PRIMARY KEY,
  name text NOT NULL,
  top_dimension_slug text UNIQUE,
  one_line text NOT NULL,
  strength text NOT NULL,
  blind_spot text NOT NULL,
  color text NOT NULL,
  icon_key text NOT NULL,
  next_step_lean text NOT NULL DEFAULT 'lesson',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.compass_personas TO anon, authenticated;
GRANT UPDATE ON public.compass_personas TO authenticated;
GRANT ALL ON public.compass_personas TO service_role;
ALTER TABLE public.compass_personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads personas" ON public.compass_personas FOR SELECT USING (true);
CREATE POLICY "Admins update personas" ON public.compass_personas FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_personas_updated BEFORE UPDATE ON public.compass_personas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.compass_personas (slug,name,top_dimension_slug,one_line,strength,blind_spot,color,icon_key,next_step_lean,sort_order) VALUES
('watchdog','The Watchdog','local-accountability','You want to see the receipts. Open records and clear votes matter most to you.',
 'You notice when something does not add up. You help keep leaders honest by asking clear questions and reading the record.',
 'Not every delay is a cover up, and sometimes a slow answer is just a busy office.','primary','landmark','office_action',1),
('builder','The Builder','economic-opportunity','You care about jobs, small business, and whether people can get ahead here.',
 'You see how a new shop or a good job can change a whole block. You bring energy to plans that help people earn and grow.',
 'Some of the best things a city does never show up on a paycheck.','orange','briefcase','my_city',2),
('guardian','The Guardian','public-safety','You want every street to feel safe and every call answered.',
 'You pay attention to what helps people feel safe walking home. You show up for the calls, lights, and crossings that protect a block.',
 'Safety can mean different things to different neighbors, so it helps to ask them.','blue','shield','office_action',3),
('neighbor','The Neighbor','housing-development','You care about who can afford to live here and what gets built next door.',
 'You notice who is moving in, who is moving out, and why. You speak up at the meetings where the next building gets decided.',
 'The block you know best is one of many, and other blocks may need different things.','coral','home','my_city',4),
('mentor','The Mentor','education-youth','You think a city is only as strong as what it gives its kids.',
 'You think about the kids who will grow up here next. You back the schools, programs, and places that help young people grow.',
 'Grown ups who are struggling need a hand too, and helping them helps kids as well.','purple','graduation','lesson',5),
('caretaker','The Caretaker','health-wellbeing','You measure a city by how it treats people when they are hurting.',
 'You notice who is being left out and who needs help first. You push for clinics, care, and support that reach people in time.',
 'Taking care of yourself matters too, so you can keep showing up for others.','teal','heart','lesson',6),
('connector','The Connector','infrastructure-mobility','You want buses that come, streets that work, and everyone able to get around.',
 'You see how roads, buses, and sidewalks link people to jobs, school, and each other. You speak up for the everyday trips most people never think about.',
 'A fix that works for your route may not work for every route.','sky','bus','my_city',7),
('organizer','The Organizer','civic-participation','You believe the answer is more people at the table.',
 'You bring people in and help them find their voice. You know a meeting changes when more neighbors show up.',
 'Some people help in quiet ways, and that counts too.','gold','vote','survey',8),
('steward','The Steward',NULL,'You see the whole picture and refuse to pick just one fight.',
 'You keep many needs in mind at once and see how they connect. You help a group find a plan that works for more people.',
 'Seeing every side is a gift, and sometimes it helps to pick one thing and push hard on it.','silver','compass','lesson',9);

CREATE TABLE public.persona_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  persona text NOT NULL,
  streak text,
  source text NOT NULL DEFAULT 'quiz',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.persona_history TO authenticated;
GRANT ALL ON public.persona_history TO service_role;
ALTER TABLE public.persona_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own persona history" ON public.persona_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX persona_history_user_idx ON public.persona_history (user_id, created_at);

ALTER TABLE public.identity_feedback ADD COLUMN IF NOT EXISTS chosen_persona text;

-- Persona assignment from scores
CREATE OR REPLACE FUNCTION public.persona_label(_scores jsonb)
 RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE r record; v_short text[] := '{}'; v_names text[] := '{}'; v_label text;
  v_top_slugs text[] := '{}'; v_s1 numeric; v_s2 numeric; v_rule text; v_persona text; v_streak text;
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

  IF v_rule = 'balanced' OR v_top_slugs[1] IS NULL THEN
    v_persona := 'steward'; v_streak := NULL;
  ELSE
    SELECT slug INTO v_persona FROM public.compass_personas WHERE top_dimension_slug = v_top_slugs[1];
    v_persona := COALESCE(v_persona, 'steward');
    IF v_s2 IS NOT NULL AND v_s2 >= 0.6 THEN
      SELECT slug INTO v_streak FROM public.compass_personas WHERE top_dimension_slug = v_top_slugs[2];
    END IF;
  END IF;

  RETURN jsonb_build_object('primary', v_label, 'lead_name', CASE WHEN v_rule='balanced' THEN NULL ELSE v_names[1] END,
    'top_names', to_jsonb(v_names), 'top_slugs', to_jsonb(COALESCE(v_top_slugs,'{}')), 'rule', v_rule,
    'persona', v_persona, 'streak', v_streak, 'evidence', NULL);
END $function$;

-- Evidence from the person's latest $100 split
CREATE OR REPLACE FUNCTION public.persona_evidence(_uid uuid, _persona text)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_bucket text; v_words text; v_amt int; v_alloc jsonb;
BEGIN
  v_bucket := CASE _persona WHEN 'guardian' THEN 'safety' WHEN 'neighbor' THEN 'housing' WHEN 'mentor' THEN 'schools_youth'
    WHEN 'connector' THEN 'streets_transit' WHEN 'caretaker' THEN 'health' WHEN 'builder' THEN 'jobs' END;
  IF v_bucket IS NULL THEN RETURN NULL; END IF;
  SELECT b.allocation INTO v_alloc FROM public.compass_budget_priorities b JOIN public.compass_sessions s ON s.id=b.session_id
   WHERE s.user_id=_uid ORDER BY b.created_at DESC LIMIT 1;
  v_amt := (v_alloc->>v_bucket)::int;
  IF v_amt IS NULL OR v_amt < 30 THEN RETURN NULL; END IF;
  v_words := CASE v_bucket WHEN 'safety' THEN 'safety' WHEN 'housing' THEN 'housing' WHEN 'schools_youth' THEN 'schools and youth'
    WHEN 'streets_transit' THEN 'streets and transit' WHEN 'health' THEN 'health' WHEN 'jobs' THEN 'jobs' END;
  RETURN 'Your $100 agrees. You put $' || v_amt || ' on ' || v_words || '.';
END $function$;
REVOKE ALL ON FUNCTION public.persona_evidence(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_compass_session(_session_id uuid, _personalization boolean, _research boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid(); v_new jsonb := '{}'::jsonb; v_prior jsonb; v_blend jsonb := '{}'::jsonb;
  r record; v_labels jsonb; v_pts integer; v_total integer; v_ev text;
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

CREATE OR REPLACE FUNCTION public.choose_identity_dimension(_slug text, _session_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); p record; v_name text; v_short text; v_label text; v_top text[];
  v_persona text; v_streak text; v_ev text;
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
  SELECT slug INTO v_persona FROM public.compass_personas WHERE top_dimension_slug = _slug;
  v_persona := COALESCE(v_persona, 'steward');
  v_streak := NULLIF(p.persona_labels->>'streak', v_persona);
  v_ev := public.persona_evidence(caller, v_persona);
  INSERT INTO public.identity_feedback (user_id, session_id, original_label, chosen_dimension, chosen_persona)
    VALUES (caller, _session_id, COALESCE(p.persona_labels->>'persona', p.persona_labels->>'primary'), _slug, v_persona);
  INSERT INTO public.persona_history (user_id, session_id, persona, streak, source) VALUES (caller, _session_id, v_persona, v_streak, 'self_chosen');
  UPDATE public.user_civic_persona SET persona_labels = persona_labels || jsonb_build_object(
      'primary', v_label, 'lead_name', v_name, 'rule', 'self_chosen', 'chosen_slug', _slug,
      'persona', v_persona, 'streak', v_streak, 'evidence', v_ev), last_updated = now()
   WHERE user_id = caller;
  RETURN jsonb_build_object('label', v_label, 'lead_name', v_name, 'persona', v_persona, 'streak', v_streak, 'evidence', v_ev);
END $function$;

-- Next step: persona lean breaks the tie between the last two options only.
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

CREATE OR REPLACE FUNCTION public.get_my_journey()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    'persona', CASE WHEN v_pers THEN p.persona_labels->>'persona' END,
    'streak', CASE WHEN v_pers THEN p.persona_labels->>'streak' END,
    'evidence', CASE WHEN v_pers THEN p.persona_labels->>'evidence' END,
    'persona_history', CASE WHEN v_pers THEN (SELECT COALESCE(jsonb_agg(jsonb_build_object('persona', h.persona, 'streak', h.streak, 'source', h.source, 'at', h.created_at) ORDER BY h.created_at), '[]'::jsonb)
                       FROM public.persona_history h WHERE h.user_id=caller) END,
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
END $function$;

CREATE OR REPLACE FUNCTION public.city_top_identity()
 RETURNS TABLE(label text, people integer, area text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_place text; v_zip text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT resolved->>'place' INTO v_place FROM user_districts WHERE user_id = auth.uid();
  IF v_place IS NULL THEN SELECT zip_code INTO v_zip FROM profiles WHERE user_id = auth.uid(); END IF;
  IF v_place IS NULL AND v_zip IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH pool AS (
    SELECT cp.name AS lbl FROM user_civic_persona p JOIN compass_personas cp ON cp.slug = p.persona_labels->>'persona'
    WHERE COALESCE((p.consent_scope->>'research')::boolean,false)
      AND ((v_place IS NOT NULL AND EXISTS (SELECT 1 FROM user_districts u WHERE u.user_id = p.user_id AND u.resolved->>'place' = v_place))
        OR (v_place IS NULL AND EXISTS (SELECT 1 FROM profiles pr WHERE pr.user_id = p.user_id AND pr.zip_code = v_zip)))
  ), tot AS (SELECT count(*)::int n FROM pool)
  SELECT pool.lbl, tot.n, CASE WHEN v_place IS NOT NULL THEN 'city' ELSE 'zip' END
  FROM pool, tot WHERE tot.n >= 25
  GROUP BY pool.lbl, tot.n ORDER BY count(*) DESC, pool.lbl LIMIT 1;
END $function$;

CREATE OR REPLACE FUNCTION public.journey_research_stats()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  RETURN (
  WITH r AS (SELECT user_id, persona_labels FROM public.user_civic_persona WHERE COALESCE((consent_scope->>'research')::boolean,false)),
  pts AS (SELECT r.user_id,
      COALESCE((SELECT SUM(points) FROM public.user_points_ledger l WHERE l.user_id=r.user_id),0)::int AS now_p,
      COALESCE((SELECT SUM(points) FROM public.user_points_ledger l WHERE l.user_id=r.user_id AND l.created_at < now() - interval '30 days'),0)::int AS old_p
    FROM r),
  qh AS (SELECT h.user_id, h.persona, h.created_at, lag(h.persona) OVER (PARTITION BY h.user_id ORDER BY h.created_at) prev
         FROM public.persona_history h JOIN r ON r.user_id=h.user_id WHERE h.source='quiz')
  SELECT jsonb_build_object(
    'research_users', (SELECT count(*) FROM r),
    'identities', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC), '[]'::jsonb)
       FROM (SELECT COALESCE(persona_labels->>'primary','No label yet') label, count(*) n FROM r GROUP BY 1) x),
    'personas', (SELECT COALESCE(jsonb_agg(jsonb_build_object('slug', slug, 'label', name, 'count', n) ORDER BY n DESC, sort_order), '[]'::jsonb)
       FROM (SELECT COALESCE(cp.slug,'none') slug, COALESCE(cp.name,'No persona yet') name, COALESCE(cp.sort_order,99) sort_order, count(*) n
             FROM r LEFT JOIN public.compass_personas cp ON cp.slug = r.persona_labels->>'persona' GROUP BY 1,2,3) x),
    'persona_changed_30d', (SELECT count(DISTINCT user_id) FROM qh WHERE prev IS NOT NULL AND prev <> persona AND created_at >= now() - interval '30 days'),
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
  DELETE FROM public.persona_history WHERE user_id = caller;
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
      'answers', (SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', r.session_id, 'question', q.prompt_text, 'answer', r.answer_value) ORDER BY r.created_at), '[]')
         FROM public.compass_responses r JOIN public.compass_sessions s ON s.id=r.session_id LEFT JOIN public.compass_questions q ON q.id=r.question_id WHERE s.user_id=caller),
      'scores', (SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', r.session_id, 'dimension_scores', r.dimension_scores, 'top_dimensions', r.top_dimensions, 'computed_at', r.computed_at)), '[]')
         FROM public.compass_results r JOIN public.compass_sessions s ON s.id=r.session_id WHERE s.user_id=caller)),
    'budget_split', (SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', b.session_id, 'allocation', b.allocation, 'created_at', b.created_at)), '[]')
         FROM public.compass_budget_priorities b JOIN public.compass_sessions s ON s.id=b.session_id WHERE s.user_id=caller),
    'identity', (SELECT jsonb_build_object('label', p.persona_labels->>'primary', 'persona', p.persona_labels->>'persona', 'streak', p.persona_labels->>'streak', 'labels', p.persona_labels, 'blended_scores', p.dimension_scores, 'consent', p.consent_scope, 'updated_at', p.last_updated)
         FROM public.user_civic_persona p WHERE p.user_id=caller),
    'persona_history', (SELECT COALESCE(jsonb_agg(jsonb_build_object('persona', h.persona, 'streak', h.streak, 'source', h.source, 'at', h.created_at) ORDER BY h.created_at), '[]') FROM public.persona_history h WHERE h.user_id=caller),
    'identity_feedback', (SELECT COALESCE(jsonb_agg(jsonb_build_object('original_label', f.original_label, 'chosen_dimension', f.chosen_dimension, 'chosen_persona', f.chosen_persona, 'created_at', f.created_at)), '[]') FROM public.identity_feedback f WHERE f.user_id=caller),
    'points', (SELECT COALESCE(jsonb_agg(jsonb_build_object('event', l.event_type, 'points', l.points, 'verified', l.verified, 'note', l.note, 'at', l.created_at) ORDER BY l.created_at), '[]') FROM public.user_points_ledger l WHERE l.user_id=caller),
    'badges', (SELECT COALESCE(jsonb_agg(jsonb_build_object('badge', b.name, 'earned_at', ub.earned_at)), '[]') FROM public.user_badges ub LEFT JOIN public.badges b ON b.id=ub.badge_id WHERE ub.user_id=caller),
    'confidence', (SELECT COALESCE(jsonb_agg(jsonb_build_object('score', c.confidence_score, 'samples', c.sample_count, 'at', c.last_updated)), '[]') FROM public.civic_confidence c WHERE c.user_id=caller),
    'lessons', (SELECT COALESCE(jsonb_agg(jsonb_build_object('lesson', le.title, 'status', p.status, 'quiz_score', p.quiz_score, 'completed_at', p.completed_at)), '[]') FROM public.user_lesson_progress p LEFT JOIN public.lessons le ON le.id=p.lesson_id WHERE p.user_id=caller),
    'surveys', (SELECT COALESCE(jsonb_agg(jsonb_build_object('survey', sv.title, 'answers', r.answers, 'completed_at', r.completed_at)), '[]') FROM public.survey_responses r LEFT JOIN public.surveys sv ON sv.id=r.survey_id WHERE r.user_id=caller),
    'districts', (SELECT jsonb_build_object('district_codes', d.resolved, 'precision', d.precision, 'resolved_at', d.resolved_at, 'note', 'We keep only district codes. We do not keep your street address here.') FROM public.user_districts d WHERE d.user_id=caller)
  );
END $function$;

-- Backfill persona for existing people
UPDATE public.user_civic_persona p SET persona_labels = p.persona_labels || jsonb_build_object(
  'persona', l->>'persona', 'streak', l->>'streak', 'evidence', public.persona_evidence(p.user_id, l->>'persona'))
FROM (SELECT user_id, public.persona_label(dimension_scores) l FROM public.user_civic_persona) x
WHERE x.user_id = p.user_id AND COALESCE(p.persona_labels->>'rule','') <> 'self_chosen';