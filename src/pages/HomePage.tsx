import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Clock, Vote, TrendingUp, ArrowRight, Bookmark, 
  Sparkles, MapPin, Bell, ChevronRight, Flame, Scale, Building2, BookOpen
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import civicHero from "@/assets/civic-hero.jpg";
import { useGamification } from "@/hooks/useGamification";
import CivicScoreCard from "@/components/gamification/CivicScoreCard";
import StreakTracker from "@/components/gamification/StreakTracker";
import BadgeGrid from "@/components/gamification/BadgeGrid";

const electionDate = new Date("2026-11-03");
const getDaysUntil = () => Math.max(0, Math.ceil((electionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

const quickActions = [
  { icon: Vote, label: "Check Registration", color: "bg-secondary text-secondary-foreground" },
  { icon: MapPin, label: "Find Polling Place", color: "bg-civic-teal text-secondary-foreground" },
  { icon: Calendar, label: "Key Deadlines", color: "bg-civic-gold text-accent-foreground" },
  { icon: Bell, label: "Set Reminders", color: "bg-primary text-primary-foreground" },
];

const trendingTopics = [
  { title: "Infrastructure Bill Update", category: "Federal", icon: Building2, hot: true },
  { title: "Local School Board Elections", category: "Local", icon: Scale },
  { title: "State Housing Policy Changes", category: "State", icon: TrendingUp },
];

const suggestedPrompts = [
  "What's on my ballot this year?",
  "Explain the new housing bill",
  "How do I register to vote?",
  "Compare candidates for governor",
];

const newsItems = [
  {
    title: "Voter Registration Deadline Approaching",
    excerpt: "Important dates you need to know for the upcoming election cycle.",
    category: "Elections",
    time: "2h ago",
    source: "Civic Wire",
  },
  {
    title: "New Education Funding Policy Explained",
    excerpt: "A plain-language breakdown of the proposed changes to school funding.",
    category: "Education",
    time: "4h ago",
    source: "Policy Brief",
  },
  {
    title: "Community Meeting: Transportation Plan",
    excerpt: "Your city council discusses the 2027 transit expansion proposal.",
    category: "Local",
    time: "6h ago",
    source: "City Hall",
  },
];

export default function HomePage() {
  const daysLeft = getDaysUntil();
  const { civicScore, streak, earnedBadges, allBadges, loading: gamLoading } = useGamification();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning ☀️</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your civic dashboard</p>
        </div>
        <Link to="/profile" className="h-10 w-10 rounded-full gradient-civic flex items-center justify-center text-primary-foreground font-semibold text-sm">
          U
        </Link>
      </motion.div>

      {/* Election Countdown Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl shadow-elevated"
      >
        <img src={civicHero} alt="Civic landscape" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(213,80%,12%)] via-[hsl(213,80%,12%,0.7)] to-transparent" />
        <div className="relative px-5 py-6 text-primary-foreground">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-civic-gold" />
            <span className="text-xs font-medium uppercase tracking-wider opacity-80">Next Election</span>
          </div>
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-5xl font-extrabold tracking-tight">{daysLeft}</span>
            <span className="text-lg font-medium opacity-80">days away</span>
          </div>
          <p className="text-sm opacity-70 mb-4">November 3, 2026 · General Election</p>
          <Link to="/vote">
            <Button variant="secondary" size="sm" className="rounded-pill font-semibold gap-1.5">
              Build Your Voting Plan <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="grid grid-cols-4 gap-2.5">
          {quickActions.map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card shadow-card hover:shadow-elevated transition-shadow">
              <div className={`h-10 w-10 rounded-xl ${action.color} flex items-center justify-center`}>
                <action.icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <span className="text-[11px] font-medium text-foreground text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Gamification Section */}
      {!gamLoading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="space-y-4">
          <CivicScoreCard
            totalXp={civicScore?.total_xp ?? 0}
            literacyScore={civicScore?.civic_literacy_score ?? 0}
            lessonsCompleted={civicScore?.lessons_completed ?? 0}
            quizzesPassed={civicScore?.quizzes_passed ?? 0}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StreakTracker
              currentStreak={streak?.current_streak ?? 0}
              longestStreak={streak?.longest_streak ?? 0}
            />
            <Link to="/learn" className="flex items-center gap-3 bg-card rounded-2xl p-5 shadow-card hover:shadow-elevated transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Civic Lessons</p>
                <p className="text-xs text-muted-foreground">Build your civic literacy</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
          {allBadges.length > 0 && (
            <BadgeGrid allBadges={allBadges} earnedBadges={earnedBadges} />
          )}
        </motion.div>
      )}

      {/* Ask UWAZI Prompts */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-civic-gold" />
            <h2 className="text-base font-semibold text-foreground">Ask UWAZI</h2>
          </div>
          <Link to="/ask" className="text-xs font-medium text-primary hover:underline">See all</Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {suggestedPrompts.map((prompt, i) => (
            <Link key={i} to="/ask" className="shrink-0 px-4 py-2.5 rounded-pill bg-card shadow-card border border-border text-sm font-medium text-foreground hover:shadow-elevated hover:border-primary/30 transition-all">
              {prompt}
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Trending Topics */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Flame className="h-4 w-4 text-civic-coral" /> Trending Now
        </h2>
        <div className="space-y-2">
          {trendingTopics.map((topic, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <topic.icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{topic.title}</p>
                <p className="text-xs text-muted-foreground">{topic.category}</p>
              </div>
              {topic.hot && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-civic-coral/10 text-civic-coral">Hot</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Civic News */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Civic Updates</h2>
          <Link to="/news" className="text-xs font-medium text-primary hover:underline">View all</Link>
        </div>
        <div className="space-y-3">
          {newsItems.map((item, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-primary/10 text-primary">{item.category}</span>
                <span className="text-[10px] text-muted-foreground">{item.time}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{item.source}</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.excerpt}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
