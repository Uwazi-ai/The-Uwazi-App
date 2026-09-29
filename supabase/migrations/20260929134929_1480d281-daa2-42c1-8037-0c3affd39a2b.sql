CREATE TABLE public.compass_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.compass_dimensions TO anon, authenticated;
GRANT ALL ON public.compass_dimensions TO service_role;
ALTER TABLE public.compass_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dimensions are publicly readable" ON public.compass_dimensions FOR SELECT USING (true);
CREATE POLICY "Admins manage dimensions" ON public.compass_dimensions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.compass_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id uuid NOT NULL REFERENCES public.compass_dimensions(id) ON DELETE CASCADE,
  prompt_text text NOT NULL,
  weight numeric NOT NULL DEFAULT 1.0,
  reverse_scored boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.compass_questions TO anon, authenticated;
GRANT ALL ON public.compass_questions TO service_role;
ALTER TABLE public.compass_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active questions are publicly readable" ON public.compass_questions FOR SELECT USING (active = true);
CREATE POLICY "Admins manage questions" ON public.compass_questions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.compass_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  locale text DEFAULT 'en',
  district_geoid text
);
CREATE INDEX ON public.compass_sessions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compass_sessions TO authenticated;
GRANT ALL ON public.compass_sessions TO service_role;
ALTER TABLE public.compass_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their sessions" ON public.compass_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.owns_compass_session(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.compass_sessions WHERE id = _session_id AND user_id = auth.uid())
$$;

CREATE TABLE public.compass_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.compass_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.compass_questions(id) ON DELETE CASCADE,
  answer_value smallint NOT NULL CHECK (answer_value BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compass_responses TO authenticated;
GRANT ALL ON public.compass_responses TO service_role;
ALTER TABLE public.compass_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their responses" ON public.compass_responses FOR ALL TO authenticated USING (public.owns_compass_session(session_id)) WITH CHECK (public.owns_compass_session(session_id));

CREATE TABLE public.compass_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.compass_sessions(id) ON DELETE CASCADE,
  dimension_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  top_dimensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compass_results TO authenticated;
GRANT ALL ON public.compass_results TO service_role;
ALTER TABLE public.compass_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their results" ON public.compass_results FOR ALL TO authenticated USING (public.owns_compass_session(session_id)) WITH CHECK (public.owns_compass_session(session_id));