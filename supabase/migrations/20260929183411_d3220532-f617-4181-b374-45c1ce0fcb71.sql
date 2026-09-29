REVOKE EXECUTE ON FUNCTION public.complete_compass_session(uuid,boolean,boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_report_unlock(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_civic_action(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_path() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_journey() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.journey_research_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lesson_brief(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_survey_points() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_compass_session(uuid,boolean,boolean), public.award_report_unlock(uuid), public.log_civic_action(uuid), public.get_my_path(), public.get_my_journey(), public.journey_research_stats(), public.lesson_brief(uuid) TO authenticated;