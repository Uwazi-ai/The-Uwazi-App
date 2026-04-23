-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can read individual episode video files" ON storage.objects;

-- Replace with gated access: free episodes OR admin OR active subscriber
CREATE POLICY "Gated episode video access"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'episode-videos'
  AND EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.is_published = true
      AND e.video_url IS NOT NULL
      AND position(storage.objects.name in e.video_url) > 0
      AND (
        e.is_free = true
        OR public.is_admin(auth.uid())
        OR public.has_active_subscription(auth.uid(), 'sandbox')
        OR public.has_active_subscription(auth.uid(), 'live')
      )
  )
);