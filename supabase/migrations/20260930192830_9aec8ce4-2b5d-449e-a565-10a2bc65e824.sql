DROP POLICY "People view selected Plus brand logos" ON storage.objects;

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
      AND storage.objects.name = replace(replace(split_part(trim(both '"' from ps.value::text), '/home-video-media/', 2), '%2F', '/'), '%2f', '/')
  )
);