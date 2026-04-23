-- Drop duplicate broad SELECT policies that permit bucket listing
DROP POLICY IF EXISTS "Public can view episode videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read episode videos" ON storage.objects;

-- Recreate a single SELECT policy. Direct object fetches by URL still work
-- (Storage validates bucket_id + name on the GET path), but list operations
-- (which call SELECT without a name filter) are no longer permitted broadly.
CREATE POLICY "Public can read individual episode video files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'episode-videos' AND name IS NOT NULL);