CREATE POLICY "Super admins read backups" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  folder text,
  table_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
GRANT SELECT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read backup runs" ON public.backup_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.system_health TO authenticated;
GRANT ALL ON public.system_health TO service_role;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read health" ON public.system_health FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.health_alerts_sent (
  check_name text NOT NULL,
  alert_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (check_name, alert_date)
);
GRANT ALL ON public.health_alerts_sent TO service_role;
GRANT SELECT ON public.health_alerts_sent TO authenticated;
ALTER TABLE public.health_alerts_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read alerts" ON public.health_alerts_sent FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.system_job_token (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex')
);
GRANT ALL ON public.system_job_token TO service_role;
ALTER TABLE public.system_job_token ENABLE ROW LEVEL SECURITY;
INSERT INTO public.system_job_token DEFAULT VALUES;

CREATE OR REPLACE FUNCTION public.platform_health()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'last_backup', (SELECT finished_at FROM public.backup_runs WHERE status='ok' ORDER BY finished_at DESC LIMIT 1),
    'last_backup_folder', (SELECT folder FROM public.backup_runs WHERE status='ok' ORDER BY finished_at DESC LIMIT 1),
    'last_heartbeat', (SELECT checked_at FROM public.system_health ORDER BY checked_at DESC LIMIT 1),
    'last_heartbeat_status', (SELECT status FROM public.system_health ORDER BY checked_at DESC LIMIT 1),
    'last_office_check', (SELECT MAX(last_checked_at) FROM public.civic_data_sources WHERE active));
END $$;
REVOKE EXECUTE ON FUNCTION public.platform_health() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_health() TO authenticated;