import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const [profiles, civicScores, sessions, legislation, plans, badges] = await Promise.all([
        supabase.from("profiles").select("id, created_at, last_active, zip_code", { count: "exact" }),
        supabase.from("civic_scores").select("civic_literacy_score, total_xp, lessons_completed"),
        supabase.from("ask_uwazi_sessions").select("id", { count: "exact" }),
        supabase.from("saved_legislation").select("id", { count: "exact" }),
        supabase.from("voting_plans").select("id", { count: "exact" }),
        supabase.from("user_badges").select("id", { count: "exact" }),
      ]);

      const allProfiles = profiles.data || [];
      const totalUsers = profiles.count || 0;
      const newSignups7d = allProfiles.filter(p => p.created_at >= sevenDaysAgo).length;
      const activeToday = allProfiles.filter(p => p.last_active && p.last_active >= today).length;

      const scores = civicScores.data || [];
      const avgScore = scores.length
        ? Math.round(scores.reduce((s, c) => s + (c.civic_literacy_score || 0), 0) / scores.length)
        : 0;
      const totalXp = scores.reduce((s, c) => s + (c.total_xp || 0), 0);
      const lessonsCompleted = scores.reduce((s, c) => s + (c.lessons_completed || 0), 0);

      return {
        totalUsers,
        newSignups7d,
        activeToday,
        avgScore,
        totalXp,
        lessonsCompleted,
        totalSessions: sessions.count || 0,
        totalBills: legislation.count || 0,
        totalPlans: plans.count || 0,
        totalBadges: badges.count || 0,
      };
    },
    refetchInterval: 60000,
  });
}

export function useRecentSignups() {
  return useQuery({
    queryKey: ["admin-recent-signups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, zip_code, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 60000,
  });
}

export function useTopScores() {
  return useQuery({
    queryKey: ["admin-top-scores"],
    queryFn: async () => {
      const { data: scores } = await supabase
        .from("civic_scores")
        .select("user_id, civic_literacy_score, total_xp")
        .order("civic_literacy_score", { ascending: false })
        .limit(10);
      if (!scores?.length) return [];
      const userIds = scores.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));
      return scores.map((s, i) => ({
        rank: i + 1,
        name: nameMap.get(s.user_id) || "Unknown",
        score: s.civic_literacy_score || 0,
        xp: s.total_xp || 0,
      }));
    },
  });
}

export function useZipBreakdown() {
  return useQuery({
    queryKey: ["admin-zip-breakdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("zip_code");
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach(p => {
        if (p.zip_code) counts[p.zip_code] = (counts[p.zip_code] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([zip, count]) => ({ zip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });
}

export function useSignupChart() {
  return useQuery({
    queryKey: ["admin-signup-chart"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });
      if (!data) return { daily: [], cumulative: [] };

      const dailyCounts: Record<string, number> = {};
      data.forEach(p => {
        const d = p.created_at.slice(0, 10);
        dailyCounts[d] = (dailyCounts[d] || 0) + 1;
      });

      // Get total users before 30 days for cumulative
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .lt("created_at", thirtyDaysAgo);
      let cumulative = count || 0;

      const days: { date: string; signups: number; total: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        const signups = dailyCounts[key] || 0;
        cumulative += signups;
        days.push({ date: key, signups, total: cumulative });
      }
      return { daily: days.slice(-14), cumulative: days };
    },
  });
}

export function useAllUsers(search: string, filter: string, sort: string, page: number) {
  return useQuery({
    queryKey: ["admin-users", search, filter, sort, page],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*", { count: "exact" });

      if (search) {
        query = query.or(`display_name.ilike.%${search}%,zip_code.ilike.%${search}%`);
      }

      if (filter === "admin") {
        query = query.eq("is_admin", true);
      } else if (filter === "new") {
        query = query.gte("created_at", new Date(Date.now() - 86400000).toISOString());
      } else if (filter === "active") {
        query = query.gte("last_active", new Date(Date.now() - 7 * 86400000).toISOString());
      }

      if (sort === "score" || sort === "xp") {
        query = query.order("created_at", { ascending: false });
      } else if (sort === "name") {
        query = query.order("display_name", { ascending: true });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const from = page * 25;
      query = query.range(from, from + 24);

      const { data, count } = await query;
      return { users: data || [], total: count || 0 };
    },
  });
}
