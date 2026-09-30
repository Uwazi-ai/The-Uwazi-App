CREATE OR REPLACE FUNCTION public.export_my_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Must be signed in' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'exported_at', now(),
    'compass', jsonb_build_object(
      'sessions', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', s.id, 'started_at', s.started_at, 'completed_at', s.completed_at) ORDER BY s.started_at), '[]') FROM public.compass_sessions s WHERE s.user_id=caller),
      'answers', (SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', r.session_id, 'question', q.prompt_text, 'answer', r.answer_value) ORDER BY r.created_at), '[]')
         FROM public.compass_responses r JOIN public.compass_sessions s ON s.id=r.session_id LEFT JOIN public.compass_questions q ON q.id=r.question_id WHERE s.user_id=caller),
      'scores', (SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', r.session_id, 'dimension_scores', r.dimension_scores, 'top_dimensions', r.top_dimensions, 'computed_at', r.computed_at)), '[]')
         FROM public.compass_results r JOIN public.compass_sessions s ON s.id=r.session_id WHERE s.user_id=caller)),
    'budget_split', (SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', b.session_id, 'allocation', b.allocation, 'created_at', b.created_at)), '[]')
         FROM public.compass_budget_priorities b JOIN public.compass_sessions s ON s.id=b.session_id WHERE s.user_id=caller),
    'identity', (SELECT jsonb_build_object('label', p.persona_labels->>'primary', 'labels', p.persona_labels, 'blended_scores', p.dimension_scores, 'consent', p.consent_scope, 'updated_at', p.last_updated)
         FROM public.user_civic_persona p WHERE p.user_id=caller),
    'identity_feedback', (SELECT COALESCE(jsonb_agg(jsonb_build_object('original_label', f.original_label, 'chosen_dimension', f.chosen_dimension, 'created_at', f.created_at)), '[]') FROM public.identity_feedback f WHERE f.user_id=caller),
    'points', (SELECT COALESCE(jsonb_agg(jsonb_build_object('event', l.event_type, 'points', l.points, 'verified', l.verified, 'note', l.note, 'at', l.created_at) ORDER BY l.created_at), '[]') FROM public.user_points_ledger l WHERE l.user_id=caller),
    'badges', (SELECT COALESCE(jsonb_agg(jsonb_build_object('badge', b.name, 'earned_at', ub.earned_at)), '[]') FROM public.user_badges ub LEFT JOIN public.badges b ON b.id=ub.badge_id WHERE ub.user_id=caller),
    'confidence', (SELECT COALESCE(jsonb_agg(jsonb_build_object('score', c.confidence_score, 'samples', c.sample_count, 'at', c.last_updated)), '[]') FROM public.civic_confidence c WHERE c.user_id=caller),
    'lessons', (SELECT COALESCE(jsonb_agg(jsonb_build_object('lesson', le.title, 'status', p.status, 'quiz_score', p.quiz_score, 'completed_at', p.completed_at)), '[]') FROM public.user_lesson_progress p LEFT JOIN public.lessons le ON le.id=p.lesson_id WHERE p.user_id=caller),
    'surveys', (SELECT COALESCE(jsonb_agg(jsonb_build_object('survey', sv.title, 'answers', r.answers, 'completed_at', r.completed_at)), '[]') FROM public.survey_responses r LEFT JOIN public.surveys sv ON sv.id=r.survey_id WHERE r.user_id=caller),
    'districts', (SELECT jsonb_build_object('district_codes', d.resolved, 'precision', d.precision, 'resolved_at', d.resolved_at, 'note', 'We keep only district codes. We do not keep your street address here.') FROM public.user_districts d WHERE d.user_id=caller)
  );
END $function$;