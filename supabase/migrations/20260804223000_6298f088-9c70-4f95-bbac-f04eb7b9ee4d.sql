CREATE TABLE public.ask_uwazi_model_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  model_id text,
  model_source text NOT NULL DEFAULT 'auto',
  success boolean NOT NULL DEFAULT false,
  error_type text,
  error_message text,
  upstream_status integer,
  tools_used text[] NOT NULL DEFAULT '{}',
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ask_uwazi_model_log TO authenticated;
GRANT ALL ON public.ask_uwazi_model_log TO service_role;

ALTER TABLE public.ask_uwazi_model_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read model logs"
  ON public.ask_uwazi_model_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_ask_model_log_created ON public.ask_uwazi_model_log (created_at DESC);
CREATE INDEX idx_ask_model_log_model ON public.ask_uwazi_model_log (model_id);
CREATE INDEX idx_ask_model_log_success ON public.ask_uwazi_model_log (success);