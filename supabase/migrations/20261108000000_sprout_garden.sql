-- Sprout's Garden: kid game progress, parent "memories" and private family media.
-- Progress and events are written only through SECURITY DEFINER functions that act on the caller.

CREATE TABLE public.kid_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_key text NOT NULL DEFAULT 'kaleb' CHECK (child_key ~ '^[a-z0-9_-]{1,32}$'),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, child_key)
);
ALTER TABLE public.kid_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.kid_progress TO authenticated;
GRANT ALL ON public.kid_progress TO service_role;
CREATE POLICY "Read own kid progress" ON public.kid_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER kid_progress_updated BEFORE UPDATE ON public.kid_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Big wins, new skills and streaks, kept as family memories. Append-only for the app.
CREATE TABLE public.kid_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_key text NOT NULL DEFAULT 'kaleb',
  kind text NOT NULL CHECK (kind IN ('level_complete','rank_up','skill_mastered','new_record','streak')),
  title text NOT NULL CHECK (char_length(title) <= 160),
  body text CHECK (char_length(body) <= 600),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX kid_events_user_created ON public.kid_events (user_id, created_at DESC);
ALTER TABLE public.kid_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.kid_events TO authenticated;
GRANT ALL ON public.kid_events TO service_role;
CREATE POLICY "Read own kid events" ON public.kid_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Read the caller's save for one child. Returns null when none exists yet.
CREATE OR REPLACE FUNCTION public.get_kid_progress(_child text DEFAULT 'kaleb')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT data FROM public.kid_progress WHERE user_id = auth.uid() AND child_key = _child;
$$;
REVOKE ALL ON FUNCTION public.get_kid_progress(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_kid_progress(text) TO authenticated;

-- Upsert the caller's save. Caps the payload so a broken client cannot fill the table.
CREATE OR REPLACE FUNCTION public.save_kid_progress(_child text, _data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _data IS NULL OR jsonb_typeof(_data) <> 'object' THEN RAISE EXCEPTION 'save must be an object'; END IF;
  IF octet_length(_data::text) > 262144 THEN RAISE EXCEPTION 'save too large'; END IF;
  INSERT INTO public.kid_progress (user_id, child_key, data) VALUES (auth.uid(), _child, _data)
  ON CONFLICT (user_id, child_key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.save_kid_progress(text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.save_kid_progress(text, jsonb) TO authenticated;

-- Record a memory and, at most once a day, a notification for the grown-up. Never fails play.
CREATE OR REPLACE FUNCTION public.log_kid_event(_child text, _kind text, _title text, _body text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _id uuid; _recent int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT count(*) INTO _recent FROM public.kid_events WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour';
  IF _recent >= 60 THEN RETURN NULL; END IF;
  INSERT INTO public.kid_events (user_id, child_key, kind, title, body) VALUES (auth.uid(), _child, _kind, left(_title, 160), left(_body, 600)) RETURNING id INTO _id;
  IF _kind IN ('rank_up', 'skill_mastered', 'new_record') THEN
    INSERT INTO public.user_notifications (user_id, kind, title, body, link, dedupe_key, notify_day)
    VALUES (auth.uid(), 'kid_win', left(_title, 160), left(_body, 600), '/sprout', 'kid:' || _kind || ':' || current_date::text, current_date)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.log_kid_event(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_kid_event(text, text, text, text) TO authenticated;

-- Private bucket for recorded voice clips and the hero face photo, one folder per account.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kid-media', 'kid-media', false, 5242880, ARRAY['audio/webm','audio/mp4','audio/mpeg','audio/ogg','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Own kid media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kid-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own kid media write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kid-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own kid media update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kid-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own kid media delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kid-media' AND (storage.foldername(name))[1] = auth.uid()::text);
