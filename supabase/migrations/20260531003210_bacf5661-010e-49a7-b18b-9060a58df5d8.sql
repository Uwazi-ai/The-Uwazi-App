
-- 1) org_invites: remove permissive SELECT, expose secure token lookup
DROP POLICY IF EXISTS "Anyone can read invites by token" ON public.org_invites;

CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  email text,
  role text,
  invited_by uuid,
  expires_at timestamptz,
  accepted_at timestamptz,
  org_name text,
  org_slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.org_id, i.email, i.role, i.invited_by, i.expires_at, i.accepted_at,
         o.name AS org_name, o.slug AS org_slug
  FROM public.org_invites i
  LEFT JOIN public.partner_orgs o ON o.id = i.org_id
  WHERE i.token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_invite_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;

-- Allow the invited (authenticated) user to mark their own invite accepted
CREATE POLICY "Invitee can accept own invite"
ON public.org_invites
FOR UPDATE
TO authenticated
USING (accepted_at IS NULL AND expires_at > now()
       AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 2) Make episode-videos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'episode-videos';

-- 3) Remove platform_settings from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.platform_settings;

-- 4) Tighten beta_feedback insert
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.beta_feedback;

CREATE POLICY "Authenticated users submit own feedback"
ON public.beta_feedback
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anonymous users submit feedback without identity"
ON public.beta_feedback
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL AND email IS NULL);
