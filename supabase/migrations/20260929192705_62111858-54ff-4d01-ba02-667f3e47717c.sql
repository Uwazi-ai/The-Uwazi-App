CREATE OR REPLACE FUNCTION public.city_top_identity()
RETURNS TABLE(label text, people integer, area text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_place text; v_zip text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT resolved->>'place' INTO v_place FROM user_districts WHERE user_id = auth.uid();
  IF v_place IS NULL THEN SELECT zip_code INTO v_zip FROM profiles WHERE user_id = auth.uid(); END IF;
  IF v_place IS NULL AND v_zip IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH pool AS (
    SELECT p.persona_labels->>'primary' AS lbl FROM user_civic_persona p
    WHERE COALESCE((p.consent_scope->>'research')::boolean,false)
      AND p.persona_labels->>'primary' IS NOT NULL
      AND ((v_place IS NOT NULL AND EXISTS (SELECT 1 FROM user_districts u WHERE u.user_id = p.user_id AND u.resolved->>'place' = v_place))
        OR (v_place IS NULL AND EXISTS (SELECT 1 FROM profiles pr WHERE pr.user_id = p.user_id AND pr.zip_code = v_zip)))
  ), tot AS (SELECT count(*)::int n FROM pool)
  SELECT pool.lbl, tot.n, CASE WHEN v_place IS NOT NULL THEN 'city' ELSE 'zip' END
  FROM pool, tot WHERE tot.n >= 25
  GROUP BY pool.lbl, tot.n ORDER BY count(*) DESC, pool.lbl LIMIT 1;
END $$;
REVOKE EXECUTE ON FUNCTION public.city_top_identity() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.city_top_identity() TO authenticated;

CREATE POLICY "Own identity photo read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'identity-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own identity photo insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'identity-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own identity photo update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'identity-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own identity photo delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'identity-photos' AND (storage.foldername(name))[1] = auth.uid()::text);