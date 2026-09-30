GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
GRANT SELECT, UPDATE (home_welcome_seen) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;