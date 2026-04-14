
-- Create episodes table for Policy Power & Progress video content
CREATE TABLE public.episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  topic_emoji TEXT,
  date TEXT,
  video_url TEXT,
  is_free BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Public read for published episodes (no auth required for anon access)
CREATE POLICY "Published episodes are publicly readable"
ON public.episodes
FOR SELECT
USING (is_published = true);

-- Admin full access using existing is_admin function
CREATE POLICY "Admins can insert episodes"
ON public.episodes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update episodes"
ON public.episodes
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete episodes"
ON public.episodes
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can also read unpublished episodes
CREATE POLICY "Admins can read all episodes"
ON public.episodes
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_episodes_updated_at
BEFORE UPDATE ON public.episodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_episodes_topic_published ON public.episodes (topic, is_published, sort_order);
