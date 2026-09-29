
- Office data changes flow only through civic_office_pending_changes + review_office_change RPC; office-monitor never writes civic_offices. Why: every officeholder change needs explicit admin approval.
- Civic Journey points are written only by SECURITY DEFINER functions (award_points via complete_compass_session, award_lesson_completion, award_report_unlock, log_civic_action, survey trigger); user_points_ledger is append-only by trigger. Why: points must never be trusted from the client.
- Journey reads go through get_my_journey and get_my_path RPCs, which hide identity and scores unless consent_scope.personalization is true. Why: consent is enforced server-side in one place.
- Ask UWAZI journey context is built per turn in supabase/functions/ask-uwazi/journey.ts and sent with the user message, not in the system prompt. Why: keeps the cached system prompt static.
- Candidate lists refresh through office-monitor sources with kind=candidates; changes land in civic_office_pending_changes and only review_office_change writes race_candidates or ballot_candidates. Why: candidate changes need the same explicit approval as offices.
