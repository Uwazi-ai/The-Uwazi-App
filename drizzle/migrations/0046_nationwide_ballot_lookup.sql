CREATE TABLE public.state_election_links (
  state_code text PRIMARY KEY CHECK (state_code ~ '^[A-Z]{2}$'),
  state_name text NOT NULL,
  website_url text,
  check_url text,
  sample_ballot_url text,
  phone text,
  phone_source_url text,
  url_check jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  verified_at timestamptz,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.state_election_links TO anon, authenticated;
GRANT UPDATE ON public.state_election_links TO authenticated;
GRANT ALL ON public.state_election_links TO service_role;
ALTER TABLE public.state_election_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read state election links" ON public.state_election_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins edit state election links" ON public.state_election_links FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.ballot_help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL CHECK (state_code ~ '^[A-Z]{2}$'),
  city_or_zip text NOT NULL CHECK (char_length(city_or_zip) BETWEEN 2 AND 80),
  street_address text CHECK (street_address IS NULL OR char_length(street_address) <= 200),
  reply_email text NOT NULL CHECK (char_length(reply_email) <= 254),
  consent_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','answered')),
  answered_note text CHECK (answered_note IS NULL OR char_length(answered_note) <= 500),
  answered_by uuid,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ballot_help_requests TO service_role;
ALTER TABLE public.ballot_help_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX ballot_help_requests_state_time ON public.ballot_help_requests (state_code, created_at DESC);

CREATE TABLE public.public_rate_hits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket text NOT NULL,
  key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.public_rate_hits TO service_role;
ALTER TABLE public.public_rate_hits ENABLE ROW LEVEL SECURITY;
CREATE INDEX public_rate_hits_lookup ON public.public_rate_hits (bucket, key_hash, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_list_ballot_help()
RETURNS TABLE (id uuid, state_code text, city_or_zip text, has_address boolean, status text, answered_note text, answered_at timestamptz, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  RETURN QUERY SELECT r.id, r.state_code, r.city_or_zip, r.street_address IS NOT NULL, r.status, r.answered_note, r.answered_at, r.created_at
    FROM public.ballot_help_requests r ORDER BY r.state_code, r.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reveal_ballot_help(_id uuid)
RETURNS TABLE (street_address text, reply_email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  RETURN QUERY SELECT r.street_address, r.reply_email FROM public.ballot_help_requests r WHERE r.id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_answer_ballot_help(_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  UPDATE public.ballot_help_requests SET status = 'answered', answered_note = left(coalesce(_note, ''), 500), answered_by = auth.uid(), answered_at = now() WHERE id = _id;
END $$;

REVOKE ALL ON FUNCTION public.admin_list_ballot_help() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reveal_ballot_help(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_answer_ballot_help(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_ballot_help() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reveal_ballot_help(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_answer_ballot_help(uuid, text) TO authenticated;