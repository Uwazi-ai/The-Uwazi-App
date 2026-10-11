ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ride_coordinator';

CREATE OR REPLACE FUNCTION public.is_ride_coordinator(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'ride_coordinator')
$$;

CREATE SEQUENCE public.ride_code_seq START 1001;

CREATE TABLE public.ride_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  funded_cap int NOT NULL DEFAULT 25,
  seats_per_slot int NOT NULL DEFAULT 4,
  driver_rate numeric NOT NULL DEFAULT 20,
  ride_line_phone text,
  early_start date NOT NULL DEFAULT '2026-10-20',
  early_end date NOT NULL DEFAULT '2026-11-02',
  election_day date NOT NULL DEFAULT '2026-11-03',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ride_settings (id) VALUES (true);

CREATE TABLE public.driver_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.driver_blocks (day_of_week, start_time, end_time)
SELECT d, t.s, t.e FROM generate_series(1,5) d,
  (VALUES ('11:00'::time,'15:00'::time),('14:00'::time,'18:00'::time)) t(s,e)
UNION ALL SELECT 6, '08:00', '12:00';

CREATE TABLE public.ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_code text NOT NULL UNIQUE DEFAULT ('UZ-' || nextval('public.ride_code_seq')),
  first_name_last_initial text NOT NULL,
  phone text NOT NULL,
  pickup_address text NOT NULL,
  zip text NOT NULL,
  destination_site_id uuid REFERENCES public.voter_guide_sites(id) ON DELETE SET NULL,
  needs_destination boolean NOT NULL DEFAULT false,
  ride_day date NOT NULL,
  pickup_time time NOT NULL,
  round_trip boolean NOT NULL DEFAULT true,
  needs text[] NOT NULL DEFAULT '{}',
  texts_ok boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web','phone')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','booked','riding','completed','cancelled','referred')),
  trip_stage int NOT NULL DEFAULT 0 CHECK (trip_stage BETWEEN 0 AND 7),
  autocab_booking_id text,
  ztrip_confirmation text,
  quiz_score numeric,
  quiz_finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  booked_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX ride_requests_slot_idx ON public.ride_requests (ride_day, pickup_time);

CREATE TABLE public.ride_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  note text,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ride_events_request_idx ON public.ride_events (request_id);

CREATE TABLE public.ride_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ride_rate_limits_phone_idx ON public.ride_rate_limits (phone_hash, created_at);
CREATE INDEX ride_rate_limits_ip_idx ON public.ride_rate_limits (ip_hash, created_at);

GRANT SELECT, UPDATE ON public.ride_requests TO authenticated;
GRANT SELECT ON public.ride_events TO authenticated;
GRANT SELECT, UPDATE ON public.ride_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_blocks TO authenticated;
GRANT ALL ON public.ride_requests, public.ride_events, public.ride_settings, public.driver_blocks, public.ride_rate_limits TO service_role;
GRANT USAGE ON SEQUENCE public.ride_code_seq TO service_role;

ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators read rides" ON public.ride_requests FOR SELECT TO authenticated USING (public.is_ride_coordinator(auth.uid()));
CREATE POLICY "Coordinators update rides" ON public.ride_requests FOR UPDATE TO authenticated USING (public.is_ride_coordinator(auth.uid())) WITH CHECK (public.is_ride_coordinator(auth.uid()));
CREATE POLICY "Coordinators read ride events" ON public.ride_events FOR SELECT TO authenticated USING (public.is_ride_coordinator(auth.uid()));
CREATE POLICY "Coordinators read ride settings" ON public.ride_settings FOR SELECT TO authenticated USING (public.is_ride_coordinator(auth.uid()));
CREATE POLICY "Admins update ride settings" ON public.ride_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Coordinators read driver blocks" ON public.driver_blocks FOR SELECT TO authenticated USING (public.is_ride_coordinator(auth.uid()));
CREATE POLICY "Admins manage driver blocks" ON public.driver_blocks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.prevent_ride_event_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'ride_events is append-only'; END $$;
CREATE TRIGGER ride_events_append_only BEFORE UPDATE OR DELETE ON public.ride_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_ride_event_change();

CREATE OR REPLACE FUNCTION public.log_ride_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.ride_events (request_id, event_type, from_status, to_status, actor)
    VALUES (NEW.id, 'status_change', OLD.status, NEW.status, auth.uid());
    IF NEW.status = 'booked' AND NEW.booked_at IS NULL THEN NEW.booked_at := now(); END IF;
    IF NEW.status = 'riding' AND NEW.picked_up_at IS NULL THEN NEW.picked_up_at := now(); END IF;
    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
  END IF;
  NEW.ride_code := OLD.ride_code;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END $$;
CREATE TRIGGER ride_requests_status_log BEFORE UPDATE ON public.ride_requests
FOR EACH ROW EXECUTE FUNCTION public.log_ride_status_change();