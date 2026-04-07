import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CivicScore {
  total_xp: number;
  civic_literacy_score: number;
  lessons_completed: number;
  quizzes_passed: number;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  xp_reward: number;
  earned_at?: string;
}

export function useGamification() {
  const { user } = useAuth();
  const [civicScore, setCivicScore] = useState<CivicScore | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      const [scoreRes, streakRes, earnedRes, allRes] = await Promise.all([
        supabase
          .from("civic_scores")
          .select("total_xp, civic_literacy_score, lessons_completed, quizzes_passed")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("streaks")
          .select("current_streak, longest_streak, last_active_date")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_badges")
          .select("earned_at, badge_id, badges(id, slug, name, description, icon_url, xp_reward)")
          .eq("user_id", user.id),
        supabase
          .from("badges")
          .select("id, slug, name, description, icon_url, xp_reward"),
      ]);

      if (scoreRes.data) setCivicScore(scoreRes.data);
      if (streakRes.data) setStreak(streakRes.data);

      if (earnedRes.data) {
        const mapped = earnedRes.data
          .filter((r: any) => r.badges)
          .map((r: any) => ({
            ...r.badges,
            earned_at: r.earned_at,
          }));
        setEarnedBadges(mapped);
      }

      if (allRes.data) setAllBadges(allRes.data as Badge[]);
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  return { civicScore, streak, earnedBadges, allBadges, loading };
}

export function useLessons() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLessons = async () => {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("is_published", true)
        .order("order_index");

      if (data) setLessons(data);

      if (user) {
        const { data: prog } = await supabase
          .from("user_lesson_progress")
          .select("*")
          .eq("user_id", user.id);

        if (prog) {
          const map: Record<string, any> = {};
          prog.forEach((p: any) => {
            map[p.lesson_id] = p;
          });
          setProgress(map);
        }
      }
      setLoading(false);
    };

    fetchLessons();
  }, [user]);

  return { lessons, progress, loading };
}
