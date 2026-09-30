CREATE OR REPLACE FUNCTION public.get_plus_brand_logos()
RETURNS TABLE (dark_url text, light_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT trim(both '"' from value::text) FROM public.platform_settings WHERE key = 'plus_logo_dark_url'), ''),
    COALESCE((SELECT trim(both '"' from value::text) FROM public.platform_settings WHERE key = 'plus_logo_light_url'), '')
$$;

REVOKE ALL ON FUNCTION public.get_plus_brand_logos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_plus_brand_logos() TO anon, authenticated, service_role;

CREATE POLICY "People view selected Plus brand logos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'home-video-media'
  AND EXISTS (
    SELECT 1
    FROM public.platform_settings ps
    WHERE ps.key IN ('plus_logo_dark_url', 'plus_logo_light_url')
      AND storage.objects.name = split_part(trim(both '"' from ps.value::text), '/home-video-media/', 2)
  )
);