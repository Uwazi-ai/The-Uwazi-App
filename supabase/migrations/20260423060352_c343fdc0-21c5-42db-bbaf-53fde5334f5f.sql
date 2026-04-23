-- Audit log table
CREATE TABLE public.episode_video_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  episode_id uuid,
  video_path text,
  granted boolean NOT NULL,
  reason text NOT NULL,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_episode_video_access_log_user ON public.episode_video_access_log(user_id, created_at DESC);
CREATE INDEX idx_episode_video_access_log_episode ON public.episode_video_access_log(episode_id, created_at DESC);

ALTER TABLE public.episode_video_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read access log"
ON public.episode_video_access_log
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages access log"
ON public.episode_video_access_log
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Helper that evaluates access and writes an audit row
CREATE OR REPLACE FUNCTION public.log_episode_video_access(
  _user_id uuid,
  _episode_id uuid,
  _video_path text DEFAULT NULL,
  _context jsonb DEFAULT NULL
)
RETURNS TABLE(granted boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ep RECORD;
  v_granted boolean := false;
  v_reason text := 'denied_no_match';
BEGIN
  SELECT id, is_free, is_published, video_url
    INTO ep
    FROM public.episodes
   WHERE id = _episode_id;

  IF NOT FOUND THEN
    v_granted := false;
    v_reason := 'denied_episode_not_found';
  ELSIF ep.is_published = false THEN
    v_granted := false;
    v_reason := 'denied_unpublished';
  ELSIF ep.is_free = true THEN
    v_granted := true;
    v_reason := 'granted_free_episode';
  ELSIF _user_id IS NOT NULL AND public.is_admin(_user_id) THEN
    v_granted := true;
    v_reason := 'granted_admin';
  ELSIF _user_id IS NOT NULL AND (
    public.has_active_subscription(_user_id, 'live')
    OR public.has_active_subscription(_user_id, 'sandbox')
  ) THEN
    v_granted := true;
    v_reason := 'granted_active_subscription';
  ELSIF _user_id IS NULL THEN
    v_granted := false;
    v_reason := 'denied_anonymous';
  ELSE
    v_granted := false;
    v_reason := 'denied_no_subscription';
  END IF;

  INSERT INTO public.episode_video_access_log
    (user_id, episode_id, video_path, granted, reason, context)
  VALUES
    (_user_id, _episode_id, _video_path, v_granted, v_reason, _context);

  RETURN QUERY SELECT v_granted, v_reason;
END;
$$;