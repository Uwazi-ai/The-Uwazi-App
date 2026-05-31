import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

const SESSION_KEY = "my_city_modal_shown";
const EVENT_OPEN = "uwazi:open-my-city-modal";

export function openMyCityUnlockModal() {
  window.dispatchEvent(new CustomEvent(EVENT_OPEN));
}

interface Slide {
  emoji: string;
  eyebrow: string;
  title: string;
  body: string;
  features?: string[];
  isCta?: boolean;
}

const SLIDES: Slide[] = [
  {
    emoji: "🏙️",
    eyebrow: "EXCLUSIVE FEATURE",
    title: "MY CITY",
    body: "See exactly where every tax dollar is spent in your neighborhood — down to the contractor, the contract type, and how much stays local.",
    features: [
      "Active projects in your ZIP code",
      "Who's getting the contracts + how much",
      "Local vs. out-of-state vendor breakdown",
      "Public comment alerts for your district",
    ],
  },
  {
    emoji: "💰",
    eyebrow: "CONTRACT TRANSPARENCY",
    title: "YOUR MONEY. WHO GETS IT.",
    body: "Every contract awarded in your ZIP — city, state, and federal — with full vendor details, ownership status, and sub-contractor chains.",
    features: [
      "MBE/WBE/SBE certified vendor tracking",
      "No-bid contract flagging",
      "Sub-contractor money trail",
      "Equity gap scoring vs. city targets",
    ],
  },
  {
    emoji: "✦",
    eyebrow: "GET FULL ACCESS",
    title: "UNLOCK MY CITY",
    body: "My City is included in Uwazi+. Subscribe for $4.99/month and get unlimited Ask Uwazi, My City, premium video, and everything we build next.",
    isCta: true,
  },
];

const PANEL_BG = "#1e2c0e";
const LIME = "#9BD34B";

export function MyCityUnlockModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { isPremium } = useSubscription();

  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      setStep(0);
      setDirection(1);
    }, 250);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (isPremium) return;
      if (sessionStorage.getItem(SESSION_KEY) === "true") return;
      sessionStorage.setItem(SESSION_KEY, "true");
      setStep(0);
      setDirection(1);
      setOpen(true);
    };
    window.addEventListener(EVENT_OPEN, handler);
    return () => window.removeEventListener(EVENT_OPEN, handler);
  }, [isPremium]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" && step < SLIDES.length - 1) {
        setDirection(1);
        setStep(step + 1);
      }
      if (e.key === "ArrowLeft" && step > 0) {
        setDirection(-1);
        setStep(step - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, close]);

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const noMotion = <T,>(v: T): T | Record<string, never> => (reduceMotion ? {} : v);
  const noTransition = <T,>(v: T): T | { duration: 0 } => (reduceMotion ? { duration: 0 } : v);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={noMotion({ opacity: 0 })}
            animate={noMotion({ opacity: 1 })}
            exit={noMotion({ opacity: 0 })}
            transition={noTransition({ duration: 0.2 })}
            onClick={close}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
          />

          <motion.div
            initial={noMotion({ opacity: 0, scale: 0.93, y: 16 })}
            animate={noMotion({ opacity: 1, scale: 1, y: 0 })}
            exit={noMotion({ opacity: 0, scale: 0.93, y: 16 })}
            transition={noTransition({ type: "spring", stiffness: 300, damping: 28 })}
            className="relative w-full max-w-md bg-card rounded-2xl border border-border overflow-hidden z-10"
          >
            <button
              onClick={close}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-all z-10"
            >
              <X size={14} className="text-foreground" />
            </button>

            {/* Image panel */}
            <div
              className="relative flex items-center justify-center overflow-hidden"
              style={{ height: 200, backgroundColor: PANEL_BG }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: -40,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background: "rgba(155,211,75,0.18)",
                  filter: "blur(20px)",
                }}
              />
              <motion.div
                key={`emoji-${step}`}
                animate={noMotion({ y: [0, -8, 0] })}
                transition={noTransition({ duration: 2.4, repeat: Infinity, ease: "easeInOut" })}
                className="relative"
                style={{
                  fontSize: 52,
                  lineHeight: 1,
                  color: slide.isCta ? LIME : undefined,
                  textShadow: slide.isCta ? `0 0 30px ${LIME}80` : undefined,
                }}
              >
                {slide.emoji}
              </motion.div>
            </div>

            <div className="p-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={noMotion({ opacity: 0, x: direction > 0 ? 40 : -40 })}
                  animate={noMotion({ opacity: 1, x: 0 })}
                  exit={noMotion({ opacity: 0, x: direction > 0 ? -40 : 40 })}
                  transition={noTransition({ duration: 0.22, ease: "easeOut" })}
                >
                  <span
                    className="inline-block font-mono"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(155,211,75,0.1)",
                      border: "1px solid rgba(155,211,75,0.25)",
                      borderRadius: 6,
                      padding: "3px 8px",
                      color: LIME,
                      marginBottom: 10,
                    }}
                  >
                    ✦ UWAZI+
                  </span>
                  <p
                    className="text-[10px] tracking-[3px] uppercase mb-1.5 font-bold"
                    style={{ color: LIME }}
                  >
                    {slide.eyebrow}
                  </p>
                  <h3 className="font-heading text-[26px] text-foreground leading-tight">
                    {slide.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2 mb-5">
                    {slide.body}
                  </p>

                  {slide.features && (
                    <ul className="space-y-2 mb-2">
                      {slide.features.map((f) => (
                        <li key={f} className="flex items-center gap-3">
                          <span
                            className="shrink-0 rounded-full"
                            style={{ width: 5, height: 5, background: LIME }}
                          />
                          <span className="text-[12px] text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {slide.isCta && (
                    <div className="flex items-baseline justify-between flex-wrap gap-2 mt-1 mb-2">
                      <div className="flex items-baseline gap-1">
                        <span
                          className="font-heading leading-none"
                          style={{ fontSize: 28, color: LIME }}
                        >
                          $4.99
                        </span>
                        <span className="text-[12px] text-muted-foreground">/month</span>
                      </div>
                      <span className="text-[12px] font-semibold text-amber-400">
                        Price increases Jul 16
                      </span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 mt-6">
                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  {SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setDirection(i > step ? 1 : -1);
                        setStep(i);
                      }}
                      aria-label={`Slide ${i + 1}`}
                      className="rounded-full transition-all"
                      style={{
                        width: i === step ? 10 : 8,
                        height: i === step ? 10 : 8,
                        backgroundColor: i === step ? LIME : "rgba(255,255,255,0.15)",
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (isLast) {
                      close();
                      navigate("/app/my-city");
                    } else {
                      setDirection(1);
                      setStep(step + 1);
                    }
                  }}
                  className="px-5 py-2 font-heading text-xs rounded-full transition-all hover:opacity-90"
                  style={{ background: LIME, color: "#080808" }}
                >
                  {isLast ? "✦ Unlock My City →" : "Next →"}
                </button>
              </div>

              <button
                onClick={() => {
                  if (isLast) {
                    close();
                  } else {
                    setDirection(1);
                    setStep(SLIDES.length - 1);
                  }
                }}
                className="block w-full text-center text-[12px] text-muted-foreground mt-4 hover:text-foreground transition-colors"
              >
                {isLast ? "Maybe later" : "Skip — what else is in Uwazi+?"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
