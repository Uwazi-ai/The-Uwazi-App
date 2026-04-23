import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Vote,
  FileText,
  TrendingUp,
  PlayCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface TourStep {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  to: string;
  cta: string;
  accent: string;
}

const STEPS: TourStep[] = [
  {
    icon: PlayCircle,
    eyebrow: "Step 1 · Watch",
    title: "Policy Power & Progress.",
    body: "Short, vertical-feed episodes that break down what's actually happening in government — no jargon, no spin.",
    to: "/app/watch",
    cta: "Open Watch",
    accent: "from-rose-500/25 via-pink-500/10 to-transparent",
  },
  {
    icon: Sparkles,
    eyebrow: "Step 2 · Ask",
    title: "Ask Uwazi anything.",
    body: "Your AI civics coach. Ask about a bill, a candidate, or how government actually works — get a clear answer with sources.",
    to: "/app/ask",
    cta: "Try Ask Uwazi",
    accent: "from-violet-500/25 via-fuchsia-500/10 to-transparent",
  },
  {
    icon: GraduationCap,
    eyebrow: "Step 3 · Learn",
    title: "Level up your civic IQ.",
    body: "Bite-sized lessons grouped into tracks. Earn XP, badges, and streaks as you go.",
    to: "/app/learn",
    cta: "Start a Lesson",
    accent: "from-emerald-500/25 via-teal-500/10 to-transparent",
  },
  {
    icon: Vote,
    eyebrow: "Step 4 · Vote",
    title: "Plan your vote.",
    body: "Local elections, candidates, and ballot measures — all tied to your ZIP code so it's actually relevant.",
    to: "/app/vote",
    cta: "Open Voting Hub",
    accent: "from-amber-500/25 via-orange-500/10 to-transparent",
  },
  {
    icon: FileText,
    eyebrow: "Step 5 · Track",
    title: "Track real bills.",
    body: "Federal & state legislation in plain English. Save bills and follow how they move.",
    to: "/app/legislation",
    cta: "Browse Legislation",
    accent: "from-sky-500/25 via-blue-500/10 to-transparent",
  },
  {
    icon: TrendingUp,
    eyebrow: "Step 6 · Progress",
    title: "See your impact.",
    body: "Track your Civic Score, badges, streak, and bills tracked — all in one dashboard.",
    to: "/app/progress",
    cta: "View Progress",
    accent: "from-primary/25 via-primary/10 to-transparent",
  },
];

interface AppTourModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AppTourModal({ open, onClose }: AppTourModalProps) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const Icon = step.icon;
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  const next = () => !isLast && setIndex((i) => i + 1);
  const prev = () => !isFirst && setIndex((i) => i - 1);

  const handleClose = () => {
    onClose();
    // reset for next open
    setTimeout(() => setIndex(0), 250);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-background/85 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-lg rounded-3xl bg-card border border-border overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent wash */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${step.accent} opacity-70 pointer-events-none transition-opacity duration-500`}
            />

            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-background/60 backdrop-blur-sm border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background transition-colors"
              aria-label="Close tour"
            >
              <X size={16} />
            </button>

            {/* Content */}
            <div className="relative p-8 md:p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-background/60 backdrop-blur-sm border border-border flex items-center justify-center mb-5">
                    <Icon className="text-primary" size={26} />
                  </div>

                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-2">
                    {step.eyebrow}
                  </p>
                  <h3 className="font-heading text-2xl md:text-3xl text-foreground leading-[1.1] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    {step.body}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mt-7">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === index
                        ? "w-7 bg-primary"
                        : "w-1.5 bg-foreground/15 hover:bg-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between mt-7 gap-3">
                <button
                  onClick={prev}
                  disabled={isFirst}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold text-foreground/70 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    to={step.to}
                    onClick={handleClose}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-background/60 backdrop-blur-sm border border-border text-sm font-semibold text-foreground hover:bg-background transition-colors"
                  >
                    {step.cta}
                    <ArrowRight size={14} />
                  </Link>

                  {!isLast ? (
                    <button
                      onClick={next}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:scale-[1.03] transition-transform"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleClose}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:scale-[1.03] transition-transform"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
