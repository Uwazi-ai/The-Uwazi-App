import { motion } from "framer-motion";
import { Award } from "lucide-react";

interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  xp_reward: number;
  earned_at?: string;
}

interface Props {
  allBadges: Badge[];
  earnedBadges: Badge[];
}

export default function BadgeGrid({ allBadges, earnedBadges }: Props) {
  const earnedSlugs = new Set(earnedBadges.map((b) => b.slug));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 shadow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-accent" />
          <h3 className="text-sm font-bold text-foreground">Badges</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {earnedBadges.length}/{allBadges.length} earned
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {allBadges.map((badge, i) => {
          const earned = earnedSlugs.has(badge.slug);
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
                earned
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "bg-muted/50 opacity-40 grayscale"
              }`}
              title={badge.description || badge.name}
            >
              <span className="text-2xl">{badge.icon_url || "🏅"}</span>
              <span className="text-[10px] font-medium text-foreground text-center leading-tight">
                {badge.name}
              </span>
              {earned && (
                <span className="text-[9px] font-bold text-primary">+{badge.xp_reward} XP</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
