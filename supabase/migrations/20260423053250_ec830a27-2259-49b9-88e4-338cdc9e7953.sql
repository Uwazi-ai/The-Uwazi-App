-- Drop overly permissive authenticated policies on the episode-videos bucket.
-- Admin-only policies remain in place.
DROP POLICY IF EXISTS "Authenticated upload episode videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update episode videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete episode videos" ON storage.objects;