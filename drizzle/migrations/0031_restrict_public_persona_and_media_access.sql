ALTER TABLE public.compass_personas ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
UPDATE public.compass_personas SET is_public = true WHERE slug IN ('watchdog','builder','guardian','neighbor','mentor','caretaker','connector','organizer','steward');
DROP POLICY IF EXISTS "Anyone reads personas" ON public.compass_personas;
CREATE POLICY "Public reads approved persona catalog" ON public.compass_personas FOR SELECT TO anon, authenticated USING (is_public);
CREATE POLICY "Admins read persona catalog" ON public.compass_personas FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.is_public_episode_poster(_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.episodes e WHERE e.is_published AND _name = 'episode-posters/' || e.id::text || '.jpg');
$$;
REVOKE ALL ON FUNCTION public.is_public_episode_poster(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_episode_poster(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.is_public_clip_media(_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.videos v WHERE v.active AND (_name = split_part(v.url, '/home-video-media/', 2) OR _name = split_part(v.poster_url, '/home-video-media/', 2)))
 AND NOT EXISTS (SELECT 1 FROM public.episodes e WHERE (NOT e.is_published OR NOT e.is_free) AND (e.video_url = _name OR split_part(e.video_url, '/home-video-media/', 2) = _name OR regexp_replace(split_part(e.video_url, '/home-video-media/', 2), '\.[^.]+$', '') || '.h264.mp4' = _name OR regexp_replace(split_part(e.video_url, '/home-video-media/', 2), '\.[^.]+$', '') || '.webm' = _name));
$$;
REVOKE ALL ON FUNCTION public.is_public_clip_media(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_clip_media(text) TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "People view episode posters" ON storage.objects;
CREATE POLICY "Published episode artwork only" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'home-video-media' AND public.is_public_episode_poster(name));
DROP POLICY IF EXISTS "Public views active video media" ON storage.objects;
CREATE POLICY "Public active clips excluding protected episodes" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'home-video-media' AND public.is_public_clip_media(name));
DROP POLICY IF EXISTS "Members view active home video media" ON storage.objects;
CREATE POLICY "Members active clips excluding protected episodes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'home-video-media' AND (public.is_admin(auth.uid()) OR public.is_public_clip_media(name)));
