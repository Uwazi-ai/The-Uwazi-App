
-- 1) Strengthen profiles privilege-escalation trigger to also block org_role, crm_notes, contact_tags
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_is_admin boolean := false;
BEGIN
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  caller_is_admin := public.is_admin(caller);

  IF NOT caller_is_admin THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Not authorized to modify is_admin' USING ERRCODE = '42501';
    END IF;
    IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
      RAISE EXCEPTION 'Not authorized to modify is_suspended' USING ERRCODE = '42501';
    END IF;
    IF NEW.org_role IS DISTINCT FROM OLD.org_role THEN
      RAISE EXCEPTION 'Not authorized to modify org_role' USING ERRCODE = '42501';
    END IF;
    IF NEW.crm_notes IS DISTINCT FROM OLD.crm_notes THEN
      RAISE EXCEPTION 'Not authorized to modify crm_notes' USING ERRCODE = '42501';
    END IF;
    IF NEW.contact_tags IS DISTINCT FROM OLD.contact_tags THEN
      RAISE EXCEPTION 'Not authorized to modify contact_tags' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Also revoke column-level UPDATE privileges from authenticated for these fields
REVOKE UPDATE (is_admin, is_suspended, org_role, crm_notes, contact_tags)
  ON public.profiles FROM authenticated;

-- 2) Replace the permissive org_invites accept-own-invite UPDATE policy with a
--    SECURITY DEFINER RPC that only updates accepted_at.
DROP POLICY IF EXISTS "Invitee can accept own invite" ON public.org_invites;

CREATE OR REPLACE FUNCTION public.accept_org_invite(_token text)
RETURNS TABLE (
  invite_id uuid,
  org_id uuid,
  org_name text,
  org_slug text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_email text;
  inv RECORD;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Must be signed in to accept an invite' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO caller_email FROM auth.users WHERE id = caller_id;

  SELECT i.id, i.org_id, i.email, i.role, i.invited_by, i.expires_at, i.accepted_at,
         o.name AS org_name, o.slug AS org_slug
    INTO inv
    FROM public.org_invites i
    LEFT JOIN public.partner_orgs o ON o.id = i.org_id
   WHERE i.token = _token
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found' USING ERRCODE = '22023';
  END IF;
  IF inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already accepted' USING ERRCODE = '22023';
  END IF;
  IF inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired' USING ERRCODE = '22023';
  END IF;
  IF lower(inv.email) <> lower(caller_email) THEN
    RAISE EXCEPTION 'Invite email does not match signed-in user' USING ERRCODE = '42501';
  END IF;

  -- Mark accepted (server-side; user has no direct UPDATE rights)
  UPDATE public.org_invites
     SET accepted_at = now()
   WHERE id = inv.id;

  -- Create / activate membership using the invite's role (never user-supplied)
  INSERT INTO public.org_members (org_id, user_id, role, status, invited_by)
  VALUES (inv.org_id, caller_id, COALESCE(inv.role, 'member'), 'active', inv.invited_by)
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'active',
        invited_by = EXCLUDED.invited_by;

  -- Set profile org_role (privileged column — done in security-definer context)
  UPDATE public.profiles
     SET org_role = CASE WHEN inv.role = 'admin' THEN 'org_admin' ELSE 'org_member' END
   WHERE user_id = caller_id;

  RETURN QUERY SELECT inv.id, inv.org_id, inv.org_name, inv.org_slug, inv.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_org_invite(text) TO authenticated;

-- 3) Normalize episodes.video_url to storage path only for Supabase-stored videos.
--    The resolve-episode-video edge function will be updated to accept paths.
UPDATE public.episodes
   SET video_url = regexp_replace(
         video_url,
         '^https?://[^/]+/storage/v1/object/public/episode-videos/',
         ''
       )
 WHERE video_url ~ '^https?://[^/]+/storage/v1/object/public/episode-videos/';
