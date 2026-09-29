ALTER TABLE public.city_onboarding ADD COLUMN IF NOT EXISTS reviewed_at timestamptz, ADD COLUMN IF NOT EXISTS reviewed_by uuid;

CREATE OR REPLACE FUNCTION public.validate_city_onboarding()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('requested','discovering','proposed','needs_human','approved','active','failed','reviewed','set_aside') THEN
    RAISE EXCEPTION 'Bad city status';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_city_active(_place text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF _place IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM civic_office_sources WHERE geoid = _place AND active) THEN
    UPDATE city_onboarding SET status = 'active' WHERE place_geoid = _place AND status <> 'active';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_city_review(_id uuid, _action text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_office_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _action = 'reviewed' THEN
    UPDATE city_onboarding SET status='reviewed', reviewed_at=now(), reviewed_by=auth.uid()
      WHERE id=_id AND status IN ('proposed','needs_human');
  ELSIF _action = 'set_aside' THEN
    UPDATE city_onboarding SET status='set_aside' WHERE id=_id AND status IN ('proposed','needs_human');
  ELSIF _action = 'bring_back' THEN
    UPDATE city_onboarding SET status='proposed', reviewed_at=NULL, reviewed_by=NULL WHERE id=_id AND status='set_aside';
  ELSE
    RAISE EXCEPTION 'Unknown action';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'This city cannot change that way right now'; END IF;
  RETURN _action;
END $$;
REVOKE ALL ON FUNCTION public.set_city_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_city_review(uuid, text) TO authenticated;

-- Sources that belong to a city: same place geoid, or a URL listed in its proposed sources
CREATE OR REPLACE FUNCTION public.trg_city_auto_reviewed()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE s civic_office_sources%ROWTYPE; c record;
BEGIN
  IF OLD.status <> 'pending' OR NEW.status = 'pending' OR NEW.source_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO s FROM civic_office_sources WHERE id = NEW.source_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  FOR c IN
    SELECT co.* FROM city_onboarding co
    WHERE co.status IN ('proposed','needs_human')
      AND (co.place_geoid = s.geoid OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(co.proposed_sources) p WHERE p->>'url' = s.source_url))
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM civic_office_pending_changes pc JOIN civic_office_sources ss ON ss.id = pc.source_id
      WHERE pc.status = 'pending' AND pc.id <> NEW.id
        AND (ss.geoid = c.place_geoid OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(c.proposed_sources) p WHERE p->>'url' = ss.source_url))
    ) THEN
      UPDATE city_onboarding SET status='reviewed', reviewed_at=now(), reviewed_by=NEW.reviewed_by WHERE id=c.id;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS city_auto_reviewed ON public.civic_office_pending_changes;
CREATE TRIGGER city_auto_reviewed AFTER UPDATE OF status ON public.civic_office_pending_changes
  FOR EACH ROW EXECUTE FUNCTION public.trg_city_auto_reviewed();

SELECT public.refresh_city_active(place_geoid) FROM public.city_onboarding;