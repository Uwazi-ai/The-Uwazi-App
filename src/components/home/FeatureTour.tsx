import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  X,
  MessageSquare,
  BookOpen,
  Play,
  CheckSquare,
  FileText,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface FeatureTourProps {
  open: boolean;
  onClose: () => void;
}

interface TourStep {
  icon: LucideIcon;
  color: string;
  bg: string;
  name: string;
  step: string;
  route: string;
  desc: string;
}

const STEPS: TourStep[] = [
  {
    icon: MessageSquare,
    color: "hsl(var(--primary))",
    bg: "hsl(var(--primary) / 0.15)",
    name: "Ask Uwazi",
    step: "Step 1 of 6",
    route: "/app/ask",
    desc:
      "Get instant, nonpartisan answers to any civic question — from how a bill works to what your local representatives voted for. Powered by AI, grounded in facts.",
  },
  {
    icon: BookOpen,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.15)",
    name: "Learn",
    step: "Step 2 of 6",
    route: "/app/learn",
    desc:
      "Short, Duolingo-style civic lessons built around your community. Earn XP, track your Civic Literacy Score, and level up your understanding of democracy.",
  },
  {
    icon: Play,
    color: "#a855f7",
    bg: "rgba(168,85,247,0.15)",
    name: "Watch",
    step: "Step 3 of 6",
    route: "/app/watch",
    desc:
      "Original civic video content — from policy breakdowns to community stories. Stream episodes on the issues that affect your neighborhood most.",
  },
  {
    icon: CheckSquare,
    color: "#f97316",
    bg: "rgba(249,115,22,0.15)",
    name: "Voting Hub",
    step: "Step 4 of 6",
    route: "/app/vote",
    desc:
      "Everything you need to show up — your candidates, your polling location, your ballot, and a countdown to your next election. Your vote, demystified.",
  },
  {
    icon: FileText,
    color: "#14b8a6",
    bg: "rgba(20,184,166,0.15)",
    name: "Legislation Tracker",
    step: "Step 5 of 6",
    route: "/app/legislation",
    desc:
      "Track real bills in Congress and your state legislature. Get plain-language summaries, see how legislation affects your ZIP code, and follow the bills that matter.",
  },
  {
    icon: TrendingUp,
    color: "hsl(var(--primary))",
    bg: "hsl(var(--primary) / 0.15)",
    name: "Your Progress",
    step: "Step 6 of 6",
    route: "/app/progress",
    desc:
      "Every action earns Civic XP. Build streaks, unlock badges, and watch your Civic Score grow — because an informed citizen is a powerful one.",
  },
];

export default function FeatureTour({ open, onClose }: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const advance = (delta: number) => {
    const target = currentStep + delta;
    if (target < 0 || target > STEPS.length - 1) return;
    setDirection(delta);
    setCurrentStep(target);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setCurrentStep(0);
      setDirection(1);
    }, 250);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") advance(1);
      if (e.key === "ArrowLeft") advance(-1);
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentStep]);

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  const noMotion = <T,>(val: T): T | Record<string, never> => (reduceMotion ? {} : val);
  const noTransition = <T,>(val: T): T | { duration: 0 } => (reduceMotion ? { duration: 0 } : val);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={noMotion({ opacity: 0 })}
            animate={noMotion({ opacity: 1 })}
            exit={noMotion({ opacity: 0 })}
            transition={noTransition({ duration: 0.2 })}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Card */}
          <motion.div
            initial={noMotion({ opacity: 0, scale: 0.93, y: 16 })}
            animate={noMotion({ opacity: 1, scale: 1, y: 0 })}
            exit={noMotion({ opacity: 0, scale: 0.93, y: 16 })}
            transition={noTransition({ type: "spring", stiffness: 300, damping: 28 })}
            className="relative w-full max-w-md bg-card rounded-2xl border border-border overflow-hidden z-10"
          >
            {/* Close */}
            <button
              onClick={handleClose}
              aria-label="Close tour"
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-all z-10"
            >
              <X size={14} className="text-foreground" />
            </button>

            {/* Visual banner */}
            <div
              className="h-48 relative flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: step.bg }}
            >
              {/* Radial glow */}
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at center, ${step.color}30 0%, transparent 70%)`,
                }}
              />

              {/* Floating shapes */}
              {!reduceMotion &&
                [...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: `${20 + i * 12}px`,
                      height: `${20 + i * 12}px`,
                      backgroundColor: `${step.color}20`,
                      top: `${15 + i * 14}%`,
                      left: `${10 + i * 18}%`,
                    }}
                    animate={{
                      y: [0, -12, 0],
                      opacity: [0.4, 0.9, 0.4],
                    }}
                    transition={{
                      duration: 3 + i * 0.4,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: "easeInOut",
                    }}
                  />
                ))}

              {/* Center icon */}
              <motion.div
                key={`icon-${currentStep}`}
                animate={noMotion({ y: [0, -8, 0] })}
                transition={noTransition({
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                })}
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                style={{
                  backgroundColor: `${step.color}25`,
                  border: `1px solid ${step.color}50`,
                }}
              >
                <Icon size={36} style={{ color: step.color }} />
              </motion.div>
            </div>

            {/* Body */}
            <div className="p-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={noMotion({ opacity: 0, x: direction > 0 ? 40 : -40 })}
                  animate={noMotion({ opacity: 1, x: 0 })}
                  exit={noMotion({ opacity: 0, x: direction > 0 ? -40 : 40 })}
                  transition={noTransition({ duration: 0.22, ease: "easeOut" })}
                >
                  <p
                    className="text-[10px] tracking-[3px] uppercase mb-1.5 font-bold"
                    style={{ color: step.color }}
                  >
                    {step.step}
                  </p>
                  <h3 className="font-heading text-[26px] text-foreground leading-tight">
                    {step.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2 mb-6">
                    {step.desc}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Nav row */}
              <div className="flex items-center justify-between gap-3">
                {!isFirst ? (
                  <button
                    onClick={() => advance(-1)}
                    className="px-4 py-2 text-xs border border-border text-muted-foreground rounded-lg hover:text-foreground hover:border-foreground/30 transition-all"
                  >
                    Back
                  </button>
                ) : (
                  <div className="w-[68px]" />
                )}

                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setDirection(i > currentStep ? 1 : -1);
                        setCurrentStep(i);
                      }}
                      aria-label={`Go to step ${i + 1}`}
                      className="rounded-full transition-all"
                      style={{
                        width: i === currentStep ? "10px" : "6px",
                        height: i === currentStep ? "10px" : "6px",
                        backgroundColor:
                          i === currentStep
                            ? "hsl(var(--primary))"
                            : i < currentStep
                              ? "hsl(var(--primary) / 0.35)"
                              : "hsl(var(--foreground) / 0.15)",
                        transform: i === currentStep ? "scale(1.3)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (isLast) {
                      handleClose();
                      navigate(step.route);
                    } else {
                      advance(1);
                    }
                  }}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg transition-all"
                >
                  {isLast ? "Let's Go →" : "Next →"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
