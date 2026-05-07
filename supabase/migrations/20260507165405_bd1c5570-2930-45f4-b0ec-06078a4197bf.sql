
-- 1. Add columns to profiles FIRST
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_org TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_role TEXT;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_org_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND org_role = 'super_admin'
  ) OR public.is_admin(_user_id)
$$;

-- 3. partner_orgs table
CREATE TABLE public.partner_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  city TEXT,
  category TEXT,
  civic_impact_score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_partner_org_category()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.category IS NOT NULL AND NEW.category NOT IN ('faith','hbcu','nonprofit','union','youth','government','other') THEN
    RAISE EXCEPTION 'Invalid category: %', NEW.category;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_partner_org_category
BEFORE INSERT OR UPDATE ON public.partner_orgs
FOR EACH ROW EXECUTE FUNCTION public.validate_partner_org_category();

ALTER TABLE public.partner_orgs ENABLE ROW LEVEL SECURITY;

-- 4. org_members table
CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT DEFAULT 'active',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE OR REPLACE FUNCTION public.validate_org_member_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.role NOT IN ('admin','member') THEN RAISE EXCEPTION 'Invalid role: %', NEW.role; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_org_member_role BEFORE INSERT OR UPDATE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.validate_org_member_role();

CREATE OR REPLACE FUNCTION public.validate_org_member_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('active','pending','removed') THEN RAISE EXCEPTION 'Invalid status: %', NEW.status; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_org_member_status BEFORE INSERT OR UPDATE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.validate_org_member_status();

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Now create is_org_admin (needs org_members to exist)
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id AND role = 'admin' AND status = 'active'
  )
$$;

-- 5. RLS for partner_orgs
CREATE POLICY "Super admins manage all orgs" ON public.partner_orgs FOR ALL TO authenticated
USING (public.is_org_super_admin(auth.uid())) WITH CHECK (public.is_org_super_admin(auth.uid()));

CREATE POLICY "Org admins can read their org" ON public.partner_orgs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.org_members WHERE org_members.org_id = partner_orgs.id AND org_members.user_id = auth.uid() AND org_members.role = 'admin' AND org_members.status = 'active'));

CREATE POLICY "Anyone can read active orgs" ON public.partner_orgs FOR SELECT TO anon, authenticated
USING (is_active = true);

-- 6. RLS for org_members
CREATE POLICY "Super admins manage all members" ON public.org_members FOR ALL TO authenticated
USING (public.is_org_super_admin(auth.uid())) WITH CHECK (public.is_org_super_admin(auth.uid()));

CREATE POLICY "Org admins manage their org members" ON public.org_members FOR ALL TO authenticated
USING (public.is_org_admin(auth.uid(), org_id)) WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Users can read own membership" ON public.org_members FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 7. org_invites table
CREATE TABLE public.org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all invites" ON public.org_invites FOR ALL TO authenticated
USING (public.is_org_super_admin(auth.uid())) WITH CHECK (public.is_org_super_admin(auth.uid()));

CREATE POLICY "Org admins manage their org invites" ON public.org_invites FOR ALL TO authenticated
USING (public.is_org_admin(auth.uid(), org_id)) WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Anyone can read invites by token" ON public.org_invites FOR SELECT TO anon, authenticated USING (true);

-- 8. org_registrations table
CREATE TABLE public.org_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.partner_orgs(id),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_org_registration_event()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.event_type NOT IN ('registration_check','registration_started','registration_completed','uwazi_signup') THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_org_registration_event BEFORE INSERT OR UPDATE ON public.org_registrations FOR EACH ROW EXECUTE FUNCTION public.validate_org_registration_event();

ALTER TABLE public.org_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read all registrations" ON public.org_registrations FOR SELECT TO authenticated
USING (public.is_org_super_admin(auth.uid()));

CREATE POLICY "Org admins read their org registrations" ON public.org_registrations FOR SELECT TO authenticated
USING (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Authenticated users can insert registrations" ON public.org_registrations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 9. Indexes
CREATE INDEX idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX idx_org_invites_token ON public.org_invites(token);
CREATE INDEX idx_org_invites_org_id ON public.org_invites(org_id);
CREATE INDEX idx_org_registrations_org_id ON public.org_registrations(org_id);
CREATE INDEX idx_partner_orgs_slug ON public.partner_orgs(slug);
CREATE INDEX idx_profiles_referred_by_org ON public.profiles(referred_by_org);
