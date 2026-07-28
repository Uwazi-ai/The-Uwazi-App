
-- Admin write access on redemption_codes (currently only readable/system-managed)
CREATE POLICY "Admins can insert codes" ON public.redemption_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update codes" ON public.redemption_codes
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete codes" ON public.redemption_codes
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

GRANT INSERT, UPDATE, DELETE ON public.redemption_codes TO authenticated;

-- BI: per-code stats
CREATE OR REPLACE FUNCTION public.code_redemption_stats()
RETURNS TABLE(
  code text,
  label text,
  active boolean,
  max_redemptions integer,
  redeemed_count integer,
  first_redemption timestamptz,
  last_redemption timestamptz,
  early_signups bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.code,
    rc.label,
    rc.active,
    rc.max_redemptions,
    rc.redeemed_count,
    MIN(cr.redeemed_at) AS first_redemption,
    MAX(cr.redeemed_at) AS last_redemption,
    COUNT(*) FILTER (
      WHERE p.created_at IS NOT NULL
        AND cr.redeemed_at - p.created_at < interval '24 hours'
        AND cr.redeemed_at >= p.created_at
    )::bigint AS early_signups
  FROM public.redemption_codes rc
  LEFT JOIN public.code_redemptions cr ON cr.code = rc.code
  LEFT JOIN public.profiles p ON p.user_id = cr.user_id
  WHERE public.is_admin(auth.uid())
  GROUP BY rc.code, rc.label, rc.active, rc.max_redemptions, rc.redeemed_count
  ORDER BY rc.redeemed_count DESC, rc.code ASC;
$$;

-- BI: redemptions per day
CREATE OR REPLACE FUNCTION public.code_redemptions_by_day(period_days integer)
RETURNS TABLE(date date, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date(redeemed_at) AS date, count(*)::bigint AS count
  FROM public.code_redemptions
  WHERE public.is_admin(auth.uid())
    AND redeemed_at >= now() - (period_days || ' days')::interval
  GROUP BY date(redeemed_at)
  ORDER BY date ASC;
$$;
