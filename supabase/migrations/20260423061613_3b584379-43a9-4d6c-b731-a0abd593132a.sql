-- 1) Episodes: restrict the public-readable policy to FREE published episodes only,
--    and add a separate authenticated policy for paid episodes (subscription/admin gated).
DROP POLICY IF EXISTS "Published episodes are publicly readable" ON public.episodes;

CREATE POLICY "Free published episodes are publicly readable"
ON public.episodes
FOR SELECT
TO anon, authenticated
USING (is_published = true AND is_free = true);

CREATE POLICY "Subscribers and admins can read paid published episodes"
ON public.episodes
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND is_free = false
  AND (
    public.is_admin(auth.uid())
    OR public.has_active_subscription(auth.uid(), 'live')
    OR public.has_active_subscription(auth.uid(), 'sandbox')
  )
);

-- 2) Lessons: restrict the SELECT policy so only published lessons are visible to non-admins.
DROP POLICY IF EXISTS "Published lessons are readable by authenticated users" ON public.lessons;

CREATE POLICY "Published lessons are readable by authenticated users"
ON public.lessons
FOR SELECT
TO authenticated
USING (is_published = true OR public.is_admin(auth.uid()));
