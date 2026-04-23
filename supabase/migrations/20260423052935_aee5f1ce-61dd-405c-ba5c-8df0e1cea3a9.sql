-- Replace the subquery-based WITH CHECK with a simple ownership check.
-- The real protection is enforced via column-level privileges below.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Revoke any prior broad UPDATE grants on profiles, then grant UPDATE on
-- every column EXCEPT is_admin and is_suspended to authenticated users.
REVOKE UPDATE ON public.profiles FROM authenticated, anon, public;

GRANT UPDATE (
  address_line1,
  address_line2,
  avatar_url,
  city,
  civic_knowledge_level,
  contact_score,
  contact_tags,
  crm_notes,
  display_name,
  district,
  email_opt_in,
  full_address,
  last_active,
  last_contacted_at,
  location,
  notify_civic_alerts,
  notify_elections,
  notify_new_lessons,
  notify_streak_reminders,
  onboarding_complete,
  phone_number,
  phone_verified,
  push_opt_in,
  push_token,
  sms_opt_in,
  state_code,
  street_address,
  updated_at,
  zip_code
) ON public.profiles TO authenticated;

-- Admins manage everything via the existing "Admins can update any profile"
-- policy. They use the service role / are checked server-side, so they need
-- full UPDATE — granted to the postgres role and service_role by default.
GRANT UPDATE ON public.profiles TO service_role;