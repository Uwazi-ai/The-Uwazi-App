-- Revoke broad UPDATE from authenticated, then grant only safe columns.
REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  display_name,
  avatar_url,
  location,
  district,
  civic_knowledge_level,
  onboarding_complete,
  street_address,
  zip_code,
  address_line1,
  address_line2,
  city,
  state_code,
  full_address,
  phone_number,
  notify_elections,
  notify_new_lessons,
  notify_streak_reminders,
  notify_civic_alerts,
  email_opt_in,
  sms_opt_in,
  push_opt_in,
  push_token,
  last_active,
  updated_at
) ON public.profiles TO authenticated;

-- Service role retains full access (granted by default), admins update via the
-- existing "Admins can update any profile" policy executed as service-role-equivalent
-- through SECURITY DEFINER paths or direct admin tooling. Re-grant full UPDATE to
-- service_role explicitly for clarity.
GRANT UPDATE ON public.profiles TO service_role;