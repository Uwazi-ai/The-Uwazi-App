import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";

interface Props {
  currentStreak: number;
  longestStreak: number;
}

export default function StreakTracker({ currentStreak, longestStreak }: Props) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const activeDays = Math.min(currentStreak, 7);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 shadow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-civic-coral" />
          <h3 className="text-sm font-bold text-foreground">Daily Streak</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Trophy className="h-3.5 w-3.5 text-accent" />
          Best: {longestStreak}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1 mb-4">
        <motion.span
          className="text-4xl font-extrabold text-foreground"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          {currentStreak}
        </motion.span>
        <span className="text-sm text-muted-foreground ml-1">
          {currentStreak === 1 ? "day" : "days"}
        </span>
      </div>

      {/* Week dots */}
      <div className="flex justify-between px-2">
        {days.map((day, i) => {
          const isActive = i < activeDays;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <motion.div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                initial={isActive ? { scale: 0 } : {}}
                animate={isActive ? { scale: 1 } : {}}
                transition={{ delay: i * 0.05 }}
              >
                {isActive ? "✓" : ""}
              </motion.div>
              <span className="text-[10px] text-muted-foreground">{day}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
