DROP POLICY "People read surveys sent to them" ON public.survey_definitions;
CREATE POLICY "People read surveys sent to them" ON public.survey_definitions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.survey_dispatch d WHERE d.survey_id = survey_definitions.id AND d.user_id = auth.uid()));
REVOKE EXECUTE ON FUNCTION public.preview_survey_targets(jsonb) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.send_research_survey(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_research_surveys() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.submit_research_survey(uuid, jsonb) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.research_survey_results(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.research_survey_stats() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.validate_survey_definition() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_survey_targets(jsonb), public.send_research_survey(uuid), public.get_my_research_surveys(),
  public.submit_research_survey(uuid, jsonb), public.research_survey_results(uuid), public.research_survey_stats() TO authenticated;