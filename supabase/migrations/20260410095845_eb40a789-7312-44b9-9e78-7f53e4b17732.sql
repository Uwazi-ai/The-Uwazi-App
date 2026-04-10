
-- Enhanced lessons table
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS track_id text,
  ADD COLUMN IF NOT EXISTS track_name text,
  ADD COLUMN IF NOT EXISTS track_emoji text,
  ADD COLUMN IF NOT EXISTS lesson_number text,
  ADD COLUMN IF NOT EXISTS estimated_minutes int DEFAULT 10,
  ADD COLUMN IF NOT EXISTS quiz_questions jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS key_takeaways jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS action_items jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS prerequisites jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS badge_awarded text,
  ADD COLUMN IF NOT EXISTS total_slides int DEFAULT 0;

-- Enhanced user lesson progress
ALTER TABLE public.user_lesson_progress
  ADD COLUMN IF NOT EXISTS current_slide int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_score int,
  ADD COLUMN IF NOT EXISTS quiz_attempts int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_spent_seconds int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_slide_seen int DEFAULT 0;

-- Enhanced badges table
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS emoji text,
  ADD COLUMN IF NOT EXISTS rarity text DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS track_id text,
  ADD COLUMN IF NOT EXISTS unlock_condition text;

-- Rename xp_reward to xp_value if it exists (keep both for compatibility)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badges' AND column_name = 'xp_value') THEN
    ALTER TABLE public.badges ADD COLUMN xp_value int DEFAULT 0;
  END IF;
END $$;

-- Lesson tracks table
CREATE TABLE IF NOT EXISTS public.lesson_tracks (
  id text PRIMARY KEY,
  name text NOT NULL,
  emoji text,
  description text,
  color text,
  lesson_count int DEFAULT 0,
  total_xp int DEFAULT 0,
  order_index int,
  difficulty text DEFAULT 'beginner'
);

ALTER TABLE public.lesson_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracks are readable by authenticated users"
  ON public.lesson_tracks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tracks"
  ON public.lesson_tracks FOR ALL
  USING (public.is_admin(auth.uid()));

-- Seed track data
INSERT INTO public.lesson_tracks (id, name, emoji, description, color, order_index, difficulty)
VALUES
  ('voting', 'Voting Fundamentals', '🗳️', 'Everything you need to know to vote with confidence', '#9bd34b', 1, 'beginner'),
  ('government', 'How Government Works', '🏛️', 'Understand the structure of American democracy', '#3b82f6', 2, 'beginner'),
  ('legislation', 'Legislation & Policy', '📋', 'Read bills, track policy, understand the law', '#8b5cf6', 3, 'intermediate'),
  ('rights', 'Your Civic Rights', '⚖️', 'Know your rights and how to use them', '#f59e0b', 4, 'beginner'),
  ('local', 'Local Power', '🏘️', 'Why local elections matter most and how to engage', '#ec4899', 5, 'intermediate'),
  ('research', 'Research & Critical Thinking', '🔍', 'Evaluate candidates, spot misinformation, think clearly', '#14b8a6', 6, 'intermediate'),
  ('equity', 'Equity & Democracy', '🌍', 'The history and future of inclusive democracy', '#f97316', 7, 'advanced')
ON CONFLICT (id) DO NOTHING;
