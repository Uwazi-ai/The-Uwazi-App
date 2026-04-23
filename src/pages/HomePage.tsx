import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Play,
  ArrowRight,
  BookOpen,
  Target,
  TrendingUp,
  Vote,
  Lock,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import FeatureTour from "@/components/home/FeatureTour";

interface Episode {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  topic_emoji: string | null;
  date: string | null;
  video_url: string | null;
  is_free: boolean;
  sort_order: number;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { civicScore } = useGamification();
  const { zipCode } = useCivicLocation();
  const { isPremium: isSubscribed } = useSubscription();
  const reduceMotion = useReducedMotion();

  const [tourOpen, setTourOpen] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [lessonCount, setLessonCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [epRes, lessonRes] = await Promise.all([
        supabase
          .from("episodes")
          .select("id, title, description, topic, topic_emoji, date, video_url, is_free, sort_order")
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("lessons")
          .select("id", { count: "exact", head: true })
          .eq("is_published", true),
      ]);
      if (cancelled) return;
      setEpisodes((epRes.data as Episode[]) ?? []);
      setLessonCount(lessonRes.count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Citizen";

  const featured = episodes[0];
  const score = civicScore?.civic_literacy_score ?? 0;

  const noMotion = <T,>(val: T): T | Record<string, never> => (reduceMotion ? {} : val);
  const noTransition = <T,>(val: T): T | { duration: 0 } => (reduceMotion ? { duration: 0 } : val);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-8 pb-24 md:pb-8 space-y-8">
      <FeatureTour open={tourOpen} onClose={() => setTourOpen(false)} />

      {/* SECTION 1 — Hero */}
      <motion.div
        initial={noMotion({ opacity: 0, y: 12 })}
        animate={noMotion({ opacity: 1, y: 0 })}
        transition={noTransition({ duration: 0.5, ease: "easeOut" })}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-2">
          Your Civic Dashboard
        </p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-[52px] text-foreground leading-[1.05]">
          Welcome back, <span className="text-primary">{displayName}</span>.
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <p className="text-[15px] text-muted-foreground">Build your Civic Freedom</p>
          <motion.button
            whileHover={noMotion({ scale: 1.04 })}
            whileTap={noMotion({ scale: 0.96 })}
            onClick={() => setTourOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground/[0.04] border border-border text-muted-foreground hover:border-primary/40 hover:text-primary text-xs font-semibold transition-all duration-200"
          >
            <Play className="w-3 h-3" />
            Explore the App
          </motion.button>
        </div>
      </motion.div>

      {/* SECTION 2 — Featured Episode Hero */}
      {featured && (
        <motion.div
          initial={noMotion({ opacity: 0, y: 30 })}
          animate={noMotion({ opacity: 1, y: 0 })}
          transition={noTransition({ delay: 0.15, duration: 0.5 })}
          onClick={() => navigate("/app/watch")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/app/watch");
            }
          }}
          className="rounded-2xl overflow-hidden border border-border bg-card cursor-pointer group"
        >
          {/* Top visual area */}
          <div className="h-56 relative bg-gradient-to-br from-primary/20 to-background overflow-hidden">
            {featured.video_url && (
              <video
                src={featured.video_url}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                disableRemotePlayback
              />
            )}

            {/* Animated grid overlay */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(var(--primary) / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.15) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                animation: reduceMotion ? "none" : "gridScroll 8s linear infinite",
              }}
            />

            {/* Bottom scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {/* Top-left badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                {featured.topic_emoji} {featured.topic}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-foreground/10 backdrop-blur-sm text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                Featured
              </span>
            </div>

            {/* Top-right counter */}
            <div className="absolute top-4 right-4 z-10">
              <span className="px-2.5 py-1 rounded-full bg-foreground/10 backdrop-blur-sm text-muted-foreground text-[10px] font-semibold">
                1 / {episodes.length}
              </span>
            </div>

            {/* Center pulsing play button */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <motion.button
                animate={noMotion({ scale: [1, 1.06, 1] })}
                transition={noTransition({
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/app/watch");
                }}
                className="pointer-events-auto w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.5)] hover:scale-110 transition-transform"
                aria-label="Play featured episode"
              >
                <Play size={26} className="ml-1 fill-current" />
              </motion.button>
            </div>
          </div>

          {/* Bottom info bar */}
          <div className="bg-background/60 backdrop-blur-sm p-5 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-[20px] text-foreground leading-tight truncate">
                {featured.title}
              </h3>
              {featured.description && (
                <p className="text-muted-foreground text-xs line-clamp-2 mt-1">
                  {featured.description}
                </p>
              )}
              {featured.date && (
                <p className="text-muted-foreground/60 text-[11px] mt-1">
                  {featured.date}
                </p>
              )}
            </div>
            <div className="shrink-0 inline-flex items-center gap-1.5 text-primary text-xs font-bold whitespace-nowrap">
              <Play size={12} className="fill-current" />
              Watch Now
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.div>
      )}

      {/* SECTION 3 — Episode Strip */}
      {episodes.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1">
                Watch & Learn
              </p>
              <h2 className="font-heading text-[22px] text-foreground">
                Featured Episodes
              </h2>
            </div>
            <Link
              to="/app/watch"
              className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              View all →
            </Link>
          </div>

          <div
            className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory touch-pan-x -mx-4 px-4 md:mx-0 md:px-0"
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorX: "contain",
              scrollPaddingLeft: "1rem",
            }}
          >
            {episodes.map((ep, idx) => {
              const requiresSub = !ep.is_free && !isSubscribed;
              const isPlaying = idx === 0;
              return (
                <div
                  key={ep.id}
                  onClick={() => navigate("/app/watch")}
                  className="w-40 flex-shrink-0 rounded-xl overflow-hidden border border-border bg-card cursor-pointer snap-start group hover:border-primary/40 transition-colors"
                >
                  <div className="h-[90px] relative bg-gradient-to-br from-primary/20 to-background overflow-hidden">
                    {ep.video_url && (
                      <video
                        src={ep.video_url}
                        className="absolute inset-0 w-full h-full object-cover opacity-70"
                        autoPlay={isPlaying}
                        loop={isPlaying}
                        muted
                        playsInline
                        preload={isPlaying ? "auto" : "metadata"}
                        disableRemotePlayback
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {isPlaying && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Play size={8} className="fill-current" />
                        Playing
                      </div>
                    )}

                    {requiresSub ? (
                      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Lock size={16} className="text-primary mb-1" />
                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                          Uwazi+
                        </span>
                      </div>
                    ) : (
                      !isPlaying && (
                        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Play size={14} className="ml-0.5 fill-current" />
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="p-2.5">
                    <p className="text-primary text-[9px] font-bold uppercase tracking-wider mb-0.5 truncate">
                      {ep.topic}
                    </p>
                    <p className="text-foreground text-[11px] font-semibold leading-tight line-clamp-2">
                      {ep.title}
                    </p>
                    {ep.date && (
                      <p className="text-muted-foreground/60 text-[10px] mt-1">
                        {ep.date}
                      </p>
                    )}
                  </div>

                  {requiresSub && (
                    <Link
                      to="/upgrade"
                      onClick={(e) => e.stopPropagation()}
                      className="block px-2.5 py-1.5 bg-primary/10 border-t border-primary/20 text-primary text-[10px] font-bold text-center hover:bg-primary/20 transition-colors"
                    >
                      Unlock All Episodes →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 4 — Civic Loop Cards */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1">
            Your Journey
          </p>
          <h2 className="font-heading text-[22px] text-foreground">
            Your Civic Loop
          </h2>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
        >
          {/* Card 1 — LEARN */}
          <motion.div
            variants={{
              hidden: noMotion({ opacity: 0, y: 20 }),
              visible: noMotion({ opacity: 1, y: 0 }),
            }}
            whileHover={noMotion({ y: -4, transition: { duration: 0.2 } })}
            onClick={() => navigate("/app/learn")}
            className="bg-card backdrop-blur-xl border border-border rounded-2xl p-5 cursor-pointer flex flex-col gap-3"
          >
            <div className="bg-primary/10 rounded-xl w-10 h-10 flex items-center justify-center">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-[16px] text-foreground">01 LEARN</h3>
              <p className="text-muted-foreground text-xs mt-1">
                {lessonCount || 13} lessons available
              </p>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[11px] w-full py-2 rounded-lg mt-auto transition-colors">
              Start Learning →
            </button>
          </motion.div>

          {/* Card 2 — PRACTICE */}
          <motion.div
            variants={{
              hidden: noMotion({ opacity: 0, y: 20 }),
              visible: noMotion({ opacity: 1, y: 0 }),
            }}
            whileHover={noMotion({ y: -4, transition: { duration: 0.2 } })}
            onClick={() => navigate("/app/learn")}
            className="relative bg-card backdrop-blur-xl border border-border rounded-2xl p-5 cursor-pointer flex flex-col gap-3"
          >
            {!reduceMotion && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl"
                animate={{
                  boxShadow: [
                    "0 0 0px hsl(var(--primary) / 0)",
                    "0 0 16px -4px hsl(var(--primary) / 0.3)",
                    "0 0 0px hsl(var(--primary) / 0)",
                  ],
                }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              />
            )}
            <div className="bg-primary/10 rounded-xl w-10 h-10 flex items-center justify-center">
              <Target size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-[16px] text-foreground">02 PRACTICE</h3>
              <p className="text-muted-foreground text-xs mt-1">Daily challenge ready</p>
            </div>
            <button className="border border-primary/50 text-primary hover:bg-primary/10 font-bold text-[11px] w-full py-2 rounded-lg mt-auto transition-colors">
              Take Challenge →
            </button>
          </motion.div>

          {/* Card 3 — PROGRESS */}
          <motion.div
            variants={{
              hidden: noMotion({ opacity: 0, y: 20 }),
              visible: noMotion({ opacity: 1, y: 0 }),
            }}
            whileHover={noMotion({ y: -4, transition: { duration: 0.2 } })}
            onClick={() => navigate("/app/progress")}
            className="bg-card backdrop-blur-xl border border-border rounded-2xl p-5 cursor-pointer flex flex-col gap-3"
          >
            <div className="bg-primary/10 rounded-xl w-10 h-10 flex items-center justify-center">
              <TrendingUp size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-[16px] text-foreground">03 PROGRESS</h3>
              <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden mt-2">
                <motion.div
                  initial={noMotion({ width: 0 })}
                  animate={noMotion({ width: `${score}%` })}
                  transition={noTransition({ duration: 1, ease: "easeOut" })}
                  className="h-full bg-primary rounded-full"
                />
              </div>
              <p className="text-muted-foreground text-xs mt-2">
                Civic Score: {score}/100
              </p>
            </div>
            <button className="border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 font-bold text-[11px] w-full py-2 rounded-lg mt-auto transition-colors">
              View Progress →
            </button>
          </motion.div>

          {/* Card 4 — ACT */}
          <motion.div
            variants={{
              hidden: noMotion({ opacity: 0, y: 20 }),
              visible: noMotion({ opacity: 1, y: 0 }),
            }}
            whileHover={noMotion({ y: -4, transition: { duration: 0.2 } })}
            onClick={() => navigate("/app/vote")}
            className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-2xl p-5 cursor-pointer flex flex-col gap-3"
          >
            <div className="bg-primary/15 rounded-xl w-10 h-10 flex items-center justify-center">
              <Vote size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-[16px] text-foreground">04 ACT</h3>
              <p className="text-primary text-xs mt-1 font-semibold">
                {zipCode ? `ZIP ${zipCode}` : "Set your ZIP"}
              </p>
              <p className="text-muted-foreground text-xs">
                {zipCode ? "Local elections ready" : "Personalize your hub"}
              </p>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[11px] w-full py-2 rounded-lg mt-auto transition-colors">
              Voting Hub →
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION 5 — Ask Uwazi CTA */}
      <motion.div
        onClick={() => navigate("/app/ask")}
        whileHover={noMotion({ y: -2 })}
        className="flex items-center gap-4 p-5 rounded-2xl bg-card backdrop-blur-xl border border-border hover:border-primary/30 cursor-pointer transition-all duration-300"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
          <MessageSquare size={22} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-lg md:text-xl text-foreground flex items-center gap-2">
            Ask Uwazi
            <Sparkles size={14} className="text-primary" />
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            Have a civic question? Get non-partisan, AI-powered answers.
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/app/ask");
          }}
          className="shrink-0 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:scale-[1.03] transition-transform whitespace-nowrap"
        >
          Ask Now →
        </button>
      </motion.div>
    </div>
  );
}
