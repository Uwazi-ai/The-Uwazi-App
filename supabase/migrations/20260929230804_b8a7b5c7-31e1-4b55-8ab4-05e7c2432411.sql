CREATE TABLE public.compass_office_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.compass_sessions(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES public.civic_offices(id) ON DELETE CASCADE,
  match_score numeric NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  reasoning text NOT NULL,
  policy_priorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX compass_office_matches_session_idx ON public.compass_office_matches(session_id);
GRANT SELECT ON public.compass_office_matches TO authenticated;
GRANT ALL ON public.compass_office_matches TO service_role;
ALTER TABLE public.compass_office_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner with active UWAZI+ can read matches"
ON public.compass_office_matches FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.compass_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  AND (public.has_active_subscription(auth.uid(), 'live') OR public.has_active_subscription(auth.uid(), 'sandbox'))
);