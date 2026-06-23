
-- =========================================================
-- 1) Lock down civic_scores writes; expose award RPC
-- =========================================================
DROP POLICY IF EXISTS "Users can insert their own civic score" ON public.civic_scores;
DROP POLICY IF EXISTS "Users can update their own civic score" ON public.civic_scores;

REVOKE INSERT, UPDATE, DELETE ON public.civic_scores FROM authenticated, anon;
GRANT SELECT ON public.civic_scores TO authenticated;
GRANT ALL ON public.civic_scores TO service_role;

-- Server-side awarder. Reads xp_reward from the lessons row so the client
-- cannot inflate the amount.
CREATE OR REPLACE FUNCTION public.award_lesson_completion(
  _lesson_id uuid,
  _quiz_score integer,
  _time_spent_seconds integer
)
RETURNS TABLE (xp_awarded integer, new_total_xp integer, new_streak integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  v_xp integer := 0;
  v_total_xp integer := 0;
  v_streak integer := 1;
  v_last_date date;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_yesterday date := v_today - 1;
  v_passed boolean := COALESCE(_quiz_score, 0) >= 75;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Must be signed in' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(xp_reward, 0) INTO v_xp
    FROM public.lessons
   WHERE id = _lesson_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson not found' USING ERRCODE = '22023';
  END IF;

  -- Record progress (upsert)
  INSERT INTO public.user_lesson_progress (
    user_id, lesson_id, status, score, quiz_score,
    time_spent_seconds, quiz_attempts, completed_at
  ) VALUES (
    caller, _lesson_id, 'completed', COALESCE(_quiz_score, 0), COALESCE(_quiz_score, 0),
    GREATEST(COALESCE(_time_spent_seconds, 0), 0), 1, now()
  )
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET status = 'completed',
        score = EXCLUDED.score,
        quiz_score = EXCLUDED.quiz_score,
        time_spent_seconds = EXCLUDED.time_spent_seconds,
        quiz_attempts = COALESCE(public.user_lesson_progress.quiz_attempts, 0) + 1,
        completed_at = now();

  -- Update civic_scores
  INSERT INTO public.civic_scores (
    user_id, total_xp, lessons_completed, quizzes_passed, civic_literacy_score
  ) VALUES (
    caller, v_xp, 1, CASE WHEN v_passed THEN 1 ELSE 0 END, 5
  )
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = COALESCE(public.civic_scores.total_xp, 0) + v_xp,
        lessons_completed = COALESCE(public.civic_scores.lessons_completed, 0) + 1,
        quizzes_passed = COALESCE(public.civic_scores.quizzes_passed, 0)
                         + CASE WHEN v_passed THEN 1 ELSE 0 END,
        civic_literacy_score = LEAST(100, COALESCE(public.civic_scores.civic_literacy_score, 0) + 5);

  SELECT total_xp INTO v_total_xp FROM public.civic_scores WHERE user_id = caller;

  -- Streak
  SELECT last_active_date INTO v_last_date FROM public.streaks WHERE user_id = caller;
  IF v_last_date IS NULL THEN
    INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_active_date)
    VALUES (caller, 1, 1, v_today);
    v_streak := 1;
  ELSE
    IF v_last_date = v_today THEN
      SELECT current_streak INTO v_streak FROM public.streaks WHERE user_id = caller;
    ELSIF v_last_date = v_yesterday THEN
      UPDATE public.streaks
         SET current_streak = COALESCE(current_streak, 0) + 1,
             longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(current_streak, 0) + 1),
             last_active_date = v_today
       WHERE user_id = caller
      RETURNING current_streak INTO v_streak;
    ELSE
      UPDATE public.streaks
         SET current_streak = 1,
             longest_streak = GREATEST(COALESCE(longest_streak, 0), 1),
             last_active_date = v_today
       WHERE user_id = caller
      RETURNING current_streak INTO v_streak;
    END IF;
  END IF;

  RETURN QUERY SELECT v_xp, v_total_xp, v_streak;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_lesson_completion(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_lesson_completion(uuid, integer, integer) TO authenticated;

-- =========================================================
-- 2) Restrict episode_likes / bill_upvotes SELECT to own rows;
--    expose count RPCs for public totals.
-- =========================================================
DROP POLICY IF EXISTS "Likes are viewable by authenticated users" ON public.episode_likes;
CREATE POLICY "Users can view their own likes"
ON public.episode_likes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all upvotes" ON public.bill_upvotes;
CREATE POLICY "Users can view their own upvotes"
ON public.bill_upvotes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin "view all" policies already exist on episode_likes; add the same for bill_upvotes.
CREATE POLICY "Admins can view all upvotes"
ON public.bill_upvotes
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_episode_like_count(_episode_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint FROM public.episode_likes WHERE episode_id = _episode_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_episode_like_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_episode_like_count(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_bill_upvote_counts(_bill_ids text[])
RETURNS TABLE (bill_id text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.bill_id, count(*)::bigint
    FROM public.bill_upvotes b
   WHERE b.bill_id = ANY(_bill_ids)
   GROUP BY b.bill_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_bill_upvote_counts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bill_upvote_counts(text[]) TO anon, authenticated;
