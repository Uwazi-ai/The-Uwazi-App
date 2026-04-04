
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==================== PROFILES ====================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  location TEXT,
  district TEXT,
  civic_knowledge_level TEXT CHECK (civic_knowledge_level IN ('beginner', 'intermediate', 'advanced')),
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== USER PREFERENCES ====================
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  issue_interests TEXT[] DEFAULT '{}',
  preferred_language TEXT DEFAULT 'en',
  content_depth TEXT DEFAULT 'standard' CHECK (content_depth IN ('brief', 'standard', 'detailed')),
  notification_settings JSONB DEFAULT '{}',
  accessibility_settings JSONB DEFAULT '{}',
  news_categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== ELECTIONS ====================
CREATE TABLE public.elections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jurisdiction TEXT NOT NULL,
  election_date DATE NOT NULL,
  type TEXT NOT NULL,
  registration_deadline DATE,
  early_voting_start DATE,
  early_voting_end DATE,
  absentee_deadline DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Elections are publicly readable" ON public.elections FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_elections_updated_at BEFORE UPDATE ON public.elections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== BALLOT ITEMS ====================
CREATE TABLE public.ballot_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE NOT NULL,
  office_or_measure TEXT NOT NULL,
  district TEXT,
  description TEXT,
  plain_language_summary TEXT,
  yes_summary TEXT,
  no_summary TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ballot_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ballot items are publicly readable" ON public.ballot_items FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_ballot_items_updated_at BEFORE UPDATE ON public.ballot_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== CANDIDATES ====================
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  office TEXT NOT NULL,
  district TEXT,
  party TEXT,
  bio TEXT,
  simplified_bio TEXT,
  platform_summary TEXT,
  endorsements_data JSONB DEFAULT '[]',
  photo_url TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates are publicly readable" ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== VOTING PLANS ====================
CREATE TABLE public.voting_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'completed')),
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.voting_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own voting plans" ON public.voting_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own voting plans" ON public.voting_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own voting plans" ON public.voting_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own voting plans" ON public.voting_plans FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_voting_plans_updated_at BEFORE UPDATE ON public.voting_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== VOTING PLAN ITEMS ====================
CREATE TABLE public.voting_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voting_plan_id UUID REFERENCES public.voting_plans(id) ON DELETE CASCADE NOT NULL,
  ballot_item_id UUID REFERENCES public.ballot_items(id) ON DELETE CASCADE,
  selected_candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  selected_position TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.voting_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own voting plan items" ON public.voting_plan_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.voting_plans WHERE id = voting_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert their own voting plan items" ON public.voting_plan_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.voting_plans WHERE id = voting_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their own voting plan items" ON public.voting_plan_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.voting_plans WHERE id = voting_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their own voting plan items" ON public.voting_plan_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.voting_plans WHERE id = voting_plan_id AND user_id = auth.uid())
);

-- ==================== AI CHATS ====================
CREATE TABLE public.ai_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  sources JSONB DEFAULT '[]',
  confidence_score NUMERIC(3,2),
  saved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own chats" ON public.ai_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own chats" ON public.ai_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chats" ON public.ai_chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chats" ON public.ai_chats FOR DELETE USING (auth.uid() = user_id);

-- ==================== SAVED ITEMS ====================
CREATE TABLE public.saved_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('article', 'ballot_item', 'candidate', 'policy', 'chat', 'election')),
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own saved items" ON public.saved_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save items" ON public.saved_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave items" ON public.saved_items FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_saved_items_user ON public.saved_items(user_id);
CREATE UNIQUE INDEX idx_saved_items_unique ON public.saved_items(user_id, item_type, item_id);

-- ==================== REPORTS ====================
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==================== INDEXES ====================
CREATE INDEX idx_ballot_items_election ON public.ballot_items(election_id);
CREATE INDEX idx_voting_plans_user ON public.voting_plans(user_id);
CREATE INDEX idx_ai_chats_user ON public.ai_chats(user_id);
CREATE INDEX idx_elections_date ON public.elections(election_date);
CREATE INDEX idx_candidates_office ON public.candidates(office);
