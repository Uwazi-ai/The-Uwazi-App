-- 1. Rename the shared source and review tables, keep old names as views
ALTER TABLE public.civic_office_sources RENAME TO civic_data_sources;
ALTER TABLE public.civic_office_pending_changes RENAME TO civic_data_pending_changes;

ALTER TABLE public.civic_data_sources ADD COLUMN data_type text NOT NULL DEFAULT 'office';
ALTER TABLE public.civic_data_pending_changes ADD COLUMN data_type text NOT NULL DEFAULT 'office';
ALTER TABLE public.civic_data_pending_changes ADD COLUMN target_id uuid;
UPDATE public.civic_data_pending_changes SET data_type = 'office' WHERE data_type IS DISTINCT FROM 'office';
CREATE INDEX IF NOT EXISTS civic_data_pending_changes_type_status ON public.civic_data_pending_changes (data_type, status);

CREATE VIEW public.civic_office_sources WITH (security_invoker = true) AS SELECT * FROM public.civic_data_sources;
CREATE VIEW public.civic_office_pending_changes WITH (security_invoker = true) AS SELECT * FROM public.civic_data_pending_changes;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.civic_office_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.civic_office_pending_changes TO authenticated;
GRANT ALL ON public.civic_office_sources TO service_role;
GRANT ALL ON public.civic_office_pending_changes TO service_role;

-- 2. Source and change validation
CREATE OR REPLACE FUNCTION public.validate_source_health()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.source_health IS NOT NULL AND NEW.source_health NOT IN ('ok','blocked','unclear','broken') THEN
    RAISE EXCEPTION 'Invalid source health';
  END IF;
  IF NEW.data_type NOT IN ('office','budget') THEN RAISE EXCEPTION 'Invalid data type'; END IF;
  IF NEW.kind NOT IN ('office','candidates','budget') THEN RAISE EXCEPTION 'Invalid source kind'; END IF;
  IF NEW.kind = 'budget' AND NEW.data_type <> 'budget' THEN NEW.data_type := 'budget'; END IF;
  IF NEW.data_type = 'budget' THEN
    NEW.kind := 'budget';
    IF NEW.geoid IS NULL THEN RAISE EXCEPTION 'Pick the city for this budget source'; END IF;
    IF TG_OP = 'INSERT' AND NEW.check_frequency_hours = 168 THEN NEW.check_frequency_hours := 720; END IF;
  END IF;
  IF NEW.kind = 'candidates' THEN
    IF NEW.target_table NOT IN ('race_candidates','ballot_candidates') THEN RAISE EXCEPTION 'Pick where candidate changes go'; END IF;
    IF NEW.target_table = 'race_candidates' AND NEW.race_id IS NULL THEN RAISE EXCEPTION 'Pick a race'; END IF;
    IF NEW.target_table = 'ballot_candidates' AND (NEW.ballot_state IS NULL OR NEW.ballot_election_date IS NULL) THEN RAISE EXCEPTION 'Pick a state and election date'; END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.validate_office_change()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF NEW.origin NOT IN ('scraper','user_reported','manual') THEN RAISE EXCEPTION 'Invalid origin'; END IF;
  IF NEW.target_table IN ('civic_budgets','civic_budget_calendar') THEN NEW.data_type := 'budget'; END IF;
  IF NEW.data_type NOT IN ('office','budget') THEN RAISE EXCEPTION 'Invalid data type'; END IF;
  RETURN NEW;
END $function$;

-- 3. Budget tables
CREATE TABLE public.civic_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geoid text NOT NULL,
  fiscal_year text NOT NULL,
  department_or_fund text NOT NULL,
  category text,
  amount numeric(16,2) NOT NULL,
  revenue_or_expense text NOT NULL,
  office_id uuid REFERENCES public.civic_offices(id) ON DELETE SET NULL,
  source_url text,
  last_verified_at timestamptz,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.civic_budgets TO authenticated;
GRANT ALL ON public.civic_budgets TO service_role;
ALTER TABLE public.civic_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in people read city budgets" ON public.civic_budgets FOR SELECT TO authenticated USING (true);
CREATE UNIQUE INDEX civic_budgets_one_line ON public.civic_budgets
  (geoid, fiscal_year, lower(btrim(department_or_fund)), COALESCE(lower(btrim(category)), ''), revenue_or_expense);
CREATE INDEX civic_budgets_geoid_fy ON public.civic_budgets (geoid, fiscal_year);

CREATE TABLE public.civic_budget_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geoid text NOT NULL,
  fiscal_year text NOT NULL,
  milestone text NOT NULL,
  milestone_date date NOT NULL,
  label text,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.civic_budget_calendar TO authenticated;
GRANT ALL ON public.civic_budget_calendar TO service_role;
ALTER TABLE public.civic_budget_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in people read budget calendar" ON public.civic_budget_calendar FOR SELECT TO authenticated USING (true);
CREATE UNIQUE INDEX civic_budget_calendar_one ON public.civic_budget_calendar (geoid, fiscal_year, milestone, milestone_date);

CREATE OR REPLACE FUNCTION public.validate_budget_row()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.fiscal_year !~ '^FY \d{4}(-\d{2})?$' THEN RAISE EXCEPTION 'Fiscal year must look like FY 2026-27'; END IF;
  IF TG_TABLE_NAME = 'civic_budgets' THEN
    IF NEW.revenue_or_expense NOT IN ('revenue','expense') THEN RAISE EXCEPTION 'Pick revenue or expense'; END IF;
    IF NEW.amount < 0 THEN RAISE EXCEPTION 'Amount cannot be below zero'; END IF;
  ELSE
    IF NEW.milestone NOT IN ('proposal','hearing','adoption','fiscal_year_start') THEN RAISE EXCEPTION 'Invalid milestone'; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $function$;
CREATE TRIGGER civic_budgets_validate BEFORE INSERT OR UPDATE ON public.civic_budgets FOR EACH ROW EXECUTE FUNCTION public.validate_budget_row();
CREATE TRIGGER civic_budget_calendar_validate BEFORE INSERT OR UPDATE ON public.civic_budget_calendar FOR EACH ROW EXECUTE FUNCTION public.validate_budget_row();

-- 4. Computed views
CREATE VIEW public.civic_budget_percent_of_total WITH (security_invoker = true) AS
SELECT b.id, b.geoid, b.fiscal_year, b.department_or_fund, b.category, b.revenue_or_expense, b.amount,
       sum(b.amount) OVER w AS total_amount,
       CASE WHEN sum(b.amount) OVER w > 0 THEN round(b.amount * 100 / sum(b.amount) OVER w, 2) END AS percent_of_total,
       b.office_id, b.source_url, b.last_verified_at, b.data_source
FROM public.civic_budgets b
WINDOW w AS (PARTITION BY b.geoid, b.fiscal_year, b.revenue_or_expense);
GRANT SELECT ON public.civic_budget_percent_of_total TO authenticated;
GRANT ALL ON public.civic_budget_percent_of_total TO service_role;

CREATE VIEW public.civic_budget_year_over_year WITH (security_invoker = true) AS
SELECT cur.id, cur.geoid, cur.fiscal_year, cur.department_or_fund, cur.category, cur.revenue_or_expense,
       cur.amount, prev.fiscal_year AS prior_fiscal_year, prev.amount AS prior_amount,
       cur.amount - prev.amount AS change_amount,
       CASE WHEN prev.amount > 0 THEN round((cur.amount - prev.amount) * 100 / prev.amount, 1) END AS change_percent
FROM public.civic_budgets cur
JOIN public.civic_budgets prev
  ON prev.geoid = cur.geoid
 AND prev.revenue_or_expense = cur.revenue_or_expense
 AND lower(btrim(prev.department_or_fund)) = lower(btrim(cur.department_or_fund))
 AND COALESCE(lower(btrim(prev.category)), '') = COALESCE(lower(btrim(cur.category)), '')
 AND substring(prev.fiscal_year from '\d{4}')::int = substring(cur.fiscal_year from '\d{4}')::int - 1;
GRANT SELECT ON public.civic_budget_year_over_year TO authenticated;
GRANT ALL ON public.civic_budget_year_over_year TO service_role;

-- 5. Review approval handles budget rows too
CREATE OR REPLACE FUNCTION public.review_office_change(_change_id uuid, _approve boolean)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  c public.civic_data_pending_changes%ROWTYPE;
  s public.civic_data_sources%ROWTYPE;
  v_url text; v_party text; v_geoid text; v_title text; v_existing uuid; v_seats int; v_amt numeric; v_date date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_office_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM public.civic_data_pending_changes WHERE id = _change_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change not found'; END IF;
  IF c.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  IF NOT _approve THEN
    UPDATE public.civic_data_pending_changes SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=c.id;
    RETURN 'rejected';
  END IF;

  IF c.origin = 'manual' AND c.reported_by = auth.uid() AND public.office_reviewer_count() >= 2 THEN
    RAISE EXCEPTION 'Another admin or reviewer must approve an office you entered' USING ERRCODE = '42501';
  END IF;

  IF c.source_id IS NOT NULL THEN SELECT * INTO s FROM public.civic_data_sources WHERE id = c.source_id; END IF;

  IF c.target_table = 'civic_budgets' THEN
    v_url := COALESCE(NULLIF(c.proposed->>'source_url',''), s.source_url);
    IF c.field_changed = 'new_budget_line' THEN
      v_amt := (c.proposed->>'amount')::numeric;
      INSERT INTO public.civic_budgets (geoid, fiscal_year, department_or_fund, category, amount, revenue_or_expense, source_url, last_verified_at, data_source)
      VALUES (COALESCE(NULLIF(c.proposed->>'geoid',''), s.geoid), c.proposed->>'fiscal_year', c.proposed->>'department_or_fund',
              NULLIF(c.proposed->>'category',''), v_amt, c.proposed->>'revenue_or_expense', v_url, now(), COALESCE(s.label, 'admin'))
      ON CONFLICT (geoid, fiscal_year, lower(btrim(department_or_fund)), COALESCE(lower(btrim(category)), ''), revenue_or_expense)
      DO UPDATE SET amount = EXCLUDED.amount, source_url = EXCLUDED.source_url, last_verified_at = now(), data_source = EXCLUDED.data_source
      RETURNING id INTO v_existing;
      UPDATE public.civic_data_pending_changes SET target_id = v_existing WHERE id = c.id;
    ELSIF c.field_changed = 'amount' THEN
      IF c.target_id IS NULL THEN RAISE EXCEPTION 'This change has no budget line'; END IF;
      v_amt := NULLIF(regexp_replace(COALESCE(c.new_value,''), '[^0-9.]', '', 'g'), '')::numeric;
      IF v_amt IS NULL THEN RAISE EXCEPTION 'Add the right amount before you approve'; END IF;
      UPDATE public.civic_budgets SET amount = v_amt, source_url = COALESCE(v_url, source_url), last_verified_at = now() WHERE id = c.target_id;
    ELSE
      UPDATE public.civic_budgets SET last_verified_at = now() WHERE id = c.target_id;
    END IF;
  ELSIF c.target_table = 'civic_budget_calendar' THEN
    v_url := COALESCE(NULLIF(c.proposed->>'source_url',''), s.source_url);
    IF c.field_changed = 'new_milestone' THEN
      v_date := (c.proposed->>'milestone_date')::date;
      INSERT INTO public.civic_budget_calendar (geoid, fiscal_year, milestone, milestone_date, label, source_url, last_verified_at)
      VALUES (COALESCE(NULLIF(c.proposed->>'geoid',''), s.geoid), c.proposed->>'fiscal_year', c.proposed->>'milestone', v_date,
              NULLIF(c.proposed->>'label',''), v_url, now())
      ON CONFLICT (geoid, fiscal_year, milestone, milestone_date)
      DO UPDATE SET label = COALESCE(EXCLUDED.label, civic_budget_calendar.label), source_url = EXCLUDED.source_url, last_verified_at = now()
      RETURNING id INTO v_existing;
      UPDATE public.civic_data_pending_changes SET target_id = v_existing WHERE id = c.id;
    ELSIF c.field_changed = 'milestone_date' THEN
      UPDATE public.civic_budget_calendar SET milestone_date = c.new_value::date, source_url = COALESCE(v_url, source_url), last_verified_at = now() WHERE id = c.target_id;
    ELSE
      UPDATE public.civic_budget_calendar SET last_verified_at = now() WHERE id = c.target_id;
    END IF;
  ELSIF c.target_table = 'race_candidates' THEN
    v_party := lower(COALESCE(c.proposed->>'party', ''));
    v_party := CASE WHEN v_party LIKE 'dem%' THEN 'democrat' WHEN v_party LIKE 'rep%' THEN 'republican'
                    WHEN v_party LIKE 'non%' THEN 'nonpartisan' ELSE 'independent' END;
    IF c.field_changed = 'new_candidate' THEN
      INSERT INTO public.race_candidates (race_id, name, party, is_incumbent, status)
      VALUES (c.contest_ref, c.proposed->>'name', v_party, COALESCE((c.proposed->>'is_incumbent')::boolean, false), 'active');
    ELSIF c.field_changed = 'party' THEN
      UPDATE public.race_candidates SET party = v_party, updated_at = now() WHERE id = c.candidate_id;
    ELSIF c.field_changed = 'withdrawn' THEN
      UPDATE public.race_candidates SET status = 'withdrew', updated_at = now() WHERE id = c.candidate_id;
    END IF;
  ELSIF c.target_table = 'ballot_candidates' THEN
    IF c.field_changed = 'new_candidate' THEN
      INSERT INTO public.ballot_candidates (contest_id, name, party, is_incumbent, source_url, sort_order)
      VALUES (c.contest_ref, c.proposed->>'name', NULLIF(c.proposed->>'party',''),
              COALESCE((c.proposed->>'is_incumbent')::boolean, false), s.source_url,
              COALESCE((SELECT max(sort_order) + 1 FROM public.ballot_candidates WHERE contest_id = c.contest_ref), 0));
    ELSIF c.field_changed = 'party' THEN
      UPDATE public.ballot_candidates SET party = c.new_value, source_url = COALESCE(s.source_url, source_url), updated_at = now() WHERE id = c.candidate_id;
    ELSIF c.field_changed = 'withdrawn' THEN
      UPDATE public.ballot_candidates SET withdrawn_at = now(), updated_at = now() WHERE id = c.candidate_id;
    END IF;
  ELSE
    v_url := COALESCE(c.proposed->>'source_url', s.source_url, (SELECT source_url FROM public.civic_offices WHERE id = c.office_id));
    IF c.office_id IS NULL THEN
      IF c.proposed IS NULL OR COALESCE(c.proposed->>'office_title','') = '' THEN
        RAISE EXCEPTION 'This change has no office to add';
      END IF;
      v_geoid := COALESCE(NULLIF(c.proposed->>'geoid',''), s.geoid);
      v_title := c.proposed->>'office_title';
      SELECT count(*) INTO v_seats FROM public.civic_offices
        WHERE geoid IS NOT DISTINCT FROM v_geoid AND norm_office_title(office_title) = norm_office_title(v_title);
      IF v_seats = 1 THEN
        SELECT id INTO v_existing FROM public.civic_offices
          WHERE geoid IS NOT DISTINCT FROM v_geoid AND norm_office_title(office_title) = norm_office_title(v_title);
      ELSIF v_seats > 1 THEN
        SELECT id INTO v_existing FROM public.civic_offices
          WHERE geoid IS NOT DISTINCT FROM v_geoid AND norm_office_title(office_title) = norm_office_title(v_title)
            AND norm_office_title(current_holder) = norm_office_title(c.proposed->>'current_holder') LIMIT 1;
        IF v_existing IS NULL THEN
          RAISE EXCEPTION 'This office has more than one seat. Update the right seat by hand.';
        END IF;
      END IF;
      IF v_existing IS NOT NULL THEN
        UPDATE public.civic_offices SET
          current_holder = c.proposed->>'current_holder',
          term_end = COALESCE(NULLIF(c.proposed->>'term_end',''), term_end),
          source_url = COALESCE(v_url, source_url),
          last_verified_at = now(), updated_at = now()
        WHERE id = v_existing;
        UPDATE public.civic_data_pending_changes SET office_id = v_existing WHERE id = c.id;
      ELSE
        INSERT INTO public.civic_offices (geoid, office_title, jurisdiction_level, current_holder, term_end, data_source, source_url, last_verified_at, district_type, district_code)
        VALUES (v_geoid, v_title,
                CASE WHEN v_geoid ~ '^\d{5}$' THEN 'county' ELSE COALESCE(NULLIF(c.proposed->>'jurisdiction_level',''), s.jurisdiction_level) END,
                c.proposed->>'current_holder', c.proposed->>'term_end',
                COALESCE(NULLIF(c.proposed->>'data_source',''), s.label, 'admin'), v_url, now(),
                NULLIF(c.proposed->>'district_type',''), NULLIF(c.proposed->>'district_code',''));
      END IF;
    ELSIF c.field_changed IN ('current_holder','office_title','term_end','district_type','district_code') THEN
      EXECUTE format('UPDATE public.civic_offices SET %I = $1, last_verified_at = now(), source_url = COALESCE($2, source_url) WHERE id = $3', c.field_changed)
        USING NULLIF(c.new_value,''), v_url, c.office_id;
      IF c.field_changed = 'district_code' AND COALESCE(c.proposed->>'district_type','') <> '' THEN
        UPDATE public.civic_offices SET district_type = c.proposed->>'district_type' WHERE id = c.office_id;
      END IF;
    ELSE
      UPDATE public.civic_offices SET last_verified_at = now() WHERE id = c.office_id;
    END IF;
  END IF;

  UPDATE public.civic_data_pending_changes SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=c.id;
  RETURN 'approved';
END $function$;

-- 6. People can report a wrong budget figure
CREATE OR REPLACE FUNCTION public.report_budget_issue(_budget_id uuid, _correct_value text, _note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE b public.civic_budgets%ROWTYPE; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_active_subscription(auth.uid(),'live') OR public.has_active_subscription(auth.uid(),'sandbox') OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'UWAZI+ required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO b FROM public.civic_budgets WHERE id = _budget_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Budget line not found'; END IF;
  IF (SELECT count(*) FROM public.civic_data_pending_changes WHERE reported_by = auth.uid() AND extracted_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'Too many reports today';
  END IF;
  INSERT INTO public.civic_data_pending_changes (field_changed, old_value, new_value, note, reported_by, origin, data_type, target_table, target_id, proposed)
  VALUES (CASE WHEN NULLIF(btrim(_correct_value),'') IS NULL THEN 'other' ELSE 'amount' END,
          b.amount::text, left(NULLIF(btrim(_correct_value),''),100), left(NULLIF(btrim(_note),''),1000),
          auth.uid(), 'user_reported', 'budget', 'civic_budgets', b.id,
          jsonb_build_object('department_or_fund', b.department_or_fund, 'fiscal_year', b.fiscal_year, 'geoid', b.geoid))
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$;
REVOKE EXECUTE ON FUNCTION public.report_budget_issue(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.report_budget_issue(uuid, text, text) TO authenticated;