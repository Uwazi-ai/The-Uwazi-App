
-- ═══════════════════════════════════════════════════════════
-- 1. Prevent privilege escalation via profiles.is_admin
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid())
  AND is_suspended IS NOT DISTINCT FROM (SELECT p.is_suspended FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════
-- 2. Remove sensitive tables from realtime broadcast
-- ═══════════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_roles;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 3. Lock down episode-videos storage to admins only
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can upload episode videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update episode videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete episode videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload episode videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update episode videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete episode videos" ON storage.objects;
DROP POLICY IF EXISTS "Episode videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view episode videos" ON storage.objects;

CREATE POLICY "Public can view episode videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'episode-videos');

CREATE POLICY "Admins can upload episode videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'episode-videos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update episode videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'episode-videos' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'episode-videos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete episode videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'episode-videos' AND public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════
-- 4. Restrict avatars bucket SELECT (prevent listing all files)
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Files remain publicly readable by direct URL, but listing is denied via no LIST/SELECT policy beyond direct fetch.
-- Using path-restricted SELECT for owners; public reads happen via getPublicUrl which does not use RLS for public buckets.
-- For public buckets, direct URLs work without policies; we add an owner-scoped SELECT only.
CREATE POLICY "Users can view own avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════════════════════════════════════════════
-- 5. Fix function search_path on email queue helpers
-- ═══════════════════════════════════════════════════════════
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
