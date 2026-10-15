CREATE TABLE public.ride_service_days (
  service_date date PRIMARY KEY,
  block_start time NOT NULL,
  block_end time NOT NULL,
  wave_times time[] NOT NULL DEFAULT '{}',
  cost_cents integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ride_service_days TO authenticated;
GRANT ALL ON public.ride_service_days TO service_role;
ALTER TABLE public.ride_service_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage service days" ON public.ride_service_days FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Coordinators read service days" ON public.ride_service_days FOR SELECT TO authenticated
  USING (public.is_ride_coordinator(auth.uid()));

INSERT INTO public.ride_service_days (service_date, block_start, block_end, wave_times, cost_cents, note) VALUES
 ('2026-10-20','11:00','18:00','{11:00,12:30,14:00,15:30}',14000,null),
 ('2026-10-22','11:00','18:00','{11:00,12:30,14:00,15:30}',14000,null),
 ('2026-10-27','11:00','18:00','{11:00,12:30,14:00,15:30}',14000,null),
 ('2026-10-29','11:00','18:00','{11:00,12:30,14:00,15:30}',14000,null),
 ('2026-10-31','08:00','12:00','{08:00,09:30}',8000,null),
 ('2026-11-02','11:00','18:00','{11:00,12:30,14:00,15:30}',14000,'Blue Parkway only'),
 ('2026-11-03','11:00','18:00','{11:00,12:30,14:00,15:30}',14000,null);

ALTER TABLE public.ride_settings ADD COLUMN IF NOT EXISTS budget_cents integer NOT NULL DEFAULT 100000;
COMMENT ON COLUMN public.ride_settings.funded_cap IS 'DEPRECATED: replaced by budget_cents';
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'ztrip';
ALTER TABLE public.ride_requests ADD CONSTRAINT ride_requests_provider_check CHECK (provider IN ('ztrip','iris','uber_voucher','other'));
ALTER TABLE public.poll_ride_waitlist ADD COLUMN IF NOT EXISTS requested_date date;
ALTER TABLE public.poll_ride_waitlist ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.poll_ride_waitlist ADD CONSTRAINT poll_ride_waitlist_reason_check CHECK (reason IS NULL OR reason IN ('no_driver','full'));
COMMENT ON TABLE public.driver_blocks IS 'DEPRECATED for booking: replaced by ride_service_days';