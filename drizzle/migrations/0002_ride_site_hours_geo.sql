CREATE TABLE public.ride_site_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.voter_guide_sites(id) ON DELETE CASCADE,
  open_date date NOT NULL,
  open_time time NOT NULL,
  close_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, open_date),
  CHECK (close_time > open_time)
);
GRANT ALL ON public.ride_site_hours TO service_role;
ALTER TABLE public.ride_site_hours ENABLE ROW LEVEL SECURITY;
CREATE INDEX ride_site_hours_date_idx ON public.ride_site_hours(open_date);

CREATE TABLE public.ride_site_geo (
  site_id uuid PRIMARY KEY REFERENCES public.voter_guide_sites(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  geocoder text NOT NULL DEFAULT 'census',
  match_quality text NOT NULL DEFAULT 'exact',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ride_site_geo TO service_role;
ALTER TABLE public.ride_site_geo ENABLE ROW LEVEL SECURITY;