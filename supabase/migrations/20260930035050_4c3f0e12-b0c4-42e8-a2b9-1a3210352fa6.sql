CREATE TABLE public.voting_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  election_id uuid NOT NULL,
  steps jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, election_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voting_plan TO authenticated;
GRANT ALL ON public.voting_plan TO service_role;

ALTER TABLE public.voting_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own voting plan"
ON public.voting_plan FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_voting_plan_updated_at
BEFORE UPDATE ON public.voting_plan
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.save_voting_plan(_election_id uuid, _steps jsonb)
RETURNS TABLE (steps jsonb, points_awarded integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  saved jsonb;
  pts integer := 0;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in to save your plan.'; END IF;
  IF _election_id IS NULL THEN RAISE EXCEPTION 'We need to know the election.'; END IF;

  INSERT INTO public.voting_plan (user_id, election_id, steps)
  VALUES (caller, _election_id, coalesce(_steps, '{}'::jsonb))
  ON CONFLICT (user_id, election_id)
  DO UPDATE SET steps = coalesce(_steps, '{}'::jsonb), updated_at = now()
  RETURNING public.voting_plan.steps INTO saved;

  IF coalesce((saved->>'registered')::boolean, false)
     AND coalesce((saved->>'polling')::boolean, false)
     AND coalesce((saved->>'ballot')::boolean, false)
     AND coalesce((saved->>'when')::boolean, false) THEN
    pts := public.award_points(caller, 'voting_plan_complete', 30, _election_id::text);
  END IF;

  RETURN QUERY SELECT saved, pts;
END $$;

REVOKE ALL ON FUNCTION public.save_voting_plan(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.save_voting_plan(uuid, jsonb) TO authenticated;