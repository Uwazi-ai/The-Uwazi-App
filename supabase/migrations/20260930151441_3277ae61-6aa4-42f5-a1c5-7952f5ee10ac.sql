REVOKE ALL ON FUNCTION public.sync_profile_plan() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_plus(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_verified_student(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.free_episode_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_episode_video_access(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_episode_video_access(uuid, uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_plus(uuid), public.is_verified_student(uuid), public.free_episode_ids() TO authenticated;