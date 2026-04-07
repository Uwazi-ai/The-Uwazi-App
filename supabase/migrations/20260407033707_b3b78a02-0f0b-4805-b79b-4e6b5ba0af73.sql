
-- Add admin columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active timestamptz;

-- Security definer function to check admin status (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND is_admin = true
  )
$$;

-- Drop existing select policy on profiles and replace with admin-aware one
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view own or admin can view all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Allow admins to update any profile (for make admin / suspend)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Civic alerts table
CREATE TABLE public.civic_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  alert_type text DEFAULT 'info',
  target_type text DEFAULT 'all',
  target_zips jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count int DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.civic_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all alerts"
  ON public.civic_alerts FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create alerts"
  ON public.civic_alerts FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Admins can update alerts"
  ON public.civic_alerts FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete alerts"
  ON public.civic_alerts FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Platform settings table
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Seed default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('signups_enabled', 'true'),
  ('ask_uwazi_enabled', 'true'),
  ('gamification_enabled', 'true'),
  ('voting_hub_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Admin-aware read policies for other tables admins need to see
DROP POLICY IF EXISTS "Users can view their own civic score" ON public.civic_scores;
CREATE POLICY "Users or admins can view civic scores"
  ON public.civic_scores FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own streak" ON public.streaks;
CREATE POLICY "Users or admins can view streaks"
  ON public.streaks FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
CREATE POLICY "Users or admins can view badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users or admins can view lesson progress"
  ON public.user_lesson_progress FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.ask_uwazi_sessions;
CREATE POLICY "Users or admins can view sessions"
  ON public.ask_uwazi_sessions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own saved legislation" ON public.saved_legislation;
CREATE POLICY "Users or admins can view saved legislation"
  ON public.saved_legislation FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own voting plans" ON public.voting_plans;
CREATE POLICY "Users or admins can view voting plans"
  ON public.voting_plans FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Admins can manage lessons (insert/update/delete)
CREATE POLICY "Admins can insert lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update lessons"
  ON public.lessons FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete lessons"
  ON public.lessons FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Admins can insert platform settings
CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));
