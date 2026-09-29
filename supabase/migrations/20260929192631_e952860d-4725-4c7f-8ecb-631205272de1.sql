CREATE TABLE public.compass_budget_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.compass_sessions(id) ON DELETE CASCADE,
  allocation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.compass_budget_priorities TO authenticated;
GRANT ALL ON public.compass_budget_priorities TO service_role;
ALTER TABLE public.compass_budget_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own session budget read" ON public.compass_budget_priorities FOR SELECT TO authenticated USING (public.owns_compass_session(session_id));
CREATE POLICY "Own session budget insert" ON public.compass_budget_priorities FOR INSERT TO authenticated WITH CHECK (public.owns_compass_session(session_id));

CREATE OR REPLACE FUNCTION public.validate_budget_allocation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE k text; total int := 0; v int;
BEGIN
  IF jsonb_typeof(NEW.allocation) <> 'object' THEN RAISE EXCEPTION 'Bad allocation'; END IF;
  FOR k IN SELECT jsonb_object_keys(NEW.allocation) LOOP
    IF k NOT IN ('safety','housing','schools_youth','streets_transit','health','jobs') THEN RAISE EXCEPTION 'Bad allocation key'; END IF;
    v := (NEW.allocation->>k)::int;
    IF v < 0 OR v > 100 THEN RAISE EXCEPTION 'Bad allocation value'; END IF;
    total := total + v;
  END LOOP;
  IF total <> 100 THEN RAISE EXCEPTION 'The split must add up to 100'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_budget BEFORE INSERT ON public.compass_budget_priorities FOR EACH ROW EXECUTE FUNCTION public.validate_budget_allocation();

CREATE TABLE public.compass_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id uuid NOT NULL REFERENCES public.compass_dimensions(id) ON DELETE CASCADE,
  geoid text,
  text text NOT NULL,
  source_url text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.compass_facts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.compass_facts TO authenticated;
GRANT ALL ON public.compass_facts TO service_role;
ALTER TABLE public.compass_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read facts" ON public.compass_facts FOR SELECT USING (true);
CREATE POLICY "Admins insert facts" ON public.compass_facts FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) AND source_url ~* '^https?://');
CREATE POLICY "Admins update facts" ON public.compass_facts FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()) AND source_url ~* '^https?://');
CREATE POLICY "Admins delete facts" ON public.compass_facts FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

INSERT INTO public.compass_facts (dimension_id, text, source_url)
SELECT d.id, f.t, f.u FROM (VALUES
 ('local-accountability','Your city council passes local laws and sets the city budget. Most council meetings are open to the public.','https://www.usa.gov/local-governments'),
 ('civic-participation','Local elections often decide who runs your city, your schools, and your county. In most states you can register to vote online.','https://www.usa.gov/register-to-vote'),
 ('public-safety','Most police officers in the United States work for a city or a county.','https://bjs.ojp.gov/topics/law-enforcement'),
 ('housing-development','Local public housing agencies run public housing and help families pay rent.','https://www.hud.gov/topics/rental_assistance/phprog'),
 ('infrastructure-mobility','Cities and counties take care of most public roads in the country.','https://www.fhwa.dot.gov/policyinformation/statistics.cfm'),
 ('education-youth','Most money for public schools comes from state and local sources. Only a small part comes from the federal government.','https://www.ed.gov/about/ed-overview'),
 ('health-wellbeing','Every state has a health department. Local health teams inspect restaurants and help stop the spread of disease.','https://www.usa.gov/state-health'),
 ('economic-opportunity','Free local business centers can help you start or grow a small business.','https://www.sba.gov/counseling/local-assistance/')
) AS f(s,t,u) JOIN public.compass_dimensions d ON d.slug = f.s;

-- People in your city. Returns one summary row or nothing. Never individual rows.
CREATE OR REPLACE FUNCTION public.city_top_identity()
RETURNS TABLE(label text, people integer, area text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_place text; v_zip text; v_total int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT resolved->>'place' INTO v_place FROM user_districts WHERE user_id = auth.uid();
  IF v_place IS NULL THEN SELECT zip_code INTO v_zip FROM profiles WHERE user_id = auth.uid(); END IF;
  IF v_place IS NULL AND v_zip IS NULL THEN RETURN; END IF;

  CREATE TEMP TABLE IF NOT EXISTS _cti(lbl text) ON COMMIT DROP;
  TRUNCATE _cti;
  INSERT INTO _cti
  SELECT p.persona_labels->>'primary' FROM user_civic_persona p
  WHERE COALESCE((p.consent_scope->>'research')::boolean,false)
    AND p.persona_labels->>'primary' IS NOT NULL
    AND (
      (v_place IS NOT NULL AND EXISTS (SELECT 1 FROM user_districts u WHERE u.user_id = p.user_id AND u.resolved->>'place' = v_place))
      OR (v_place IS NULL AND EXISTS (SELECT 1 FROM profiles pr WHERE pr.user_id = p.user_id AND pr.zip_code = v_zip))
    );
  SELECT count(*) INTO v_total FROM _cti;
  IF v_total < 25 THEN RETURN; END IF;
  RETURN QUERY SELECT c.lbl, v_total, CASE WHEN v_place IS NOT NULL THEN 'city' ELSE 'zip' END
    FROM _cti c GROUP BY c.lbl ORDER BY count(*) DESC, c.lbl LIMIT 1;
END $$;
REVOKE EXECUTE ON FUNCTION public.city_top_identity() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.city_top_identity() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_budget_allocation() FROM public, anon, authenticated;