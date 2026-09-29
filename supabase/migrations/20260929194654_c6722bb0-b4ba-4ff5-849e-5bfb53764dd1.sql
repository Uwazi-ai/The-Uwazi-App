-- Badges gain art and rule
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS art_key text;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS rule jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.badges (slug, name, description, art_key, rule, emoji, rarity)
VALUES
 ('challenge-finisher', 'Challenge Finisher', 'You showed up for a city challenge.', 'flag', '{"min_count": 3}'::jsonb, '🚩', 'common'),
 ('zip-champion', 'ZIP Champion', 'Your ZIP won a city challenge.', 'trophy', '{"winner": true}'::jsonb, '🏆', 'rare')
ON CONFLICT (slug) DO UPDATE SET art_key = EXCLUDED.art_key, rule = EXCLUDED.rule;

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  counts_what text NOT NULL CHECK (counts_what IN ('lessons_completed','compass_taken','surveys_answered','actions_logged')),
  scope text NOT NULL DEFAULT 'zip' CHECK (scope IN ('zip','city')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  badge_id uuid REFERENCES public.badges(id),
  winner_badge_id uuid REFERENCES public.badges(id),
  winning_zip text,
  ended_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read challenges"
  ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage challenges"
  ON public.challenges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.challenge_progress (
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id)
);

GRANT SELECT ON public.challenge_progress TO authenticated;
GRANT ALL ON public.challenge_progress TO service_role;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own challenge count"
  ON public.challenge_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- People can read announcements sent to their own ZIP
CREATE POLICY "Users read alerts for their zip"
  ON public.civic_alerts FOR SELECT TO authenticated
  USING (
    sent_at IS NOT NULL AND target_zips IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.zip_code IS NOT NULL
        AND target_zips ? p.zip_code
    )
  );

-- Rebuild every count for a challenge straight from the points record.
CREATE OR REPLACE FUNCTION public.refresh_challenge_progress(_challenge uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.challenges;
  ev text;
  distinct_source boolean;
  rows_touched integer := 0;
  min_count integer;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id = _challenge;
  IF c.id IS NULL THEN RETURN 0; END IF;

  ev := CASE c.counts_what
    WHEN 'lessons_completed' THEN 'lesson_complete'
    WHEN 'compass_taken' THEN 'compass_complete'
    WHEN 'surveys_answered' THEN 'survey_answer'
    ELSE 'civic_action' END;
  distinct_source := c.counts_what <> 'actions_logged';

  INSERT INTO public.challenge_progress (challenge_id, user_id, count, updated_at)
  SELECT _challenge, l.user_id,
         CASE WHEN distinct_source THEN count(DISTINCT coalesce(l.source_id, l.id::text)) ELSE count(*) END,
         now()
  FROM public.user_points_ledger l
  WHERE l.event_type = ev
    AND l.created_at >= c.starts_at
    AND l.created_at <= least(now(), coalesce(c.ended_at, c.ends_at))
  GROUP BY l.user_id
  ON CONFLICT (challenge_id, user_id)
  DO UPDATE SET count = EXCLUDED.count, updated_at = now();

  GET DIAGNOSTICS rows_touched = ROW_COUNT;

  -- Award the challenge badge when someone crosses its rule.
  IF c.badge_id IS NOT NULL THEN
    SELECT coalesce((rule->>'min_count')::int, 1) INTO min_count FROM public.badges WHERE id = c.badge_id;
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT p.user_id, c.badge_id
    FROM public.challenge_progress p
    WHERE p.challenge_id = _challenge AND p.count >= coalesce(min_count, 1)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN rows_touched;
END;
$$;

-- ZIP board. Only ZIPs with 10 or more people taking part. Never returns a person.
CREATE OR REPLACE FUNCTION public.challenge_zip_board(_challenge uuid)
RETURNS TABLE(zip_code text, participants integer, total_count integer, eligible integer, participation_rate numeric, rank integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH parts AS (
    SELECT pr.zip_code AS zip, count(*)::int AS participants, sum(cp.count)::int AS total_count
    FROM public.challenge_progress cp
    JOIN public.profiles pr ON pr.user_id = cp.user_id
    WHERE cp.challenge_id = _challenge AND cp.count > 0 AND pr.zip_code IS NOT NULL
    GROUP BY pr.zip_code
  ), elig AS (
    SELECT zip_code AS zip, count(*)::int AS eligible
    FROM public.profiles WHERE zip_code IS NOT NULL GROUP BY zip_code
  ), joined AS (
    SELECT p.zip, p.participants, p.total_count, coalesce(e.eligible, p.participants) AS eligible,
           round(p.participants::numeric / greatest(coalesce(e.eligible, p.participants), 1), 4) AS participation_rate
    FROM parts p LEFT JOIN elig e ON e.zip = p.zip
    WHERE p.participants >= 10
  )
  SELECT zip, participants, total_count, eligible, participation_rate,
         rank() OVER (ORDER BY participation_rate DESC, total_count DESC)::int
  FROM joined
  ORDER BY participation_rate DESC, total_count DESC;
$$;

-- Admin view of every ZIP, still counts only, no person.
CREATE OR REPLACE FUNCTION public.challenge_zip_board_admin(_challenge uuid)
RETURNS TABLE(zip_code text, participants integer, total_count integer, eligible integer, participation_rate numeric, shown boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH parts AS (
    SELECT pr.zip_code AS zip, count(*)::int AS participants, sum(cp.count)::int AS total_count
    FROM public.challenge_progress cp
    JOIN public.profiles pr ON pr.user_id = cp.user_id
    WHERE cp.challenge_id = _challenge AND cp.count > 0 AND pr.zip_code IS NOT NULL
      AND public.has_role(auth.uid(), 'super_admin')
    GROUP BY pr.zip_code
  ), elig AS (
    SELECT zip_code AS zip, count(*)::int AS eligible
    FROM public.profiles WHERE zip_code IS NOT NULL GROUP BY zip_code
  )
  SELECT p.zip, p.participants, p.total_count, coalesce(e.eligible, p.participants),
         round(p.participants::numeric / greatest(coalesce(e.eligible, p.participants), 1), 4),
         p.participants >= 10
  FROM parts p LEFT JOIN elig e ON e.zip = p.zip
  ORDER BY (p.participants::numeric / greatest(coalesce(e.eligible, p.participants), 1)) DESC, p.total_count DESC;
$$;

-- What one person sees. Their own count and their own ZIP standing only.
CREATE OR REPLACE FUNCTION public.get_my_challenge()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  c public.challenges;
  my_zip text;
  my_count integer := 0;
  board record;
  board_size integer := 0;
  won boolean := false;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO c FROM public.challenges
  WHERE active AND now() BETWEEN starts_at AND ends_at
  ORDER BY ends_at ASC LIMIT 1;

  IF c.id IS NULL THEN
    SELECT * INTO c FROM public.challenges
    WHERE ended_at IS NOT NULL AND ended_at > now() - interval '14 days'
    ORDER BY ended_at DESC LIMIT 1;
  END IF;

  IF c.id IS NULL THEN RETURN NULL; END IF;

  SELECT zip_code INTO my_zip FROM public.profiles WHERE user_id = uid;
  SELECT count INTO my_count FROM public.challenge_progress WHERE challenge_id = c.id AND user_id = uid;
  my_count := coalesce(my_count, 0);

  SELECT * INTO board FROM public.challenge_zip_board(c.id) b WHERE b.zip_code = my_zip;
  SELECT count(*)::int INTO board_size FROM public.challenge_zip_board(c.id);
  won := c.winning_zip IS NOT NULL AND c.winning_zip = my_zip;

  RETURN jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'description', c.description,
    'counts_what', c.counts_what,
    'ends_at', c.ends_at,
    'ended_at', c.ended_at,
    'active', c.active,
    'my_zip', my_zip,
    'my_count', my_count,
    'board_size', board_size,
    'zip_shown', board.zip_code IS NOT NULL,
    'zip_rank', board.rank,
    'zip_participants', board.participants,
    'zip_total', board.total_count,
    'zip_rate', board.participation_rate,
    'winning_zip', c.winning_zip,
    'i_won', won
  );
END;
$$;

-- End a challenge and pick the winning ZIP. Super admin only.
CREATE OR REPLACE FUNCTION public.end_challenge(_challenge uuid, _zip text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.challenges;
  wbadge uuid;
  awarded integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only a super admin can end a challenge';
  END IF;

  PERFORM public.refresh_challenge_progress(_challenge);
  SELECT * INTO c FROM public.challenges WHERE id = _challenge;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Challenge not found'; END IF;

  wbadge := c.winner_badge_id;
  IF wbadge IS NULL THEN SELECT id INTO wbadge FROM public.badges WHERE slug = 'zip-champion'; END IF;

  UPDATE public.challenges
     SET active = false, ended_at = now(), winning_zip = _zip, winner_badge_id = wbadge
   WHERE id = _challenge;

  IF _zip IS NOT NULL AND wbadge IS NOT NULL THEN
    WITH winners AS (
      INSERT INTO public.user_badges (user_id, badge_id)
      SELECT cp.user_id, wbadge
      FROM public.challenge_progress cp
      JOIN public.profiles p ON p.user_id = cp.user_id
      WHERE cp.challenge_id = _challenge AND cp.count > 0 AND p.zip_code = _zip
      ON CONFLICT (user_id, badge_id) DO NOTHING
      RETURNING 1
    )
    SELECT count(*)::int INTO awarded FROM winners;

    INSERT INTO public.civic_alerts (title, message, alert_type, target_type, target_zips, sent_at, created_by, recipient_count)
    VALUES (
      _zip || ' won ' || c.title,
      'People in ' || _zip || ' showed up. Every person who took part earned the ZIP Champion badge. Open Progress to see yours.',
      'announcement', 'zip', to_jsonb(ARRAY[_zip]), now(), auth.uid(), awarded
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'winners', awarded);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_challenge_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.challenge_zip_board(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.challenge_zip_board_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_challenge() TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_challenge(uuid, text) TO authenticated;