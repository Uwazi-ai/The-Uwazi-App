CREATE OR REPLACE FUNCTION public.has_plus_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user_id
        AND s.environment IN ('live','sandbox')
        AND (
          (s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
          OR (s.status = 'canceled' AND s.current_period_end > now())
        )
        AND (coalesce(s.price_id,'') NOT LIKE 'uwazi_plus_student%' OR public.is_verified_student(_user_id))
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_plus_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_plus_access(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_plus_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.has_plus_access(auth.uid()), false)
$$;
REVOKE EXECUTE ON FUNCTION public.my_plus_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_plus_access() TO authenticated, service_role;

-- is_plus stays as a name other code calls, but now uses the one rule.
CREATE OR REPLACE FUNCTION public.is_plus(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.has_plus_access(_user_id), false)
$$;

CREATE OR REPLACE FUNCTION public.list_published_episodes()
 RETURNS TABLE(id uuid, title text, description text, date text, topic text, topic_emoji text, video_url text, is_free boolean, sort_order integer, created_at timestamp with time zone, playable boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH can AS (SELECT coalesce(public.has_plus_access(auth.uid()), false) AS all_access),
  free AS (SELECT public.free_episode_ids() AS fid)
  SELECT e.id, e.title, e.description, e.date::text, e.topic, e.topic_emoji,
         CASE WHEN can.all_access OR e.id IN (SELECT fid FROM free) THEN e.video_url ELSE NULL END,
         e.is_free, e.sort_order, e.created_at,
         (can.all_access OR e.id IN (SELECT fid FROM free))
  FROM public.episodes e, can
  WHERE e.is_published
  ORDER BY e.sort_order NULLS LAST, e.created_at DESC
$function$;

ALTER POLICY "Subscribers and admins can read paid published episodes" ON public.episodes
  USING ((is_published = true) AND (is_free = false) AND public.has_plus_access(auth.uid()));

ALTER POLICY "Owner with active UWAZI+ can read matches" ON public.compass_office_matches
  USING ((EXISTS (SELECT 1 FROM public.compass_sessions s WHERE s.id = compass_office_matches.session_id AND s.user_id = auth.uid()))
         AND public.has_plus_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.award_report_unlock(_session_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.compass_sessions WHERE id=_session_id AND user_id=caller AND completed_at IS NOT NULL) THEN RETURN 0; END IF;
  IF NOT public.has_plus_access(caller) THEN RETURN 0; END IF;
  RETURN public.award_points(caller, 'report_unlock', 25, _session_id::text);
END $function$;

CREATE OR REPLACE FUNCTION public.report_budget_issue(_budget_id uuid, _correct_value text, _note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE b public.civic_budgets%ROWTYPE; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  IF NOT public.has_plus_access(auth.uid()) THEN RAISE EXCEPTION 'UWAZI+ required' USING ERRCODE='42501'; END IF;
  SELECT * INTO b FROM public.civic_budgets WHERE id = _budget_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Budget line not found'; END IF;
  IF (SELECT count(*) FROM public.civic_data_pending_changes WHERE reported_by = auth.uid() AND extracted_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'Too many reports today';
  END IF;
  INSERT INTO public.civic_data_pending_changes (field_changed, old_value, new_value, note, reported_by, origin, data_type, target_table, target_id, proposed)
  VALUES (CASE WHEN NULLIF(btrim(_correct_value),'') IS NULL THEN 'other' ELSE 'amount' END,
          b.amount::text, left(NULLIF(btrim(_correct_value),''),100), left(NULLIF(btrim(_note),''),1000),
          auth.uid(), 'user_reported', 'budget', 'civic_budgets', b.id,
          jsonb_build_object('department_or_fund', b.department_or_fund, 'fiscal_year', b.fiscal_year, 'geoid', b.geoid))
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$;

CREATE OR REPLACE FUNCTION public.report_office_issue(_office_id uuid, _field text, _correct_value text, _note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_old text; v_id uuid; o public.civic_offices%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  IF NOT public.has_plus_access(auth.uid()) THEN RAISE EXCEPTION 'UWAZI+ required' USING ERRCODE='42501'; END IF;
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
END $function$;

-- Plus only lessons: open when free, Plus, or offered on the person's path.
CREATE OR REPLACE FUNCTION public.can_open_lesson(_lesson_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.lessons WHERE id = _lesson_id AND NOT plus_only)
      OR public.has_plus_access(auth.uid())
      OR EXISTS (SELECT 1 FROM public.learn_path_offers WHERE user_id = auth.uid() AND lesson_id = _lesson_id)
$$;
REVOKE EXECUTE ON FUNCTION public.can_open_lesson(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_open_lesson(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_plus_lesson_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid() AND NOT public.can_open_lesson(NEW.lesson_id) THEN
    RAISE EXCEPTION 'This lesson is part of UWAZI+' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_plus_lesson_progress ON public.user_lesson_progress;
CREATE TRIGGER guard_plus_lesson_progress BEFORE INSERT OR UPDATE ON public.user_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.guard_plus_lesson_progress();

-- The journey office step uses the same rule.
DO $$
DECLARE src text;
BEGIN
  SELECT pg_get_functiondef('public.recompute_next_step(uuid)'::regprocedure) INTO src;
  src := replace(src, 'public.has_active_subscription(_uid,''live'') OR public.has_active_subscription(_uid,''sandbox'')', 'public.has_plus_access(_uid)');
  EXECUTE src;
END $$;

-- profiles.plan is now display only and follows the same rule.
CREATE OR REPLACE FUNCTION public.sync_profile_plan()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE has_sub boolean; is_student boolean;
BEGIN
  SELECT bool_or(true), bool_or(coalesce(s.price_id,'') LIKE 'uwazi_plus_student%') INTO has_sub, is_student
    FROM public.subscriptions s
   WHERE s.user_id = NEW.user_id AND s.environment IN ('live','sandbox')
     AND ((s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
          OR (s.status = 'canceled' AND s.current_period_end > now()))
     AND (coalesce(s.price_id,'') NOT LIKE 'uwazi_plus_student%' OR public.is_verified_student(NEW.user_id));
  UPDATE public.profiles SET plan = CASE
      WHEN coalesce(is_student,false) THEN 'plus_student'
      WHEN coalesce(has_sub,false) THEN 'plus' ELSE 'free' END
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END $function$;

COMMENT ON FUNCTION public.has_active_subscription(uuid, text) IS 'DEPRECATED for access checks: use has_plus_access';