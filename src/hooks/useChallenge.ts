import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

export interface MyChallenge {
  id: string;
  title: string;
  description: string | null;
  counts_what: "lessons_completed" | "compass_taken" | "surveys_answered" | "actions_logged";
  ends_at: string;
  ended_at: string | null;
  active: boolean;
  my_zip: string | null;
  my_count: number;
  board_size: number;
  zip_shown: boolean;
  zip_rank: number | null;
  zip_participants: number | null;
  zip_total: number | null;
  zip_rate: number | null;
  winning_zip: string | null;
  i_won: boolean;
}

export interface EarnedBadge {
  id: string;
  name: string;
  description: string | null;
  art_key: string | null;
  emoji: string | null;
  earned_at: string | null;
}

export const COUNT_LABELS: Record<string, string> = {
  lessons_completed: "lessons finished",
  compass_taken: "Compass quizzes taken",
  surveys_answered: "surveys answered",
  actions_logged: "civic actions logged",
};

export const COUNT_STEP: Record<string, { text: string; to: string }> = {
  lessons_completed: { text: "Finish a lesson", to: "/app/learn" },
  compass_taken: { text: "Take the Civic Compass quiz", to: "/app/compass" },
  surveys_answered: { text: "Answer a short survey", to: "/app/home" },
  actions_logged: { text: "Log a civic action", to: "/app/progress" },
};

export function useMyChallenge() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<MyChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data: live } = await db
      .from("challenges")
      .select("id")
      .eq("active", true)
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString())
      .limit(1);
    if (live?.length) await db.rpc("refresh_challenge_progress", { _challenge: live[0].id });
    const { data } = await db.rpc("get_my_challenge");
    setChallenge((data as MyChallenge) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);
  return { challenge, loading, reload };
}

export function useMyBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await db
        .from("user_badges")
        .select("earned_at, badges(id, name, description, art_key, emoji)")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
      setBadges(
        (data ?? [])
          .filter((r: any) => r.badges)
          .map((r: any) => ({ ...r.badges, earned_at: r.earned_at })),
      );
    })();
  }, [user]);
  return badges;
}
