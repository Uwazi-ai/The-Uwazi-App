GRANT SELECT ON public.poll_ride_waitlist TO authenticated;
CREATE POLICY "Coordinators read standby" ON public.poll_ride_waitlist FOR SELECT TO authenticated
  USING (reason = 'standby' AND public.is_ride_coordinator(auth.uid()));

GRANT SELECT, INSERT ON public.ride_admin_log TO authenticated;
CREATE POLICY "Coordinators read standby actions" ON public.ride_admin_log FOR SELECT TO authenticated
  USING (action IN ('standby_called','standby_removed') AND public.is_ride_coordinator(auth.uid()));
CREATE POLICY "Coordinators log standby actions" ON public.ride_admin_log FOR INSERT TO authenticated
  WITH CHECK (action IN ('standby_called','standby_removed') AND actor = auth.uid() AND note IS NULL
    AND target_id IS NOT NULL AND public.is_ride_coordinator(auth.uid()));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='poll_ride_waitlist') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_ride_waitlist;
  END IF;
END $$;