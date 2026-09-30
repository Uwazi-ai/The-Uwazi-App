CREATE OR REPLACE FUNCTION public.home_city_updates() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH home_place AS (
    SELECT resolved->>'place' AS geoid FROM public.user_districts WHERE user_id = auth.uid() LIMIT 1
  ), recent AS (
    SELECT 'budget' AS kind, b.department_or_fund AS label, b.created_at AS happened, 'City budget' AS area
    FROM public.civic_budgets b JOIN home_place h ON h.geoid = b.geoid
    WHERE b.created_at >= now() - interval '30 days'
    UNION ALL
    SELECT 'calendar', coalesce(c.label, c.milestone), c.created_at, 'Budget calendar'
    FROM public.civic_budget_calendar c JOIN home_place h ON h.geoid = c.geoid
    WHERE c.created_at >= now() - interval '30 days'
    UNION ALL
    SELECT 'office', o.office_title, p.reviewed_at, 'City offices'
    FROM public.civic_data_pending_changes p JOIN public.civic_data_sources s ON s.id = p.source_id
    JOIN public.civic_offices o ON o.id = p.office_id JOIN home_place h ON h.geoid = s.geoid
    WHERE p.status = 'approved' AND p.data_type = 'office' AND p.reviewed_at >= now() - interval '30 days'
      AND p.field_changed IN ('current_holder', 'officeholder', 'new_office')
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'label', label, 'at', happened, 'area', area) ORDER BY happened DESC), '[]'::jsonb)
  FROM (SELECT * FROM recent ORDER BY happened DESC LIMIT 3) limited;
$$;
REVOKE ALL ON FUNCTION public.home_city_updates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.home_city_updates() TO authenticated;