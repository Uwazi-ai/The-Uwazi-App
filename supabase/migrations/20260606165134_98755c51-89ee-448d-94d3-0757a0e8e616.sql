
ALTER TABLE public.uwazi_question_log
  ADD COLUMN IF NOT EXISTS was_rate_limited boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_question_log_rate_limited
  ON public.uwazi_question_log(was_rate_limited)
  WHERE was_rate_limited = true;

-- Signups by day
CREATE OR REPLACE FUNCTION public.signups_by_day(period_days int)
RETURNS TABLE(date date, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT date(created_at) AS date, count(*)::bigint AS count
  FROM public.profiles
  WHERE public.is_admin(auth.uid())
    AND created_at >= now() - (period_days || ' days')::interval
  GROUP BY date(created_at)
  ORDER BY date ASC;
$$;

-- Ask Uwazi category breakdown
CREATE OR REPLACE FUNCTION public.ask_categories_summary(period_days int)
RETURNS TABLE(category text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(topic_category, 'other') AS category, count(*)::bigint AS count
  FROM public.uwazi_question_log
  WHERE public.is_admin(auth.uid())
    AND created_at >= now() - (period_days || ' days')::interval
    AND was_rate_limited = false
  GROUP BY COALESCE(topic_category, 'other')
  ORDER BY count DESC;
$$;

-- Top ZIPs by Ask Uwazi volume
CREATE OR REPLACE FUNCTION public.ask_top_zips(period_days int, limit_count int DEFAULT 10)
RETURNS TABLE(zip_code text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT zip_code, count(*)::bigint AS count
  FROM public.uwazi_question_log
  WHERE public.is_admin(auth.uid())
    AND created_at >= now() - (period_days || ' days')::interval
    AND zip_code IS NOT NULL
    AND zip_code <> ''
  GROUP BY zip_code
  ORDER BY count DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.signups_by_day(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ask_categories_summary(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ask_top_zips(int, int) TO authenticated;
