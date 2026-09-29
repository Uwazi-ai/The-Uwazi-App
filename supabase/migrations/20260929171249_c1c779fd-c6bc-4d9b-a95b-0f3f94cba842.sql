REVOKE EXECUTE ON FUNCTION public.review_office_change(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_office_issue(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_office_change(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_office_issue(uuid, text, text, text) TO authenticated;