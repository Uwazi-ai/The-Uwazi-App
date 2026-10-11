CREATE TABLE public.election_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_date date NOT NULL,
  state_code text NOT NULL CHECK (state_code IN ('MO','KS')),
  jurisdiction text,
  rule_key text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  display_label text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  source text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX election_rules_uniq ON public.election_rules (election_date, state_code, coalesce(jurisdiction,''), rule_key);
GRANT SELECT ON public.election_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.election_rules TO authenticated;
GRANT ALL ON public.election_rules TO service_role;
ALTER TABLE public.election_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Election rules are public" ON public.election_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admins write election rules" ON public.election_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.rights_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_key text NOT NULL,
  state_code text CHECK (state_code IN ('MO','KS')),
  sort_order int NOT NULL DEFAULT 0,
  span int NOT NULL DEFAULT 1 CHECK (span IN (1,2)),
  color_token text NOT NULL CHECK (color_token IN ('coral','sky','amber','violet','teal','pink','blue','lime')),
  tag text NOT NULL,
  title text NOT NULL,
  blurb text NOT NULL,
  detail text NOT NULL,
  source text NOT NULL,
  ask_uwazi_prompt text,
  active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX rights_cards_uniq ON public.rights_cards (card_key, coalesce(state_code,''));
GRANT SELECT ON public.rights_cards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rights_cards TO authenticated;
GRANT ALL ON public.rights_cards TO service_role;
ALTER TABLE public.rights_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rights cards are public" ON public.rights_cards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admins write rights cards" ON public.rights_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.voter_checklist_progress (
  user_id uuid NOT NULL,
  election_date date NOT NULL,
  item_key text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, election_date, item_key)
);
GRANT SELECT, INSERT, DELETE ON public.voter_checklist_progress TO authenticated;
GRANT ALL ON public.voter_checklist_progress TO service_role;
ALTER TABLE public.voter_checklist_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own checklist read" ON public.voter_checklist_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own checklist insert" ON public.voter_checklist_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own checklist delete" ON public.voter_checklist_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.poll_ride_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  phone text CHECK (phone IS NULL OR length(phone) <= 20),
  state_code text CHECK (state_code IS NULL OR state_code IN ('MO','KS')),
  created_at timestamptz DEFAULT now(),
  CHECK (user_id IS NOT NULL OR phone IS NOT NULL)
);
GRANT INSERT ON public.poll_ride_waitlist TO anon;
GRANT SELECT, INSERT ON public.poll_ride_waitlist TO authenticated;
GRANT ALL ON public.poll_ride_waitlist TO service_role;
ALTER TABLE public.poll_ride_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own waitlist read" ON public.poll_ride_waitlist FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own waitlist insert" ON public.poll_ride_waitlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anon waitlist insert" ON public.poll_ride_waitlist FOR INSERT TO anon WITH CHECK (user_id IS NULL AND phone IS NOT NULL);