import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Zap, FileText, GraduationCap, MapPin, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import EpisodeHero from "@/components/home/EpisodeHero";
import FeatureTour from "@/components/home/FeatureTour";

interface HomeData {
  displayName: string | null;
  zipCode: string | null;
  civicXp: number;
  currentStreak: number;
  billsTracked: number;
  civicScore: number;
  lessonCount: number;
  episodeCount: number;
}

export default function HomePage() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [statsRes, profileRes, scoreRes, lessonsRes, episodesRes] = await Promise.all([
        supabase
          .from("user_civic_stats")
          .select("civic_xp, current_streak, bills_tracked_count")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("zip_code, display_name")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("civic_scores")
          .select("civic_literacy_score")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("lessons")
          .select("id", { count: "exact", head: true })
          .eq("is_published", true),
        supabase
          .from("episodes")
          .select("id", { count: "exact", head: true })
          .eq("is_published", true),
      ]);

      if (cancelled) return;
      setData({
        displayName: profileRes.data?.display_name ?? null,
        zipCode: profileRes.data?.zip_code ?? null,
        civicXp: statsRes.data?.civic_xp ?? 0,
        currentStreak: statsRes.data?.current_streak ?? 0,
        billsTracked: statsRes.data?.bills_tracked_count ?? 0,
        civicScore: scoreRes.data?.civic_literacy_score ?? 0,
        lessonCount: lessonsRes.count ?? 0,
        episodeCount: episodesRes.count ?? 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayName =
    data?.displayName ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Citizen";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "Civic Score", value: data?.civicScore ?? 0, icon: TrendingUp, to: "/app/progress" },
    { label: "XP", value: data?.civicXp ?? 0, icon: Zap, to: "/app/progress" },
    { label: "Day Streak", value: data?.currentStreak ?? 0, icon: Flame, to: "/app/progress" },
    { label: "Bills Tracked", value: data?.billsTracked ?? 0, icon: FileText, to: "/app/legislation" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 pb-24 md:pb-10 space-y-8 md:space-y-10">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
          {greeting}
        </p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.02] tracking-tight">
          Welcome back,{" "}
          <span className="text-primary">{displayName}</span>.
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
          <p className="text-base md:text-lg text-muted-foreground max-w-xl">
            Your civic feed, curated. Watch, learn, and act — all in one place.
          </p>
          {data?.zipCode && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <MapPin size={12} className="text-primary" />
              ZIP {data.zipCode}
            </span>
          )}
        </div>
      </motion.div>

      {/* Live stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
      >
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              to={s.to}
              className="group rounded-2xl p-4 md:p-5 bg-card border border-border hover-lift transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={18} className="text-primary" />
              </div>
              <p className="font-heading text-2xl md:text-3xl text-foreground leading-none">
                {s.value}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1.5">
                {s.label}
              </p>
            </Link>
          );
        })}
      </motion.div>

      {/* Featured episode hero */}
      <EpisodeHero />

      {/* Quick links to Watch + Learn with live counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <Link
          to="/app/watch"
          className="rounded-2xl p-5 md:p-6 bg-card border border-border hover-lift flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-1">
              Watch Feed
            </p>
            <p className="font-heading text-xl md:text-2xl text-foreground">
              {data?.episodeCount ?? 0} episodes ready
            </p>
          </div>
          <FileText size={28} className="text-primary opacity-60" />
        </Link>
        <Link
          to="/app/learn"
          className="rounded-2xl p-5 md:p-6 bg-card border border-border hover-lift flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-1">
              Learn
            </p>
            <p className="font-heading text-xl md:text-2xl text-foreground">
              {data?.lessonCount ?? 0} lessons available
            </p>
          </div>
          <GraduationCap size={28} className="text-primary opacity-60" />
        </Link>
      </div>

      {/* Feature tour bento grid */}
      <FeatureTour />
    </div>
  );
}
