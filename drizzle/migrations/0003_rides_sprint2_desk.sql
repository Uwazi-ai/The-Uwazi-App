CREATE POLICY "Coordinators log ride events" ON public.ride_events FOR INSERT TO authenticated
  WITH CHECK (public.is_ride_coordinator(auth.uid()) AND actor = auth.uid());
CREATE POLICY "Coordinators read site hours" ON public.ride_site_hours FOR SELECT TO authenticated
  USING (public.is_ride_coordinator(auth.uid()));
CREATE POLICY "Coordinators read site geo" ON public.ride_site_geo FOR SELECT TO authenticated
  USING (public.is_ride_coordinator(auth.uid()));
GRANT SELECT, UPDATE ON public.ride_requests TO authenticated;
GRANT SELECT, INSERT ON public.ride_events TO authenticated;
GRANT SELECT ON public.ride_site_hours, public.ride_site_geo, public.ride_settings, public.driver_blocks TO authenticated;
ALTER TABLE public.ride_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_events;