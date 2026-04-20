
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'program_admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Update is_admin to use new role table (super_admin only). Keep legacy is_admin column compatibility.
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND is_admin = true
  )
$$;

-- 5. Helper: is this user a program-level admin (program_admin OR super_admin)
CREATE OR REPLACE FUNCTION public.is_program_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'program_admin')
  ) OR public.is_admin(_user_id)
$$;

-- 6. Migrate existing admins
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'super_admin'::public.app_role
FROM public.profiles
WHERE is_admin = true
ON CONFLICT DO NOTHING;

-- 7. RLS policies
CREATE POLICY "Users view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Super admins assign roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Super admins update roles"
  ON public.user_roles FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins remove roles"
  ON public.user_roles FOR DELETE
  USING (public.is_admin(auth.uid()));
