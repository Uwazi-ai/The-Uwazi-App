CREATE POLICY "People read Plus brand logo settings"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('plus_logo_dark_url', 'plus_logo_light_url'));

CREATE OR REPLACE FUNCTION public.get_plus_brand_logos()
RETURNS TABLE (dark_url text, light_url text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT trim(both '"' from value::text) FROM public.platform_settings WHERE key = 'plus_logo_dark_url'), ''),
    COALESCE((SELECT trim(both '"' from value::text) FROM public.platform_settings WHERE key = 'plus_logo_light_url'), '')
$$;