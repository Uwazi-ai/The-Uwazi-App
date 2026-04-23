import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  GraduationCap,
  Vote,
  FileText,
  TrendingUp,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  to: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string; // gradient classes
  size?: "lg" | "md";
}

const FEATURES: Feature[] = [
  {
    to: "/app/ask",
    eyebrow: "AI Assistant",
    title: "Ask Uwazi anything.",
    description:
      "Get instant, non-partisan answers about bills, candidates, and how government actually works.",
    icon: Sparkles,
    accent: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
    size: "lg",
  },
  {
    to: "/app/learn",
    eyebrow: "Civic Learning",
    title: "Level up your civic IQ.",
    description: "Bite-sized lessons. Earn XP, badges, and streaks.",
    icon: GraduationCap,
    accent: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  {
    to: "/app/vote",
    eyebrow: "Voting Hub",
    title: "Plan your vote.",
    description: "Local elections, candidates, and ballot measures — all in one place.",
    icon: Vote,
    accent: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    to: "/app/legislation",
    eyebrow: "Legislation",
    title: "Track real bills.",
    description: "Federal & state legislation in plain English. See how it impacts you.",
    icon: FileText,
    accent: "from-sky-500/20 via-blue-500/10 to-transparent",
  },
  {
    to: "/app/progress",
    eyebrow: "Your Progress",
    title: "See how far you've come.",
    description: "Track your civic score, badges, and impact over time.",
    icon: TrendingUp,
    accent: "from-rose-500/20 via-pink-500/10 to-transparent",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
};

export default function FeatureTour() {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <motion.div variants={itemVariants} className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
            Explore Uwazi
          </p>
          <h2 className="font-heading text-2xl md:text-3xl text-foreground">
            Everything you need to engage.
          </h2>
        </div>
      </motion.div>

      {/* Bento grid: 1 col mobile, 6-col bento on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-fr">
        {FEATURES.map((feature, idx) => {
          const Icon = feature.icon;
          const isLarge = feature.size === "lg";
          return (
            <motion.div
              key={feature.to}
              variants={itemVariants}
              className={isLarge ? "md:col-span-6 lg:col-span-3 lg:row-span-2" : "md:col-span-3 lg:col-span-3"}
            >
              <Link
                to={feature.to}
                className="group relative h-full min-h-[180px] md:min-h-[200px] rounded-2xl overflow-hidden block transition-all duration-300 hover:scale-[1.015] hover-lift"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {/* Accent gradient wash */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
                />

                {/* Decorative oversized icon */}
                <div className="absolute -bottom-8 -right-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                  <Icon className="text-foreground" size={isLarge ? 220 : 160} />
                </div>

                {/* Content */}
                <div className="relative h-full p-6 md:p-7 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-11 h-11 rounded-xl bg-background/60 backdrop-blur-sm border border-border flex items-center justify-center">
                      <Icon className="text-primary" size={20} />
                    </div>
                    <div className="w-9 h-9 rounded-full bg-background/40 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight className="text-foreground" size={16} />
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                      {feature.eyebrow}
                    </p>
                    <h3
                      className={`font-heading text-foreground leading-[1.1] mb-2 ${
                        isLarge ? "text-2xl md:text-3xl lg:text-4xl" : "text-xl md:text-2xl"
                      }`}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className={`text-muted-foreground ${
                        isLarge ? "text-[15px] max-w-sm" : "text-sm"
                      }`}
                    >
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
