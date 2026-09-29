REVOKE EXECUTE ON FUNCTION public.trg_city_active_sources() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_city_active_boundaries() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_city_active(text) FROM public, anon, authenticated;
REVOKE UPDATE ON public.city_onboarding FROM authenticated;