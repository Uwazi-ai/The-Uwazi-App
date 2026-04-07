
CREATE TABLE public.ask_uwazi_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  zip_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ask_uwazi_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.ask_uwazi_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.ask_uwazi_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.ask_uwazi_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.ask_uwazi_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_ask_uwazi_sessions_updated_at
  BEFORE UPDATE ON public.ask_uwazi_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
