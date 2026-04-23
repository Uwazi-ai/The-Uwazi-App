-- Episode likes table
CREATE TABLE public.episode_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (episode_id, user_id)
);

CREATE INDEX idx_episode_likes_episode ON public.episode_likes(episode_id);
CREATE INDEX idx_episode_likes_user ON public.episode_likes(user_id);

ALTER TABLE public.episode_likes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view aggregate likes (and their own)
CREATE POLICY "Likes are viewable by authenticated users"
  ON public.episode_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like episodes"
  ON public.episode_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.episode_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all likes"
  ON public.episode_likes FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));