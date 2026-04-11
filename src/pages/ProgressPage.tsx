import { motion } from "framer-motion";
import { useGamification } from "@/hooks/useGamification";
import { Trophy, Flame, BookOpen, Award, Lock, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function ProgressPage() {
  const { civicScore, streak, earnedBadges, allBadges, loading } = useGamification();
  const [animatedScore, setAnimatedScore] = useState(0);
  const score = civicScore?.civic_literacy_score ?? 0;

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-card bg-card animate-pulse" />)}
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6 md:space-y-8">
      {/* Hero */}
      <motion.div variants={fadeUp}>
        <p className="eyebrow mb-2">YOUR CIVIC JOURNEY</p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl text-foreground leading-none">YOUR PROGRESS.</h1>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Score Ring */}
        <motion.div variants={fadeUp}
          className="bg-card rounded-card p-6 md:p-8 border border-border flex flex-col items-center"
        >
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" stroke="hsl(0 0% 16%)" strokeWidth="8" fill="none" />
              <circle cx="80" cy="80" r="70" stroke="hsl(87 58% 56%)" strokeWidth="8" fill="none"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 1s ease-out" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl md:text-4xl font-bold text-foreground">{animatedScore}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-foreground">Civic Score</p>

          {/* XP Bar */}
          <div className="w-full mt-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{civicScore?.total_xp ?? 0} XP</span>
              <span>Next badge at {Math.ceil((civicScore?.total_xp ?? 0) / 100) * 100} XP</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((civicScore?.total_xp ?? 0) % 100)}%` }} />
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="bg-card rounded-card p-4 md:p-5 border border-border hover-lift">
            <BookOpen className="h-5 w-5 text-primary mb-2" />
            <p className="text-xl md:text-2xl font-bold text-foreground">{civicScore?.lessons_completed ?? 0}</p>
            <p className="text-xs text-muted-foreground">Lessons Completed</p>
          </div>
          <div className="bg-card rounded-card p-4 md:p-5 border border-border hover-lift">
            <Award className="h-5 w-5 text-primary mb-2" />
            <p className="text-xl md:text-2xl font-bold text-foreground">{civicScore?.quizzes_passed ?? 0}</p>
            <p className="text-xs text-muted-foreground">Quizzes Passed</p>
          </div>
          <div className="bg-card rounded-card p-4 md:p-5 border border-border hover-lift">
            <Flame className="h-5 w-5 text-orange-400 mb-2" />
            <p className="text-xl md:text-2xl font-bold text-foreground">{streak?.current_streak ?? 0}</p>
            <p className="text-xs text-muted-foreground">Current Streak</p>
          </div>
          <div className="bg-card rounded-card p-4 md:p-5 border border-border hover-lift">
            <Trophy className="h-5 w-5 text-yellow-400 mb-2" />
            <p className="text-xl md:text-2xl font-bold text-foreground">{streak?.longest_streak ?? 0}</p>
            <p className="text-xs text-muted-foreground">Longest Streak</p>
          </div>
        </motion.div>
      </div>

      {/* Badges Grid */}
      <motion.div variants={fadeUp}>
        <h2 className="font-heading text-xl md:text-2xl text-foreground mb-4">BADGES</h2>
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
          {allBadges.map((badge, i) => {
            const earned = earnedIds.has(badge.id);
            const eb = earned ? earnedBadges.find((b) => b.id === badge.id) : null;
            return (
              <motion.div key={badge.id}
                variants={fadeUp}
                className={`bg-card rounded-card p-3 md:p-5 border text-center transition-all hover-lift ${
                  earned ? "border-primary shadow-[0_0_15px_hsl(87_58%_56%/0.15)]" : "border-border opacity-50"
                }`}
              >
                <div className="text-2xl md:text-3xl mb-1 md:mb-2">{badge.icon_url || "🏅"}</div>
                <p className="text-xs md:text-sm font-bold text-foreground">{badge.name}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1 hidden sm:block">{badge.description}</p>
                {earned && eb?.earned_at && (
                  <p className="text-[10px] text-primary mt-1 md:mt-2">Earned {new Date(eb.earned_at).toLocaleDateString()}</p>
                )}
                {!earned && <Lock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground mx-auto mt-1 md:mt-2" />}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* XP History */}
      <motion.div variants={fadeUp} className="bg-card rounded-card p-5 md:p-6 border border-border">
        <h2 className="font-heading text-xl md:text-2xl text-foreground mb-4">XP HISTORY</h2>
        <div className="flex items-end gap-1.5 md:gap-2 h-24 md:h-32">
          {[20, 35, 15, 45, 30, 50, 25].map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-primary/20 rounded-t-sm relative overflow-hidden"
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: "easeOut" }}
            >
              <div className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-sm" style={{ height: `${h * 0.7}%` }} />
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
