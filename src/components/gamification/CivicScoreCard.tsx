import { motion } from "framer-motion";
import { TrendingUp, BookOpen, CheckCircle, Zap } from "lucide-react";

interface Props {
  totalXp: number;
  literacyScore: number;
  lessonsCompleted: number;
  quizzesPassed: number;
}

export default function CivicScoreCard({ totalXp, literacyScore, lessonsCompleted, quizzesPassed }: Props) {
  const stats = [
    { icon: Zap, label: "Total XP", value: totalXp, color: "text-accent" },
    { icon: BookOpen, label: "Lessons", value: lessonsCompleted, color: "text-primary" },
    { icon: CheckCircle, label: "Quizzes", value: quizzesPassed, color: "text-secondary" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 shadow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Civic Literacy Score</h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Level {Math.floor(totalXp / 100) + 1}</span>
      </div>

      {/* Score ring */}
      <div className="flex items-center gap-5 mb-5">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              className="stroke-muted"
              strokeWidth="3"
            />
            <motion.path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              className="stroke-primary"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0, 100" }}
              animate={{ strokeDasharray: `${literacyScore}, 100` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-extrabold text-foreground">{literacyScore}</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">
            {literacyScore < 30
              ? "Getting started! Keep learning."
              : literacyScore < 60
              ? "You're building civic knowledge!"
              : literacyScore < 80
              ? "Impressive civic awareness!"
              : "You're a civic powerhouse! 🌟"}
          </p>
          {/* XP progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalXp % 100), 100)}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{totalXp % 100}/100 XP to next level</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat, i) => (
          <div key={i} className="bg-muted/50 rounded-xl p-2.5 text-center">
            <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} strokeWidth={1.8} />
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
