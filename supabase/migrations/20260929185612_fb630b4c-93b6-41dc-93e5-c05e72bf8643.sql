REVOKE EXECUTE ON FUNCTION public.match_district_codes(double precision, double precision) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.import_district_boundary(text, text, text, text, jsonb, text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.activate_district_batch(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.district_batches() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_my_offices(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.propose_office_district(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.match_district_codes(double precision, double precision) TO service_role;