CREATE TABLE public.ballot_crawl_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'sample_ballot' CHECK (kind IN ('sample_ballot','notice','measures')),
  authority text NOT NULL,
  discovered boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  resolved_url text,
  last_fetched_at timestamptz,
  last_hash text,
  last_changed_at timestamptz,
  last_status text,
  last_error text,
  last_contest_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ballot_crawl_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL DEFAULT 'manual',
  started_by uuid,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
CREATE TABLE public.ballot_staged_contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ballot_crawl_runs(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.ballot_crawl_sources(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_url text NOT NULL,
  fetched_at timestamptz NOT NULL,
  content_hash text NOT NULL,
  contest_type text NOT NULL CHECK (contest_type IN ('candidate_race','ballot_measure','retention')),
  title text NOT NULL,
  district text,
  vote_for integer,
  printed_order integer NOT NULL DEFAULT 0,
  ballot_question text,
  yes_statement text,
  no_statement text,
  has_write_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ballot_staged_contests (run_id);
CREATE TABLE public.ballot_staged_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staged_contest_id uuid NOT NULL REFERENCES public.ballot_staged_contests(id) ON DELETE CASCADE,
  name text NOT NULL,
  party text,
  printed_order integer NOT NULL DEFAULT 0
);
CREATE INDEX ON public.ballot_staged_candidates (staged_contest_id);
CREATE TABLE public.ballot_crawl_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_key text NOT NULL UNIQUE,
  run_id uuid REFERENCES public.ballot_crawl_runs(id) ON DELETE SET NULL,
  finding_type text NOT NULL,
  summary text NOT NULL,
  contest_id uuid,
  related_contest_ids uuid[] NOT NULL DEFAULT '{}',
  staged_contest_id uuid,
  proposed jsonb NOT NULL DEFAULT '{"action":"acknowledge"}'::jsonb,
  safe boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','failed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  apply_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ballot_crawl_sources, public.ballot_crawl_runs, public.ballot_staged_contests, public.ballot_staged_candidates, public.ballot_crawl_findings TO authenticated;
GRANT ALL ON public.ballot_crawl_sources, public.ballot_crawl_runs, public.ballot_staged_contests, public.ballot_staged_candidates, public.ballot_crawl_findings TO service_role;

ALTER TABLE public.ballot_crawl_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballot_crawl_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballot_staged_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballot_staged_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballot_crawl_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read crawl sources" ON public.ballot_crawl_sources FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins read crawl runs" ON public.ballot_crawl_runs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins read staged contests" ON public.ballot_staged_contests FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins read staged candidates" ON public.ballot_staged_candidates FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins read crawl findings" ON public.ballot_crawl_findings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Applies one reviewed finding. Only whitelisted actions; never touches supporters_say or opponents_say.
CREATE OR REPLACE FUNCTION public.apply_ballot_finding_internal(_id uuid, _actor uuid, _safe_only boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f public.ballot_crawl_findings; p jsonb; a text; old_status text; new_id uuid; c jsonb; i int := 0;
BEGIN
  SELECT * INTO f FROM public.ballot_crawl_findings WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  IF f.status <> 'pending' THEN RETURN 'not_pending'; END IF;
  IF _safe_only AND NOT f.safe THEN RETURN 'not_safe'; END IF;
  p := f.proposed; a := p->>'action';
  IF a = 'hide_contest' THEN
    SELECT verification_status INTO old_status FROM public.ballot_contests WHERE id = f.contest_id;
    IF old_status IS NULL THEN RAISE EXCEPTION 'Contest not found'; END IF;
    UPDATE public.ballot_contests SET verification_status = 'flagged',
      review_note = trim(coalesce(review_note,'') || ' Hidden: secondary duplicate of official contest ' || (p->>'official_contest_id') || '.')
      WHERE id = f.contest_id;
    INSERT INTO public.ballot_verification_log (contest_id, actor_id, old_status, new_status, note)
      VALUES (f.contest_id, _actor, old_status, 'flagged', 'Ballot crawler finding ' || f.id || ' approved.');
  ELSIF a = 'set_title' THEN
    UPDATE public.ballot_contests SET measure_title = p->>'title' WHERE id = f.contest_id AND coalesce(measure_title,'') = '';
  ELSIF a = 'set_yes_no' THEN
    IF _safe_only OR f.safe THEN
      UPDATE public.ballot_contests SET yes_means = p->>'yes', no_means = p->>'no'
        WHERE id = f.contest_id AND coalesce(yes_means,'') = '' AND coalesce(no_means,'') = '';
    ELSE
      UPDATE public.ballot_contests SET yes_means = p->>'yes', no_means = p->>'no' WHERE id = f.contest_id;
    END IF;
  ELSIF a = 'set_party' THEN
    UPDATE public.ballot_candidates SET party = p->>'party' WHERE id = (p->>'candidate_id')::uuid;
  ELSIF a = 'add_candidate' THEN
    INSERT INTO public.ballot_candidates (contest_id, name, party, sort_order, source_url)
      VALUES (f.contest_id, p->>'name', p->>'party', coalesce((p->>'sort_order')::int, 99), p->>'source_url');
  ELSIF a = 'insert_contest' THEN
    INSERT INTO public.ballot_contests (state, election_date, contest_type, office_name, measure_title, measure_summary,
      yes_means, no_means, source_name, source_url, verification_status, review_note, sort_order)
    VALUES ('MO', '2026-11-03', CASE WHEN p->>'contest_type' = 'candidate_race' THEN 'candidate_race' ELSE 'ballot_measure' END,
      CASE WHEN p->>'contest_type' = 'candidate_race' THEN p->>'title' END, p->>'title', p->>'ballot_question',
      p->>'yes', p->>'no', p->>'source_name', p->>'source_url', 'needs_review',
      'Added from official ballot by crawler. Needs district and review before voters see it.', 900)
    RETURNING id INTO new_id;
    FOR c IN SELECT * FROM jsonb_array_elements(coalesce(p->'candidates','[]'::jsonb)) LOOP
      i := i + 1;
      INSERT INTO public.ballot_candidates (contest_id, name, party, sort_order, source_url)
        VALUES (new_id, c->>'name', c->>'party', i, p->>'source_url');
    END LOOP;
  ELSIF a = 'acknowledge' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Unknown action';
  END IF;
  UPDATE public.ballot_crawl_findings SET status = 'approved', reviewed_by = _actor, reviewed_at = now(), apply_error = NULL WHERE id = _id;
  RETURN 'approved';
END $$;
REVOKE ALL ON FUNCTION public.apply_ballot_finding_internal(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.review_ballot_finding(_id uuid, _approve boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _approve THEN RETURN public.apply_ballot_finding_internal(_id, auth.uid(), false); END IF;
  UPDATE public.ballot_crawl_findings SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _id AND status = 'pending';
  RETURN 'rejected';
END $$;
REVOKE ALL ON FUNCTION public.review_ballot_finding(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_ballot_finding(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_official_source_fixes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  FOR r IN SELECT id FROM public.ballot_crawl_findings
    WHERE status = 'pending' AND safe AND proposed->>'action' IN ('hide_contest','set_title','set_yes_no')
    ORDER BY created_at LOOP
    IF public.apply_ballot_finding_internal(r.id, auth.uid(), true) = 'approved' THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.apply_official_source_fixes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_official_source_fixes() TO authenticated;

INSERT INTO public.ballot_crawl_sources (label, url, kind, authority) VALUES
 ('KCEB sample ballot, Nov 3, 2026', 'https://kceb.org/sample-ballot-for-november-3-2026-election/', 'sample_ballot', 'Kansas City Election Board'),
 ('KCEB notice on the Nov 3, 2026 election', 'https://kceb.org/important-notice-on-the-november-3-2026-election-absentee-voting/', 'notice', 'Kansas City Election Board'),
 ('Missouri SOS 2026 ballot measures', 'https://www.sos.mo.gov/elections/petitions/2026BallotMeasures', 'measures', 'Missouri Secretary of State'),
 ('Cass County sample ballot, Nov 2026', 'https://www.casscounty.com/DocumentCenter/View/4496/November-2026-Sample-Ballotpdf', 'sample_ballot', 'Cass County Clerk');