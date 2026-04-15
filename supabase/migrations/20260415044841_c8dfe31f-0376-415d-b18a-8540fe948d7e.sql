
INSERT INTO storage.buckets (id, name, public) VALUES ('episode-videos', 'episode-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read episode videos" ON storage.objects FOR SELECT USING (bucket_id = 'episode-videos');
CREATE POLICY "Authenticated upload episode videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'episode-videos');
CREATE POLICY "Authenticated update episode videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'episode-videos');
CREATE POLICY "Authenticated delete episode videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'episode-videos');
