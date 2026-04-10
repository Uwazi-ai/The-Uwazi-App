import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LessonTrack {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  color: string | null;
  lesson_count: number;
  total_xp: number;
  order_index: number | null;
  difficulty: string | null;
}

export interface EnrichedLesson {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  xp_reward: number;
  estimated_minutes: number;
  is_published: boolean;
  track_id: string | null;
  track_name: string | null;
  track_emoji: string | null;
  lesson_number: string | null;
  content: any;
  quiz_questions: any[];
  key_takeaways: any[];
  action_items: any[];
  order_index: number | null;
}

export interface LessonProgress {
  lesson_id: string;
  status: string;
  score: number | null;
  current_slide: number;
  quiz_score: number | null;
  quiz_attempts: number;
  time_spent_seconds: number;
  last_slide_seen: number;
  completed_at: string | null;
}

export function useLessonTracks() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<LessonTrack[]>([]);
  const [lessons, setLessons] = useState<EnrichedLesson[]>([]);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [tracksRes, lessonsRes] = await Promise.all([
        supabase.from("lesson_tracks").select("*").order("order_index"),
        supabase.from("lessons").select("*").eq("is_published", true).order("lesson_number"),
      ]);

      if (tracksRes.data) setTracks(tracksRes.data as any);
      if (lessonsRes.data) setLessons(lessonsRes.data as any);

      if (user) {
        const { data: prog } = await supabase
          .from("user_lesson_progress")
          .select("*")
          .eq("user_id", user.id);
        if (prog) {
          const map: Record<string, LessonProgress> = {};
          prog.forEach((p: any) => { map[p.lesson_id] = p; });
          setProgress(map);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const getLessonsForTrack = (trackId: string) =>
    lessons.filter(l => l.track_id === trackId);

  const getTrackProgress = (trackId: string) => {
    const trackLessons = getLessonsForTrack(trackId);
    const completed = trackLessons.filter(l => progress[l.id]?.status === "completed").length;
    return { completed, total: trackLessons.length, pct: trackLessons.length ? Math.round((completed / trackLessons.length) * 100) : 0 };
  };

  const totalXp = Object.values(progress)
    .filter(p => p.status === "completed")
    .reduce((sum, p) => {
      const lesson = lessons.find(l => l.id === p.lesson_id);
      return sum + (lesson?.xp_reward || 0);
    }, 0);

  const completedCount = Object.values(progress).filter(p => p.status === "completed").length;

  return { tracks, lessons, progress, loading, getLessonsForTrack, getTrackProgress, totalXp, completedCount };
}
