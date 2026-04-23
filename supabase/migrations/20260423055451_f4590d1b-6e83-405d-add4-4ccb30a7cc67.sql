-- Clean up orphaned anonymous subscriptions
DELETE FROM public.push_subscriptions WHERE user_id IS NULL;

-- Enforce user_id always set
ALTER TABLE public.push_subscriptions ALTER COLUMN user_id SET NOT NULL;

-- Add service role management policy
CREATE POLICY "Service role manages push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');