-- Defense-in-depth: explicitly block non-admin sessions from setting
-- is_admin or is_suspended on profiles, even if column-level grants were
-- ever loosened. service_role bypasses this trigger by design.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_is_admin boolean := false;
BEGIN
  -- service_role / postgres / cron contexts have no auth.uid() — allow.
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  caller_is_admin := public.is_admin(caller);

  IF NOT caller_is_admin THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Not authorized to modify is_admin'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
      RAISE EXCEPTION 'Not authorized to modify is_suspended'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE OF is_admin, is_suspended ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();