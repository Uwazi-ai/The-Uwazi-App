-- Add contact/CRM fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_opt_in boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_opt_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_opt_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_token text,
  ADD COLUMN IF NOT EXISTS contact_tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS crm_notes text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_score int DEFAULT 0;

-- Outreach campaigns
CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  campaign_type text NOT NULL,
  status text DEFAULT 'draft',
  target_type text DEFAULT 'all',
  target_zip_codes jsonb DEFAULT '[]'::jsonb,
  target_states jsonb DEFAULT '[]'::jsonb,
  target_tags jsonb DEFAULT '[]'::jsonb,
  target_civic_score_min int,
  target_civic_score_max int,
  target_has_voting_plan boolean,
  target_lessons_completed_min int,
  subject text,
  preview_text text,
  email_body text,
  sms_body text,
  push_title text,
  push_body text,
  push_url text,
  push_icon text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count int DEFAULT 0,
  delivered_count int DEFAULT 0,
  opened_count int DEFAULT 0,
  clicked_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  unsubscribed_count int DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaign recipients
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  phone_number text,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  failed_reason text,
  created_at timestamptz DEFAULT now()
);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  browser text,
  platform text,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

-- Surveys
CREATE TABLE IF NOT EXISTS public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'draft',
  target_type text DEFAULT 'all',
  target_zip_codes jsonb DEFAULT '[]'::jsonb,
  target_states jsonb DEFAULT '[]'::jsonb,
  target_tags jsonb DEFAULT '[]'::jsonb,
  show_in_app boolean DEFAULT true,
  send_via_push boolean DEFAULT false,
  send_via_email boolean DEFAULT false,
  questions jsonb DEFAULT '[]'::jsonb,
  sent_count int DEFAULT 0,
  response_count int DEFAULT 0,
  completion_rate numeric DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Survey responses
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id uuid,
  zip_code text,
  state_code text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_anonymous boolean DEFAULT false,
  completed_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns"
  ON public.outreach_campaigns FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage recipients"
  ON public.campaign_recipients FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage surveys"
  ON public.surveys FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users view active surveys"
  ON public.surveys FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users submit own responses"
  ON public.survey_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own responses"
  ON public.survey_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all responses"
  ON public.survey_responses FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_campaigns_status ON public.outreach_campaigns(status);
CREATE INDEX idx_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_recipients_user ON public.campaign_recipients(user_id);
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);
CREATE INDEX idx_survey_responses_survey ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_zip ON public.survey_responses(zip_code);