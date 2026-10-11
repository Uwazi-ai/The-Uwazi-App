ALTER TABLE public.ride_requests ADD COLUMN card_token text NOT NULL DEFAULT translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
CREATE UNIQUE INDEX ride_requests_card_token_key ON public.ride_requests(card_token);
ALTER TABLE public.ride_requests ADD CONSTRAINT ride_requests_card_token_len CHECK (length(card_token) >= 24);

CREATE TABLE public.rights_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL CHECK (state IN ('MO','KS')),
  sort int NOT NULL,
  question text NOT NULL,
  options text[] NOT NULL,
  correct_index int NOT NULL CHECK (correct_index >= 0),
  title text NOT NULL,
  explanation text NOT NULL,
  takeaway text NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state, sort)
);
GRANT SELECT ON public.rights_questions TO anon, authenticated;
GRANT ALL ON public.rights_questions TO service_role;
ALTER TABLE public.rights_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved rights questions are public" ON public.rights_questions FOR SELECT TO anon, authenticated USING (approved_at IS NOT NULL);
CREATE POLICY "Admins read all rights questions" ON public.rights_questions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));