CREATE TABLE public.compass_demo_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, label text NOT NULL,
 active boolean NOT NULL DEFAULT false, starts_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT compass_demo_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 100),
 CONSTRAINT compass_demo_label_length CHECK (length(label) BETWEEN 1 AND 200),
 CONSTRAINT compass_demo_event_window CHECK (expires_at > starts_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compass_demo_events TO authenticated;
GRANT ALL ON public.compass_demo_events TO service_role;
REVOKE ALL ON public.compass_demo_events FROM anon;
ALTER TABLE public.compass_demo_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage Compass demo events" ON public.compass_demo_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TABLE public.compass_demo_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.compass_demo_events(id),
 persona_key text NOT NULL REFERENCES public.compass_personas(slug), top_issue_keys text[] NOT NULL DEFAULT '{}',
 duration_seconds integer NOT NULL, completed_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT compass_demo_duration_range CHECK (duration_seconds BETWEEN 0 AND 86400)
);
GRANT SELECT ON public.compass_demo_results TO authenticated;
GRANT ALL ON public.compass_demo_results TO service_role;
REVOKE ALL ON public.compass_demo_results FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.compass_demo_results FROM authenticated;
ALTER TABLE public.compass_demo_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read anonymous Compass demo totals" ON public.compass_demo_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE INDEX compass_demo_results_event_idx ON public.compass_demo_results(event_id);
CREATE FUNCTION public.get_active_demo_event(p_slug text) RETURNS TABLE(slug text,label text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
 AS $$ SELECT e.slug,e.label FROM public.compass_demo_events e WHERE e.slug = p_slug AND e.active AND now() >= e.starts_at AND now() < e.expires_at $$;
REVOKE ALL ON FUNCTION public.get_active_demo_event(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_demo_event(text) TO anon, authenticated, service_role;
CREATE FUNCTION public.evaluate_compass_demo(p_event_slug text,p_scores jsonb) RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
 AS $$
 DECLARE r record;
 BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.get_active_demo_event(p_event_slug)) THEN RAISE EXCEPTION 'This demo is not running right now.'; END IF;
 IF p_scores IS NULL OR jsonb_typeof(p_scores) <> 'object' OR p_scores = '{}'::jsonb THEN RAISE EXCEPTION 'Invalid scores'; END IF;
 FOR r IN SELECT key,value FROM jsonb_each(p_scores) LOOP
 IF NOT EXISTS (SELECT 1 FROM public.compass_dimensions d WHERE d.slug=r.key) OR jsonb_typeof(r.value) <> 'number' THEN RAISE EXCEPTION 'Invalid scores'; END IF;
 IF (r.value::text)::numeric < 0 OR (r.value::text)::numeric > 1 THEN RAISE EXCEPTION 'Invalid scores'; END IF;
 END LOOP;
 RETURN public.persona_label(p_scores);
 END $$;
REVOKE ALL ON FUNCTION public.evaluate_compass_demo(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_compass_demo(text,jsonb) TO anon, authenticated, service_role;
CREATE FUNCTION public.log_demo_completion(p_event_slug text,p_persona_key text,p_top_issues text[],p_duration integer,p_completion_id uuid DEFAULT gen_random_uuid()) RETURNS uuid
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
 AS $$
 DECLARE eid uuid; prior public.compass_demo_results;
 BEGIN
 SELECT e.id INTO eid FROM public.compass_demo_events e WHERE e.slug=p_event_slug AND e.active AND now() >= e.starts_at AND now() < e.expires_at FOR SHARE;
 IF eid IS NULL THEN RAISE EXCEPTION 'This demo is not running right now.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.compass_personas WHERE slug=p_persona_key) THEN RAISE EXCEPTION 'Invalid persona'; END IF;
 IF p_top_issues IS NULL OR cardinality(p_top_issues)>3 OR EXISTS(SELECT 1 FROM unnest(p_top_issues) k WHERE k IS NULL OR NOT EXISTS(SELECT 1 FROM public.compass_dimensions d WHERE d.slug=k)) THEN RAISE EXCEPTION 'Invalid issues'; END IF;
 IF p_duration IS NULL OR p_duration < 0 OR p_duration > 86400 OR p_completion_id IS NULL THEN RAISE EXCEPTION 'Invalid duration or completion'; END IF;
 INSERT INTO public.compass_demo_results(id,event_id,persona_key,top_issue_keys,duration_seconds) VALUES(p_completion_id,eid,p_persona_key,p_top_issues,p_duration) ON CONFLICT(id) DO NOTHING;
 SELECT * INTO prior FROM public.compass_demo_results WHERE id=p_completion_id;
 IF prior.event_id <> eid OR prior.persona_key <> p_persona_key OR prior.top_issue_keys <> p_top_issues OR prior.duration_seconds <> p_duration THEN RAISE EXCEPTION 'Completion conflict'; END IF;
 RETURN p_completion_id;
 END $$;
REVOKE ALL ON FUNCTION public.log_demo_completion(text,text,text[],integer,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_demo_completion(text,text,text[],integer,uuid) TO anon, authenticated, service_role;
COMMENT ON TABLE public.compass_demo_results IS 'Anonymous expo totals only. id is a one-run result identifier for retry deduplication, never a user or device identifier.';