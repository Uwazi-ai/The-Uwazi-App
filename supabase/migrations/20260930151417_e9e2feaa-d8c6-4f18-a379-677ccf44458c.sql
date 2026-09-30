ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free','plus','plus_student'));

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); caller_is_admin boolean := false;
BEGIN
  IF caller IS NULL THEN RETURN NEW; END IF;
  caller_is_admin := public.is_admin(caller);
  IF NOT caller_is_admin THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN RAISE EXCEPTION 'Not authorized to modify is_admin' USING ERRCODE = '42501'; END IF;
    IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN RAISE EXCEPTION 'Not authorized to modify is_suspended' USING ERRCODE = '42501'; END IF;
    IF NEW.org_role IS DISTINCT FROM OLD.org_role THEN RAISE EXCEPTION 'Not authorized to modify org_role' USING ERRCODE = '42501'; END IF;
    IF NEW.crm_notes IS DISTINCT FROM OLD.crm_notes THEN RAISE EXCEPTION 'Not authorized to modify crm_notes' USING ERRCODE = '42501'; END IF;
    IF NEW.contact_tags IS DISTINCT FROM OLD.contact_tags THEN RAISE EXCEPTION 'Not authorized to modify contact_tags' USING ERRCODE = '42501'; END IF;
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN RAISE EXCEPTION 'Not authorized to modify plan' USING ERRCODE = '42501'; END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_plus(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND plan IN ('plus','plus_student'))
    OR public.is_admin(_user_id)
    OR public.has_active_subscription(_user_id, 'live')
    OR public.has_active_subscription(_user_id, 'sandbox')
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_plus(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_profile_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE active boolean;
BEGIN
  active := (NEW.status IN ('active','trialing','past_due') AND (NEW.current_period_end IS NULL OR NEW.current_period_end > now()))
         OR (NEW.status = 'canceled' AND NEW.current_period_end > now());
  UPDATE public.profiles SET plan = CASE
      WHEN active AND NEW.price_id LIKE 'uwazi_plus_student%' THEN 'plus_student'
      WHEN active THEN 'plus' ELSE 'free' END
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_profile_plan ON public.subscriptions;
CREATE TRIGGER trg_sync_profile_plan AFTER INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.sync_profile_plan();

CREATE TABLE IF NOT EXISTS public.ask_usage (
  user_id uuid PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ask_usage TO authenticated;
GRANT ALL ON public.ask_usage TO service_role;
ALTER TABLE public.ask_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People read their own question count" ON public.ask_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_ask_question(_user_id uuid, _count boolean, _limit int DEFAULT 5, _hours int DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.ask_usage; win interval := make_interval(hours => _hours);
BEGIN
  IF public.is_plus(_user_id) THEN
    RETURN jsonb_build_object('allowed', true, 'is_plus', true, 'used', null, 'remaining', null, 'reset_at', null);
  END IF;
  INSERT INTO public.ask_usage(user_id, window_start, count) VALUES (_user_id, now(), 0)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO r FROM public.ask_usage WHERE user_id = _user_id FOR UPDATE;
  IF r.window_start + win <= now() THEN
    UPDATE public.ask_usage SET window_start = now(), count = 0, updated_at = now() WHERE user_id = _user_id RETURNING * INTO r;
  END IF;
  IF _count THEN
    IF r.count >= _limit THEN
      RETURN jsonb_build_object('allowed', false, 'is_plus', false, 'used', r.count, 'remaining', 0, 'reset_at', r.window_start + win);
    END IF;
    IF r.count = 0 THEN
      UPDATE public.ask_usage SET window_start = now(), count = 1, updated_at = now() WHERE user_id = _user_id RETURNING * INTO r;
    ELSE
      UPDATE public.ask_usage SET count = count + 1, updated_at = now() WHERE user_id = _user_id RETURNING * INTO r;
    END IF;
  END IF;
  RETURN jsonb_build_object('allowed', r.count < _limit OR _count, 'is_plus', false, 'used', r.count,
    'remaining', greatest(0, _limit - r.count),
    'reset_at', CASE WHEN r.count > 0 THEN r.window_start + win ELSE null END);
END $$;
REVOKE ALL ON FUNCTION public.consume_ask_question(uuid, boolean, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ask_question(uuid, boolean, int, int) TO service_role;

ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS plus_only boolean NOT NULL DEFAULT false;
UPDATE public.episodes SET is_free = false WHERE is_free = true;
INSERT INTO public.platform_settings(key, value) VALUES ('free_episode_limit', '5'::jsonb) ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.free_episode_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.episodes WHERE is_published AND is_free
  UNION
  SELECT id FROM (
    SELECT id FROM public.episodes WHERE is_published AND NOT plus_only
    ORDER BY created_at DESC, sort_order ASC
    LIMIT coalesce((SELECT (value #>> '{}')::int FROM public.platform_settings WHERE key = 'free_episode_limit'), 5)
  ) t
$$;
GRANT EXECUTE ON FUNCTION public.free_episode_ids() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.log_episode_video_access(_user_id uuid, _episode_id uuid, _video_path text DEFAULT NULL::text, _context jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(granted boolean, reason text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE ep RECORD; v_granted boolean := false; v_reason text := 'denied_no_match';
BEGIN
  SELECT id, is_published INTO ep FROM public.episodes WHERE id = _episode_id;
  IF NOT FOUND THEN v_reason := 'denied_episode_not_found';
  ELSIF ep.is_published = false THEN v_reason := 'denied_unpublished';
  ELSIF _episode_id IN (SELECT public.free_episode_ids()) THEN v_granted := true; v_reason := 'granted_free_episode';
  ELSIF _user_id IS NOT NULL AND public.is_plus(_user_id) THEN v_granted := true; v_reason := 'granted_plus';
  ELSIF _user_id IS NULL THEN v_reason := 'denied_anonymous';
  ELSE v_reason := 'denied_no_subscription';
  END IF;
  INSERT INTO public.episode_video_access_log (user_id, episode_id, video_path, granted, reason, context)
  VALUES (_user_id, _episode_id, _video_path, v_granted, v_reason, _context);
  RETURN QUERY SELECT v_granted, v_reason;
END;
$function$;

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS plus_only boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.student_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  method text NOT NULL CHECK (method IN ('school_email','student_id')),
  school_email text,
  school_name text,
  id_hash text,
  token_hash text,
  token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','needs_review','rejected')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_verification_user ON public.student_verification(user_id);
GRANT SELECT ON public.student_verification TO authenticated;
GRANT ALL ON public.student_verification TO service_role;
ALTER TABLE public.student_verification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People see their own student check" ON public.student_verification FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins see student checks" ON public.student_verification FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_student_verification_updated BEFORE UPDATE ON public.student_verification FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_verified_student(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_verification WHERE user_id = _user_id AND status = 'verified')
$$;
GRANT EXECUTE ON FUNCTION public.is_verified_student(uuid) TO authenticated, service_role;

ALTER TABLE public.compass_personas ADD COLUMN IF NOT EXISTS archetype_intro text, ADD COLUMN IF NOT EXISTS archetype_examples text;
UPDATE public.compass_personas SET archetype_intro = v.intro, archetype_examples = v.ex FROM (VALUES
 ('watchdog','You stand in the tradition of investigative journalists, auditors, and open records advocates.','Investigative journalists, auditors, open records advocates'),
 ('guardian','You stand with the first responders, safety organizers, and neighbors who look out for each other.','First responders, safety organizers, neighbors who look out'),
 ('organizer','You stand in the tradition of community organizers, union hall leaders, and get out the vote captains.','Community organizers, union hall leaders, vote captains'),
 ('builder','You stand with the small business founders, tradespeople, and job creators.','Small business founders, tradespeople, job creators'),
 ('neighbor','You stand with the housing advocates, block clubs, and neighborhood planners.','Housing advocates, block clubs, neighborhood planners'),
 ('mentor','You stand with the teachers, coaches, and youth mentors.','Teachers, coaches, youth mentors'),
 ('caretaker','You stand with the public health pioneers, care workers, and mutual aid networks.','Public health pioneers, care workers, mutual aid networks'),
 ('connector','You stand with the transit planners, road crews, and access advocates.','Transit planners, road crews, access advocates'),
 ('steward','You stand with the coalition builders and public servants who hold many needs at once.','Coalition builders, public servants')
) AS v(slug, intro, ex) WHERE compass_personas.slug = v.slug;