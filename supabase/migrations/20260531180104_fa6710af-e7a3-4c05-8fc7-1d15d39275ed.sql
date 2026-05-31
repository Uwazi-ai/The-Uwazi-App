-- Fix 1: Remove client-side INSERT on user_badges. Badges must only be awarded by
-- the SECURITY DEFINER function award_lesson_badges (or service role / admin).
DROP POLICY IF EXISTS "Users can insert their own badges" ON public.user_badges;

CREATE POLICY "Admins can grant badges"
ON public.user_badges
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages badges"
ON public.user_badges
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
