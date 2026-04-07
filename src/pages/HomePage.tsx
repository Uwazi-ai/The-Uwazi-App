import { motion } from "framer-motion";
import { ArrowRight, MapPin, Flame, BookOpen, Target, Zap, Trophy, Calendar, FileText, Vote, Award, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";
import { useGamification } from "@/hooks/useGamification";
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { useAuth } from "@/contexts/AuthContext";
import { useCivicNews, hasNewsApiKey } from "@/hooks/useNewsApi";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function HomePage() {
  const { user } = useAuth();
  const { civicScore, streak, earnedBadges, loading: gamLoading } = useGamification();
  const { zipCode } = useCivicLocation();
  const { data: newsData, isLoading: newsLoading } = useCivicNews("All", 1, "publishedAt");

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Citizen";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 18 ? "GOOD AFTERNOON" : "GOOD EVENING";

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-2">YOUR CIVIC DASHBOARD</p>
        <h1 className="font-heading text-5xl md:text-6xl text-foreground leading-none">
          {greeting}, {displayName.toUpperCase()}.
        </h1>
        <p className="text-lg text-muted-foreground mt-1">Build your Civic Freedom</p>
      </motion.div>

      {/* Stats Grid - Row 1 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard label="Civic Literacy Score" value={civicScore?.civic_literacy_score ?? 0} accent />
        <StatCard label="Current Streak" value={`${streak?.current_streak ?? 0}`} sub={`+${streak?.current_streak ?? 0} days`} icon={<Flame className="h-4 w-4 text-orange-400" />} />
        <StatCard label="Lessons Completed" value={civicScore?.lessons_completed ?? 0} />
        <StatCard label="Total XP Earned" value={civicScore?.total_xp ?? 0} />
      </motion.div>

      {/* Stats Grid - Row 2 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard label="Local Elections" value={zipCode ? "3" : "—"} sub={zipCode ? `ZIP ${zipCode}` : "Set ZIP"} />
        <StatCard label="Bills Tracked" value="0" />
        <StatCard label="Voting Plan" value={false ? "✓ Ready" : "Set up"} link="/vote" />
        <StatCard label="Badges Earned" value={earnedBadges.length} icon={<Award className="h-4 w-4 text-primary" />} />
      </motion.div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Civic Loop */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-card p-6 border border-border"
        >
          <h2 className="font-heading text-2xl text-foreground mb-5">YOUR CIVIC LOOP</h2>
          <div className="space-y-4">
            {[
              { num: "01", label: "LEARN", sub: `${civicScore?.lessons_completed ?? 0} lessons available`, icon: BookOpen },
              { num: "02", label: "PRACTICE", sub: "Daily challenge ready", icon: Target },
              { num: "03", label: "PROGRESS", sub: `Score: ${civicScore?.civic_literacy_score ?? 0}/100`, icon: Zap },
              { num: "04", label: "ACT", sub: "Election in 210 days", icon: Calendar },
            ].map((item) => (
              <div key={item.num} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-card bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-card rounded-card p-6 border border-border"
        >
          <h2 className="font-heading text-2xl text-foreground mb-5">YOUR CIVIC LOCATION</h2>
          {zipCode ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-3xl font-heading text-primary">{zipCode}</span>
              </div>
              <div className="bg-muted rounded-card p-4 mb-4">
                <p className="text-sm text-muted-foreground mb-1">Raia Score for {zipCode}</p>
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Link to="/ask" className="block bg-card rounded-card p-6 border border-border hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-2xl text-foreground">ASK UWAZI</h3>
              <p className="text-sm text-muted-foreground mt-1">Have a civic question? Get non-partisan, AI-powered answers.</p>
            </div>
            <div className="shrink-0">
              <div className="px-5 py-2.5 bg-primary text-primary-foreground rounded-card text-sm font-semibold flex items-center gap-2">
                Ask Now <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, accent, link }: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: boolean;
  link?: string;
}) {
  const inner = (
    <div className="bg-card rounded-card p-4 border border-border hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
  if (link) return <Link to={link}>{inner}</Link>;
  return inner;
}
