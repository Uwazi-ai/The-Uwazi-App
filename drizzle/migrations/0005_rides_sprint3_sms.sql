CREATE TABLE public.ride_sms_optouts (
  phone_hash text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ride_sms_optouts TO service_role;
ALTER TABLE public.ride_sms_optouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;