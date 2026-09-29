import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

export interface LessonBrief {
  id: string;
  title: string;
  minutes: number;
  dimension: string | null;
  dimension_slug: string | null;
  track_id: string | null;
}

export interface MyPath {
  personalization: boolean;
  stage: string;
  weakest: LessonBrief | null;
  top: LessonBrief | null;
  stage_lesson: LessonBrief | null;
}

export interface MyJourney {
  personalization: boolean;
  research: boolean;
  label: string | null;
  lead_name: string | null;
  dimension_scores: Record<string, number> | null;
  total_points: number;
  stage: string;
  next_stage: string | null;
  next_stage_points: number | null;
  next_step: { type: string; ref: string | null; title: string | null; set_at: string } | null;
  latest_compass_at: string | null;
  confidence: { score: number; at: string }[] | null;
  history: { event: string; points: number; at: string; title: string | null }[];
}

export function useMyPath() {
  const { user } = useAuth();
  const [path, setPath] = useState<MyPath | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await db.rpc("get_my_path");
    setPath(data ?? null);
    setLoading(false);
  }, [user]);
  useEffect(() => { reload(); }, [reload]);
  return { path, loading, reload };
}

export function useMyJourney() {
  const { user } = useAuth();
  const [journey, setJourney] = useState<MyJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await db.rpc("get_my_journey");
    setJourney(data ?? null);
    setLoading(false);
  }, [user]);
  useEffect(() => { reload(); }, [reload]);
  return { journey, loading, reload };
}

export function pathLessons(path: MyPath | null) {
  if (!path) return [];
  const out: { slot: "weakest" | "top" | "stage"; lesson: LessonBrief }[] = [];
  if (path.personalization && path.weakest) out.push({ slot: "weakest", lesson: path.weakest });
  if (path.personalization && path.top) out.push({ slot: "top", lesson: path.top });
  if (path.stage_lesson) out.push({ slot: "stage", lesson: path.stage_lesson });
  return out;
}

export const EVENT_LABELS: Record<string, string> = {
  compass_complete: "Took the Civic Compass quiz",
  report_unlock: "Opened your full Compass report",
  lesson_complete: "Finished a lesson",
  survey_answer: "Answered a survey",
  civic_action: "Took a civic action",
};
