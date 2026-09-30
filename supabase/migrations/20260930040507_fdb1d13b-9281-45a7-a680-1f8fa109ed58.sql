CREATE TABLE public.address_geocode_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  geocoder text NOT NULL,
  quality text,
  matched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.address_geocode_log TO authenticated;
GRANT ALL ON public.address_geocode_log TO service_role;
ALTER TABLE public.address_geocode_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read geocode log" ON public.address_geocode_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE INDEX address_geocode_log_created_idx ON public.address_geocode_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.platform_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'last_backup', (SELECT finished_at FROM public.backup_runs WHERE status='ok' ORDER BY finished_at DESC LIMIT 1),
    'last_backup_folder', (SELECT folder FROM public.backup_runs WHERE status='ok' ORDER BY finished_at DESC LIMIT 1),
    'last_heartbeat', (SELECT checked_at FROM public.system_health ORDER BY checked_at DESC LIMIT 1),
    'last_heartbeat_status', (SELECT status FROM public.system_health ORDER BY checked_at DESC LIMIT 1),
    'last_office_check', (SELECT MAX(last_checked_at) FROM public.civic_data_sources WHERE active),
    'geocode_census', (SELECT count(*) FROM public.address_geocode_log WHERE matched AND geocoder='census' AND created_at > now() - interval '30 days'),
    'geocode_fallback', (SELECT count(*) FROM public.address_geocode_log WHERE matched AND geocoder <> 'census' AND created_at > now() - interval '30 days'),
    'geocode_none', (SELECT count(*) FROM public.address_geocode_log WHERE NOT matched AND created_at > now() - interval '30 days'));
END $function$;