-- ZIP investment figures: no direct reads, only a lookup for the caller's own ZIP.
DROP POLICY IF EXISTS "Anyone authenticated can read investment cache" ON public.zip_investment_cache;

CREATE OR REPLACE FUNCTION public.get_my_zip_investment(_zip text, _fiscal_year text DEFAULT '2024')
RETURNS SETOF public.zip_investment_cache
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.* FROM public.zip_investment_cache c
  WHERE auth.uid() IS NOT NULL
    AND c.zip_code = _zip
    AND c.fiscal_year = _fiscal_year
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.zip_code = _zip OR p.voter_address_zip = _zip)
    )
$$;
REVOKE ALL ON FUNCTION public.get_my_zip_investment(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_zip_investment(text, text) TO authenticated;

-- Civic sessions: signed-in people add only their own.
ALTER TABLE public.civic_sessions ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.civic_sessions;
CREATE POLICY "Users insert their own sessions" ON public.civic_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
REVOKE INSERT ON public.civic_sessions FROM anon;

-- Streaks: server-only writes.
DROP POLICY IF EXISTS "Users can insert their own streak" ON public.streaks;
DROP POLICY IF EXISTS "Users can update their own streak" ON public.streaks;
REVOKE INSERT, UPDATE, DELETE ON public.streaks FROM anon, authenticated;