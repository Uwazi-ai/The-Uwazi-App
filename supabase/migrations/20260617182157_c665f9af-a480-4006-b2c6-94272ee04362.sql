DROP POLICY IF EXISTS "Gated episode video access" ON storage.objects;

CREATE POLICY "Gated episode video access"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'episode-videos'
  AND EXISTS (
    SELECT 1
    FROM public.episodes e
    WHERE e.is_published = true
      AND e.video_url IS NOT NULL
      AND (
        -- Exact match against path-only video_url (current scheme)
        e.video_url = objects.name
        -- Or exact match against legacy public-URL form
        OR e.video_url = 'https://zigemhmhbzegwbgvvmpc.supabase.co/storage/v1/object/public/episode-videos/' || objects.name
      )
      AND (
        e.is_free = true
        OR public.is_admin(auth.uid())
        OR public.has_active_subscription(auth.uid(), 'sandbox')
        OR public.has_active_subscription(auth.uid(), 'live')
      )
  )
);