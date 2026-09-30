-- 1. School district offices in get_my_offices
CREATE OR REPLACE FUNCTION public.get_my_offices(_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(id uuid, office_title text, current_holder text, term_end text, jurisdiction_level text, district_type text, district_code text, source_url text, last_verified_at timestamp with time zone, match_level text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r jsonb; v_place text; v_county text; v_school text;
BEGIN
  IF auth.uid() IS NULL OR (_user_id <> auth.uid() AND NOT public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT ud.resolved INTO r FROM public.user_districts ud WHERE ud.user_id = _user_id;
  IF r IS NULL THEN RETURN; END IF;
  v_place := r->>'place'; v_county := r->>'county'; v_school := r->>'school_district';
  RETURN QUERY
  SELECT o.id, o.office_title, o.current_holder, o.term_end, o.jurisdiction_level,
         o.district_type, o.district_code, o.source_url, o.last_verified_at,
         CASE WHEN o.jurisdiction_level = 'county' THEN 'county'
              WHEN o.jurisdiction_level = 'school' THEN 'school'
              WHEN o.district_code IS NULL THEN 'city' ELSE 'district' END AS match_level
  FROM public.civic_offices o
  WHERE (o.geoid IS NULL OR o.geoid = v_place OR o.geoid = v_county OR (v_school IS NOT NULL AND o.geoid = v_school))
    AND (o.jurisdiction_level IS DISTINCT FROM 'school' OR o.geoid = v_school)
    AND (o.district_code IS NULL
      OR (o.district_type IS NOT NULL AND r ? o.district_type AND r->>o.district_type = o.district_code))
  ORDER BY (o.district_code IS NOT NULL), o.office_title;
END $function$;

-- 2. Persona suggested prompts
ALTER TABLE public.compass_personas ADD COLUMN IF NOT EXISTS suggested_prompts jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4. Badge color override for non persona badges that reuse a persona icon
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS art_tone text;

-- 3. Notifications
CREATE TABLE public.notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_milestones boolean NOT NULL DEFAULT false,
  challenges boolean NOT NULL DEFAULT false,
  elections boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notification prefs" ON public.notification_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER notification_prefs_updated BEFORE UPDATE ON public.notification_prefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  dedupe_key text NOT NULL,
  notify_day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE (user_id, dedupe_key),
  UNIQUE (user_id, notify_day)
);
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own notifications" ON public.user_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Mark own notifications read" ON public.user_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Candidate notifications for one person on one day, most time sensitive first.
CREATE OR REPLACE FUNCTION public.notification_candidates(_uid uuid, _day date)
RETURNS TABLE(rank int, kind text, title text, body text, link text, dedupe_key text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE np record; st text; zip text; r jsonb;
BEGIN
  SELECT * INTO np FROM public.notification_prefs WHERE user_id=_uid;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT upper(p.state_code), p.zip_code INTO st, zip FROM public.profiles p WHERE p.user_id=_uid;
  SELECT resolved INTO r FROM public.user_districts WHERE user_id=_uid;

  IF np.elections AND st IS NOT NULL THEN
    RETURN QUERY
    SELECT x.rk, 'election'::text, x.t, x.b, '/app/vote'::text, x.k FROM (
      SELECT 1 rk, 'Today is Election Day'::text t, 'Polls are open. Check your ballot and where you vote.'::text b, 'election-day-'||e.id k, e.election_date d FROM public.elections e
        WHERE e.election_date=_day AND (CASE e.jurisdiction WHEN 'Missouri' THEN 'MO' WHEN 'Kansas' THEN 'KS' ELSE upper(e.jurisdiction) END)=st
      UNION ALL
      SELECT 2, 'Early voting starts today', 'You can vote early starting today. See where and when.', 'early-vote-'||e.id, e.early_voting_start FROM public.elections e
        WHERE e.early_voting_start=_day AND (CASE e.jurisdiction WHEN 'Missouri' THEN 'MO' WHEN 'Kansas' THEN 'KS' ELSE upper(e.jurisdiction) END)=st
      UNION ALL
      SELECT 3, 'Last day to register to vote', 'Today is the deadline to register for the '||to_char(e.election_date,'FMMonth FMDD')||' election.', 'register-'||e.id, e.registration_deadline FROM public.elections e
        WHERE e.registration_deadline=_day AND (CASE e.jurisdiction WHEN 'Missouri' THEN 'MO' WHEN 'Kansas' THEN 'KS' ELSE upper(e.jurisdiction) END)=st
    ) x;
  END IF;

  IF np.budget_milestones AND r IS NOT NULL THEN
    RETURN QUERY
    SELECT CASE WHEN c.milestone_date=_day+1 THEN 4 ELSE 7 END, 'budget'::text,
      CASE WHEN c.milestone_date=_day+1 THEN 'Budget date tomorrow' ELSE 'Budget date in one week' END,
      COALESCE(c.label, c.milestone)||' is on '||to_char(c.milestone_date,'FMMonth FMDD')||'. You can show up and speak.',
      '/app/my-city'::text,
      'budget-'||c.id||'-'||CASE WHEN c.milestone_date=_day+1 THEN '1' ELSE '7' END
    FROM public.civic_budget_calendar c
    WHERE c.geoid IN (r->>'place', r->>'county') AND c.milestone_date IN (_day+1, _day+7);
  END IF;

  IF np.challenges AND zip IS NOT NULL THEN
    RETURN QUERY
    SELECT 5, 'challenge'::text, 'A new challenge starts today', ch.title||'. '||COALESCE(ch.description,''), '/app/progress'::text, 'challenge-start-'||ch.id
    FROM public.challenges ch WHERE ch.active AND (ch.starts_at AT TIME ZONE 'America/Chicago')::date=_day
    UNION ALL
    SELECT 6, 'challenge'::text, 'A challenge ended', ch.title||' is over. See how your ZIP did.', '/app/progress'::text, 'challenge-end-'||ch.id
    FROM public.challenges ch WHERE (COALESCE(ch.ended_at, ch.ends_at) AT TIME ZONE 'America/Chicago')::date=_day;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.notification_candidates(uuid,date) FROM public, anon, authenticated;

-- Daily: at most one notification per person per day. The most time sensitive wins.
CREATE OR REPLACE FUNCTION public.queue_daily_notifications(_day date DEFAULT (now() AT TIME ZONE 'America/Chicago')::date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE u uuid; c record; n int := 0;
BEGIN
  FOR u IN SELECT user_id FROM public.notification_prefs WHERE budget_milestones OR challenges OR elections LOOP
    IF EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id=u AND notify_day=_day) THEN CONTINUE; END IF;
    SELECT * INTO c FROM public.notification_candidates(u, _day) x
      WHERE NOT EXISTS (SELECT 1 FROM public.user_notifications un WHERE un.user_id=u AND un.dedupe_key=x.dedupe_key)
      ORDER BY x.rank LIMIT 1;
    IF FOUND THEN
      INSERT INTO public.user_notifications (user_id, kind, title, body, link, dedupe_key, notify_day)
      VALUES (u, c.kind, c.title, c.body, c.link, c.dedupe_key, _day) ON CONFLICT DO NOTHING;
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.queue_daily_notifications(date) FROM public, anon, authenticated;