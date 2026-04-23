import { motion, useReducedMotion } from "framer-motion";
import { useGamification } from "@/hooks/useGamification";
import { ChevronRight, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function AnimatedCounter({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const steps = 25;
    const inc = value / steps;
    if (value <= 0) { setDisplay(0); return; }
    const timer = setInterval(() => {
      start += inc;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 800 / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <p className="text-2xl font-bold tabular-nums" style={{ color }}>{display}</p>;
}

export default function ProgressPage() {
  const { civicScore, streak, earnedBadges, allBadges, loading } = useGamification();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [billsTracked, setBillsTracked] = useState(0);
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuth();

  const score = civicScore?.civic_literacy_score ?? 0;
  const xpEarned = civicScore?.total_xp ?? 0;
  const lessonsCompleted = civicScore?.lessons_completed ?? 0;
  const quizzesPassed = civicScore?.quizzes_passed ?? 0;
  const currentStreak = streak?.current_streak ?? 0;
  const nextBadgeThreshold = Math.max(200, Math.ceil((xpEarned + 1) / 200) * 200);

  // Bills tracked count (preserves existing query patterns)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_tracked_bills")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setBillsTracked(count ?? 0));
  }, [user]);

  useEffect(() => {
    if (loading) return;
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= score) { setAnimatedScore(score); clearInterval(interval); }
      else setAnimatedScore(current);
    }, 20);
    return () => clearInterval(interval);
  }, [score, loading]);

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  const earnedIds = new Set(earnedBadges.map((b) => b.id));
  const badges = allBadges.map((b) => {
    const earned = earnedIds.has(b.id);
    const eb = earned ? earnedBadges.find((x) => x.id === b.id) : null;
    return {
      ...b,
      unlocked: earned,
      icon: b.icon_url || "🏅",
      earned_at: eb?.earned_at,
    };
  });
  const unlockedBadgeCount = badges.filter((b) => b.unlocked).length;
  const totalBadgeCount = badges.length || 8;
  const badgesEarned = unlockedBadgeCount;

  const xpProgress = Math.min(100, ((xpEarned % 200) / 200) * 100);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-card bg-card animate-pulse" />)}
      </div>
    );
  }

  const motionInit = shouldReduceMotion ? {} : { opacity: 0, y: 16 };
  const motionAnim = shouldReduceMotion ? {} : { opacity: 1, y: 0 };

  return (
    <>
      <style>{`@keyframes gridScroll { from { background-position: 0 0; } to { background-position: 28px 28px; } }`}</style>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6">
        {/* SECTION 1 — Motivational Hero Banner */}
        <motion.div
          initial={motionInit}
          animate={motionAnim}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl p-6 md:p-8"
          style={{
            background: "linear-gradient(135deg, rgba(155,211,75,0.12), rgba(20,184,166,0.06) 60%, rgba(59,130,246,0.08))",
            border: "1px solid rgba(155,211,75,0.18)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              animation: shouldReduceMotion ? undefined : "gridScroll 12s linear infinite",
            }}
          />
          <div className="relative">
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#9bd34b] mb-2">YOUR CIVIC JOURNEY</p>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground leading-[1.05] mb-3">
              {score >= 80 ? "YOU'RE CRUSHING IT." :
               score >= 50 ? "KEEP THE MOMENTUM." :
               score >= 20 ? "YOU'RE GETTING STARTED." :
               "YOUR JOURNEY BEGINS."}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl">
              {score >= 80 ? "Top tier civic awareness. Democracy is lucky to have you." :
               score >= 50 ? "More than halfway to civic mastery. Keep going." :
               score >= 20 ? "Every action builds your civic power. You're on your way." :
               "Complete lessons, track bills, and vote to build your Civic Score."}
            </p>
          </div>
        </motion.div>

        {/* SECTION 2 — Civic Score Card */}
        <motion.div
          initial={motionInit}
          animate={motionAnim}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Background glow */}
          <div
            aria-hidden
            className="absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(155,211,75,0.25), transparent 70%)" }}
          />

          {/* Animated SVG ring */}
          <div className="relative w-40 h-40 md:w-48 md:h-48 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#9bd34b" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
              <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
              <circle
                cx="80" cy="80" r="70"
                stroke="url(#scoreGrad)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl md:text-5xl font-bold text-foreground tabular-nums">{animatedScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 w-full">
            <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground mb-1">CIVIC SCORE</p>
            <h2 className="font-heading text-2xl text-foreground mb-3">Your Civic Power</h2>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl font-bold text-[#9bd34b]">{xpEarned} XP</span>
              <span className="text-xs text-muted-foreground">Next badge at {nextBadgeThreshold} XP</span>
            </div>

            <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-4">
              <motion.div
                initial={shouldReduceMotion ? false : { width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #9bd34b, #14b8a6)" }}
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span>🔥</span>
              <span className="font-bold text-foreground">{currentStreak}-day streak</span>
              {currentStreak >= 3 && (
                <span className="text-[#f97316] text-xs">· Keep it going!</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* SECTION 3 — Animated Stat Cards */}
        <motion.div
          initial={motionInit}
          animate={motionAnim}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        >
          {[
            { label: "Lessons Done",   value: lessonsCompleted, icon: "📚", color: "#3b82f6", dest: "/app/learn" },
            { label: "Quizzes Passed", value: quizzesPassed,    icon: "✅", color: "#9bd34b", dest: "/app/learn" },
            { label: "Bills Tracked",  value: billsTracked,     icon: "📄", color: "#14b8a6", dest: "/app/legislation" },
            { label: "Badges Earned",  value: badgesEarned,     icon: "🏆", color: "#f97316", dest: "#badges" },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => s.dest.startsWith("#")
                ? document.querySelector(s.dest)?.scrollIntoView({ behavior: "smooth" })
                : navigate(s.dest)}
              className="text-left rounded-xl bg-white/[0.04] border border-white/10 p-4 cursor-pointer hover:border-white/20 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{s.icon}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <AnimatedCounter value={s.value} color={s.color} />
              <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
            </button>
          ))}
        </motion.div>

        {/* SECTION 4 — Badges Grid */}
        <motion.div
          id="badges"
          initial={motionInit}
          animate={motionAnim}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-2xl p-5 md:p-6 bg-white/[0.03] border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground">ACHIEVEMENTS</p>
              <h2 className="font-heading text-xl md:text-2xl text-foreground">BADGES</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-[#9bd34b] font-bold">{unlockedBadgeCount}</span> / {totalBadgeCount} unlocked
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.02 * i }}
                className={`relative rounded-xl p-3 text-center border transition-all ${
                  badge.unlocked
                    ? "bg-white/[0.05] border-[#9bd34b]/30 shadow-[0_0_20px_rgba(155,211,75,0.1)]"
                    : "bg-white/[0.02] border-white/10 opacity-50"
                }`}
              >
                {badge.unlocked && (
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ background: "radial-gradient(circle at top, rgba(155,211,75,0.12), transparent 70%)" }}
                  />
                )}
                <div className="relative text-2xl md:text-3xl mb-1">{badge.icon}</div>
                <div className="relative">
                  {badge.unlocked ? (
                    <div className="absolute -top-7 right-0 h-5 w-5 rounded-full bg-[#9bd34b] flex items-center justify-center text-black text-[10px] font-bold">
                      ✓
                    </div>
                  ) : (
                    <Lock className="absolute -top-6 right-0 h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <p className="relative text-[11px] md:text-xs font-bold text-foreground leading-tight">{badge.name}</p>
                {badge.unlocked && badge.description && (
                  <p className="relative text-[10px] text-muted-foreground mt-1 hidden sm:block leading-tight">
                    {badge.description}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* SECTION 5 — What's Next For You */}
        <motion.div
          initial={motionInit}
          animate={motionAnim}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl p-5 md:p-6 bg-white/[0.03] border border-white/10"
        >
          <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground mb-1">WHAT'S NEXT FOR YOU</p>
          <h2 className="font-heading text-xl text-foreground mb-4">Keep building your Civic Score.</h2>

          <div className="space-y-2.5">
            {lessonsCompleted < 10 && (
              <button
                onClick={() => navigate("/app/learn")}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: "rgba(59,130,246,0.07)", borderColor: "rgba(59,130,246,0.2)" }}
              >
                <span className="text-xl">📚</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-foreground">Complete a civic lesson</p>
                  <p className="text-[11px] text-muted-foreground">+25 XP · 5 min</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            {billsTracked < 3 && (
              <button
                onClick={() => navigate("/app/legislation")}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: "rgba(20,184,166,0.07)", borderColor: "rgba(20,184,166,0.2)" }}
              >
                <span className="text-xl">📄</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-foreground">Track a bill that affects you</p>
                  <p className="text-[11px] text-muted-foreground">+25 XP · 2 min</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            <button
              onClick={() => navigate("/app/vote")}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]"
              style={{ background: "rgba(249,115,22,0.07)", borderColor: "rgba(249,115,22,0.2)" }}
            >
              <span className="text-xl">🗳️</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-foreground">Set up your voting plan</p>
                <p className="text-[11px] text-muted-foreground">+50 XP · Build your ballot</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
