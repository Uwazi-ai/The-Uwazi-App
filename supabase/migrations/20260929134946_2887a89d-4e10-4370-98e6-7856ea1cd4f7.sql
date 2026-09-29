CREATE OR REPLACE FUNCTION public.owns_compass_session(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.compass_sessions WHERE id = _session_id AND user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.owns_compass_session(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.owns_compass_session(uuid) TO authenticated;