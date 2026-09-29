CREATE OR REPLACE FUNCTION public.award_lesson_completion(_lesson_id uuid, _quiz_score integer, _time_spent_seconds integer)
 RETURNS TABLE(xp_awarded integer, new_total_xp integer, new_streak integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  v_xp integer := 0; v_total_xp integer := 0; v_streak integer := 1; v_last_date date;
  v_today date := (now() AT TIME ZONE 'UTC')::date; v_yesterday date := v_today - 1;
  v_passed boolean := COALESCE(_quiz_score, 0) >= 75;
  v_already boolean := false;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(xp_reward, 0) INTO v_xp FROM public.lessons WHERE id = _lesson_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lesson not found' USING ERRCODE = '22023'; END IF;

  SELECT true INTO v_already FROM public.user_lesson_progress
   WHERE user_id = caller AND lesson_id = _lesson_id AND status = 'completed' AND completed_at IS NOT NULL;
  v_already := COALESCE(v_already, false);

  INSERT INTO public.user_lesson_progress (user_id, lesson_id, status, score, quiz_score, time_spent_seconds, quiz_attempts, completed_at)
  VALUES (caller, _lesson_id, 'completed', COALESCE(_quiz_score, 0), COALESCE(_quiz_score, 0), GREATEST(COALESCE(_time_spent_seconds, 0), 0), 1, now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET status = 'completed', score = EXCLUDED.score, quiz_score = EXCLUDED.quiz_score,
        time_spent_seconds = EXCLUDED.time_spent_seconds,
        quiz_attempts = COALESCE(public.user_lesson_progress.quiz_attempts, 0) + 1, completed_at = now();

  IF v_already THEN v_xp := 0; END IF;

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
  IF NOT v_already THEN
    PERFORM public.award_points(caller, 'lesson_complete', 25, _lesson_id::text);
  END IF;

  RETURN QUERY SELECT v_xp, v_total_xp, v_streak;
END;
$function$