CREATE OR REPLACE FUNCTION public.load_kceb_precincts(_fc jsonb, _source text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _now timestamptz := clock_timestamp();
  _features int; _bad jsonb; _dups jsonb; _wards jsonb; _loaded int;
BEGIN
  -- Trim spaces and non-breaking spaces (some names end in U+00A0).
  CREATE TEMP TABLE _f ON COMMIT DROP AS
  SELECT regexp_replace(f->'properties'->>'Name', '^[[:space:]' || chr(160) || ']+|[[:space:]' || chr(160) || ']+$', '', 'g') AS nm, f->'geometry' AS g
  FROM jsonb_array_elements(_fc->'features') f;
  SELECT count(*) INTO _features FROM _f;
  IF _features < 100 THEN RAISE EXCEPTION 'Too few features (%), refusing to replace the layer', _features; END IF;
  CREATE TEMP TABLE _p ON COMMIT DROP AS
  SELECT nm, (regexp_match(upper(nm), '^WD\s*(\d+)\s*PCT\s*(\d+)$')) m, g FROM _f;
  SELECT coalesce(jsonb_agg(nm), '[]') INTO _bad FROM _p WHERE m IS NULL OR g IS NULL OR g = 'null'::jsonb;
  SELECT coalesce(jsonb_agg(k), '[]') INTO _dups FROM (
    SELECT (m[1]::int)||'-'||(m[2]::int) k FROM _p WHERE m IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d;
  INSERT INTO public.kceb_precincts (precinct_key, ward, precinct, raw_name, geom, source_url, loaded_at)
  SELECT (m[1]::int)||'-'||(m[2]::int), m[1]::int, m[2]::int, min(nm),
         ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Union(ST_SetSRID(ST_GeomFromGeoJSON(g::text), 4326))), 3)),
         _source, _now
  FROM _p WHERE m IS NOT NULL AND g IS NOT NULL AND g <> 'null'::jsonb
  GROUP BY m[1]::int, m[2]::int
  ON CONFLICT (precinct_key) DO UPDATE SET ward = EXCLUDED.ward, precinct = EXCLUDED.precinct,
    raw_name = EXCLUDED.raw_name, geom = EXCLUDED.geom, source_url = EXCLUDED.source_url, loaded_at = EXCLUDED.loaded_at;
  GET DIAGNOSTICS _loaded = ROW_COUNT;
  DELETE FROM public.kceb_precincts WHERE loaded_at <> _now;
  SELECT coalesce(jsonb_agg(DISTINCT ward ORDER BY ward), '[]') INTO _wards FROM public.kceb_precincts;
  RETURN jsonb_build_object('features', _features, 'precincts', _loaded, 'unparsed', _bad, 'duplicates', _dups, 'wards', _wards);
END $$;
REVOKE ALL ON FUNCTION public.load_kceb_precincts(jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.load_kceb_precincts(jsonb, text) TO service_role;