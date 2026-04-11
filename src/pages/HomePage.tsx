import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Flame, BookOpen, Target, Zap, Trophy, Calendar, FileText, Vote, Award, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";
import { useGamification } from "@/hooks/useGamification";
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { useAuth } from "@/contexts/AuthContext";
import { useCivicNews, hasNewsApiKey } from "@/hooks/useNewsApi";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
};

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
}

export default function HomePage() {
  const { user } = useAuth();
  const { civicScore, streak, earnedBadges, loading: gamLoading } = useGamification();
  const { zipCode } = useCivicLocation();
  const { data: newsData, isLoading: newsLoading } = useCivicNews("All", 1, "publishedAt");

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Citizen";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 18 ? "GOOD AFTERNOON" : "GOOD EVENING";

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-8 pb-24 md:pb-8 space-y-5 md:space-y-6">
      {/* Hero */}
      <motion.div variants={itemVariants} className="pt-2 md:pt-4">
        <p className="eyebrow mb-2">YOUR CIVIC DASHBOARD</p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-[52px] text-foreground leading-[1.05]">
          {greeting}, {displayName.toUpperCase()}.
        </h1>
        <p className="text-[15px] text-muted-foreground mt-1">Build your Civic Freedom</p>
      </motion.div>

      {/* Stats Grid - Row 1 */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div variants={itemVariants}>
          <StatCard label="Civic Score" value={civicScore?.civic_literacy_score ?? 0} accent animate />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard label="Current Streak" value={streak?.current_streak ?? 0} sub={`+${streak?.current_streak ?? 0} days`} icon={<Flame className="h-4 w-4 text-orange-400" />} animate />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard label="Lessons Completed" value={civicScore?.lessons_completed ?? 0} animate />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard label="Total XP Earned" value={civicScore?.total_xp ?? 0} animate />
        </motion.div>
      </motion.div>

      {/* Stats Grid - Row 2 */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div variants={itemVariants}>
          <StatCard label="Local Elections" value={zipCode ? 3 : 0} sub={zipCode ? `ZIP ${zipCode}` : "Set ZIP"} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard label="Bills Tracked" value={0} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard label="Voting Plan" value="Set up" link="/vote" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard label="Badges Earned" value={earnedBadges.length} icon={<Award className="h-4 w-4 text-primary" />} animate />
        </motion.div>
      </motion.div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Civic Loop */}
        <motion.div variants={itemVariants}
          className="rounded-2xl p-5 md:p-7 card-highlight hover-lift"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="font-heading text-xl md:text-2xl text-foreground mb-5">YOUR CIVIC LOOP</h2>
          <div className="space-y-0">
            {[
              { num: "01", label: "LEARN", sub: `${civicScore?.lessons_completed ?? 0} lessons available`, icon: BookOpen },
              { num: "02", label: "PRACTICE", sub: "Daily challenge ready", icon: Target },
              { num: "03", label: "PROGRESS", sub: `Score: ${civicScore?.civic_literacy_score ?? 0}/100`, icon: Zap },
              { num: "04", label: "ACT", sub: "Election in 210 days", icon: Calendar },
            ].map((item, idx) => (
              <div key={item.num}
                className="flex items-center gap-[14px] py-[14px] transition-all duration-150 hover:translate-x-1"
                style={{ borderBottom: idx < 3 ? "1px solid var(--border-subtle)" : "none" }}>
                <div className="w-8 h-8 rounded-lg bg-primary/[0.12] border border-primary/20 flex items-center justify-center text-[12px] font-bold text-primary shrink-0">
                  {item.num}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Civic Location */}
        <motion.div variants={itemVariants}
          className="rounded-2xl p-5 md:p-7 card-highlight hover-lift"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="font-heading text-xl md:text-2xl text-foreground mb-5">YOUR CIVIC LOCATION</h2>
          {zipCode ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-2xl md:text-3xl font-heading text-primary">{zipCode}</span>
              </div>
              <div className="rounded-card p-4 mb-4" style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-[11px] text-muted-foreground uppercase tracking-[0.06em] font-medium mb-1">Raia Score for {zipCode}</p>
                <p className="text-lg font-bold text-foreground">Calculating...</p>
              </div>
              <Link to="/settings" className="text-sm text-primary hover:underline">Change Location →</Link>
              <p className="text-xs text-muted-foreground mt-2">Showing civic data for {zipCode}</p>
            </>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Set your ZIP to personalize your civic experience</p>
              <Link to="/settings" className="text-sm font-semibold text-primary hover:underline">Set My Location →</Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Ask UWAZI Banner */}
      <motion.div variants={itemVariants}>
        <Link to="/ask"
          className="block rounded-2xl p-5 md:p-7 card-highlight hover-lift transition-all"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-xl md:text-2xl text-foreground">ASK UWAZI</h3>
              <p className="text-sm text-muted-foreground mt-1">Have a civic question? Get non-partisan, AI-powered answers.</p>
            </div>
            <div className="shrink-0">
              <div className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:scale-[1.02]">
                Ask Now <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Latest Civic News */}
      {hasNewsApiKey() && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl md:text-2xl text-foreground flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" /> LATEST CIVIC NEWS
            </h2>
            <Link to="/civic-feed" className="text-sm text-primary hover:underline">View All →</Link>
          </div>
          {newsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-card p-4 space-y-2" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
                  <Skeleton className="h-28 w-full rounded-card" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(newsData?.articles || []).slice(0, 3).map((article: any, i: number) => (
                <motion.a key={article.url + i} variants={itemVariants}
                  href={article.url} target="_blank" rel="noopener noreferrer"
                  className="rounded-card card-highlight hover-lift transition-all overflow-hidden block"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
                  {article.urlToImage ? (
                    <img src={article.urlToImage} alt="" className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 flex items-center justify-center" style={{ background: "var(--input-bg)" }}>
                      <span className="text-lg font-heading text-muted-foreground/30">UWAZI</span>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[11px] text-muted-foreground mb-1">{article.source?.name}</p>
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 mb-1">{article.title}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {article.publishedAt ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }) : ""}
                    </p>
                  </div>
                </motion.a>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, sub, icon, accent, link, animate }: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: boolean;
  link?: string;
  animate?: boolean;
}) {
  const numericValue = typeof value === "number" ? value : 0;
  const countedValue = useCountUp(numericValue);
  const displayValue = animate && typeof value === "number" ? countedValue : value;

  const inner = (
    <div className="rounded-card p-4 md:p-5 card-highlight hover-lift transition-all"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className={`text-[32px] font-semibold leading-none tracking-[-0.03em] ${accent ? "text-primary" : "text-foreground"}`}>
        {displayValue}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
  if (link) return <Link to={link}>{inner}</Link>;
  return inner;
}
