
ALTER TABLE public.ballot_contests
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;

CREATE TABLE IF NOT EXISTS public.ballot_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.ballot_contests(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ballot_verification_log TO authenticated;
GRANT ALL ON public.ballot_verification_log TO service_role;

ALTER TABLE public.ballot_verification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view verification log"
ON public.ballot_verification_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ballot_verification_log_contest
  ON public.ballot_verification_log(contest_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_contest_verification(
  _contest_ids uuid[],
  _status text,
  _note text DEFAULT NULL
)
RETURNS TABLE(contest_id uuid, old_status text, new_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  r RECORD;
BEGIN
  IF caller IS NULL OR NOT public.is_admin(caller) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _status NOT IN ('verified', 'unverified', 'flagged') THEN
    RAISE EXCEPTION 'Invalid status: %', _status USING ERRCODE = '22023';
  END IF;

  IF _contest_ids IS NULL OR array_length(_contest_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT c.id, c.verification_status AS prev
      FROM public.ballot_contests c
     WHERE c.id = ANY(_contest_ids)
     FOR UPDATE
  LOOP
    UPDATE public.ballot_contests
       SET verification_status = _status,
           verified_by = CASE WHEN _status = 'verified' THEN caller ELSE NULL END,
           verified_at = CASE WHEN _status = 'verified' THEN now() ELSE NULL END,
           review_note = _note,
           updated_at = now()
     WHERE id = r.id;

    INSERT INTO public.ballot_verification_log (contest_id, actor_id, old_status, new_status, note)
    VALUES (r.id, caller, r.prev, _status, _note);

    contest_id := r.id;
    old_status := r.prev;
    new_status := _status;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.set_contest_verification(uuid[], text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_contest_verification(uuid[], text, text) TO authenticated;
