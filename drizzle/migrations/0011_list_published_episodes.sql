CREATE OR REPLACE FUNCTION public.list_published_episodes()
RETURNS TABLE (id uuid, title text, description text, date text, topic text, topic_emoji text, video_url text, is_free boolean, sort_order integer, created_at timestamptz, playable boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH can AS (
    SELECT coalesce(public.is_admin(auth.uid()), false)
        OR coalesce(public.has_active_subscription(auth.uid(), 'live'), false)
        OR coalesce(public.has_active_subscription(auth.uid(), 'sandbox'), false) AS all_access
  ), free AS (SELECT public.free_episode_ids() AS fid)
  SELECT e.id, e.title, e.description, e.date::text, e.topic, e.topic_emoji,
         CASE WHEN can.all_access OR e.id IN (SELECT fid FROM free) THEN e.video_url ELSE NULL END,
         e.is_free, e.sort_order, e.created_at,
         (can.all_access OR e.id IN (SELECT fid FROM free))
  FROM public.episodes e, can
  WHERE e.is_published
  ORDER BY e.sort_order NULLS LAST, e.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.list_published_episodes() FROM public;
GRANT EXECUTE ON FUNCTION public.list_published_episodes() TO anon, authenticated;