import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CompassRose } from "./CompassRose";
import { PersonaBadge } from "./PersonaBadge";
import { TiltCard, captureFlat } from "./TiltCard";
import { usePersonas, personaColor, shortName } from "@/lib/personas";

const db = supabase as any;
type Phase = "sealed" | "opening" | "landed" | "badge" | "final";

const ordinalWord = (n: number) =>
  ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"][n - 1] ?? `${n}th`;

interface Props {
  persona: string;
  streak: string | null;
  scores: Record<string, number>;
  points: number;
  onDone: () => void;
}

export function PackOpening({ persona, streak, scores, points, onDone }: Props) {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { bySlug } = usePersonas();
  const pp = bySlug(persona);
  const ps = bySlug(streak);
  const [phase, setPhase] = useState<Phase>(reduce ? "final" : "sealed");
  const [city, setCity] = useState<string | null>(null);
  const [earned, setEarned] = useState<{ n: number; isNew: boolean }>({ n: 1, isNew: true });
  const [lessonTo, setLessonTo] = useState("/app/learn");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const month = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: ub }, { data: path }] = await Promise.all([
        db.from("profiles").select("city, voter_address_city").eq("user_id", user.id).maybeSingle(),
        db.from("user_badges").select("earned_at, badges!inner(art_key, rule)").eq("user_id", user.id),
        db.rpc("get_my_path"),
      ]);
      setCity(p?.city || p?.voter_address_city || null);
      const personaBadges = (ub ?? []).filter((r: any) => r.badges?.rule?.type === "persona");
      const mine = personaBadges.find((r: any) => r.badges.art_key === persona);
      const isNew = !!mine && Date.now() - new Date(mine.earned_at).getTime() < 10 * 60 * 1000;
      setEarned({ n: Math.max(1, personaBadges.length), isNew });
      const first = path?.weakest ?? path?.top ?? path?.stage_lesson;
      if (first?.id) setLessonTo(`/app/learn?lesson=${first.id}`);
    })();
  }, [user, persona]);

  // Auto open after 3.5 seconds, then run the timeline.
  useEffect(() => {
    if (phase !== "sealed") return;
    const t = setTimeout(() => setPhase("opening"), 3500);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (phase === "opening") { const t = setTimeout(() => setPhase("landed"), 1800); return () => clearTimeout(t); }
    if (phase === "landed") { const t = setTimeout(() => setPhase("badge"), 3500); return () => clearTimeout(t); }
  }, [phase]);

  if (!pp) return null;
  const color = personaColor(pp.color);
  const showCard = phase !== "sealed";
  const landed = phase === "landed" || phase === "badge" || phase === "final";
  const badgeIn = phase === "badge" || phase === "final";
  const lineDelay = (i: number) => (reduce ? 0 : 1.6 + i * 0.2);
  const sparkColors = [color, ps ? personaColor(ps.color) : "hsl(var(--primary))", "hsl(var(--primary))"];

  const share = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const canvas = await captureFlat(cardRef.current);
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("no image");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "my-uwazi-card.png"; a.click();
      toast.success("Your card was saved to your device.");
    } catch { toast.error("We could not make the picture. Try again."); }
    finally { setBusy(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 pack-glow overflow-y-auto overflow-x-hidden" data-testid="pack" data-phase={phase}>
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-10 gap-6">
        <div className="relative flex items-center justify-center" style={{ width: 320, height: 460 }}>
          {/* Beams */}
          {phase === "opening" && Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="pack-beam" style={{ ["--i" as any]: i, ["--r" as any]: `${-80 + i * 20}deg` }} aria-hidden />
          ))}

          {/* Sealed pack */}
          {(phase === "sealed" || phase === "opening") && (
            <motion.button type="button" aria-label="Open your pack" data-testid="pack-sealed"
              onClick={() => phase === "sealed" && setPhase("opening")}
              className="absolute" style={{ width: 220, height: 320 }}
              animate={phase === "opening" ? { y: 80, scale: 0.9, opacity: 0 } : {}}
              transition={{ duration: 0.9, ease: "easeIn" }}>
              <div className={`relative w-full h-full rounded-[18px] border border-primary/70 overflow-hidden ${phase === "sealed" ? "pack-float" : ""}`}
                style={{ background: "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--background)) 55%, hsl(var(--card)) 100%)", boxShadow: "0 30px 60px -20px hsl(var(--primary) / .35)" }}>
                <motion.div className="absolute top-0 inset-x-0 h-12 border-b-2 border-dashed border-primary/60"
                  style={{ background: "linear-gradient(90deg, hsl(var(--muted)), hsl(var(--card)), hsl(var(--muted)))", transformOrigin: "left bottom" }}
                  animate={phase === "opening" ? { y: -70, rotate: -18, opacity: 0 } : {}} transition={{ duration: 0.7, ease: "easeOut" }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pt-8">
                  <div className="h-20 w-20 rounded-full border-2 border-primary flex items-center justify-center bg-background/60">
                    <Compass className="h-10 w-10 text-primary" />
                  </div>
                  <p className="font-heading text-2xl text-foreground tracking-wide">CIVIC COMPASS</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">Your result</p>
                </div>
              </div>
            </motion.button>
          )}

          {/* The card */}
          {showCard && (
            <motion.div className="absolute" style={{ width: 300, height: 440 }}
              initial={reduce ? false : { y: 260, scale: 0.6, rotateY: -540, opacity: 0 }}
              animate={{ y: 0, scale: 1, rotateY: 0, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.3, ease: [0.2, 0.8, 0.2, 1], opacity: { duration: 0.3, delay: 0.3 } }}>
              {landed && !reduce && Array.from({ length: 14 }).map((_, i) => (
                <span key={i} className="pack-spark" aria-hidden
                  style={{ left: `${(i * 37) % 100}%`, bottom: `${(i * 23) % 40}%`, background: sparkColors[i % 3], ["--d" as any]: `${(i * 0.23).toFixed(2)}s` }} />
              ))}
              <TiltCard ref={cardRef} enabled={landed} className="w-full h-full rounded-[22px]" data-testid="pack-card"
                style={{ border: `2px solid ${color}`, background: "linear-gradient(165deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
                  boxShadow: `0 40px 80px -20px hsl(0 0% 0% / .7), 0 0 50px -10px ${personaColor(pp.color, 0.55)}` }}>
                {landed && !reduce && <div className="pack-shine" aria-hidden />}
                <div className="relative z-[1] h-full flex flex-col p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Civic persona</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ borderColor: color, color }}>No. {pp.sort_order} of 9</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    {landed && <CompassRose scores={scores} size={190} showIcons={false} draw={!reduce} />}
                  </div>
                  {landed && (
                    <div className="space-y-1 pr-12">
                      <motion.h2 initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: lineDelay(0) }}
                        className="font-heading text-[34px] leading-none" style={{ color }} data-testid="pack-name">{pp.name}</motion.h2>
                      {ps && <motion.p initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: lineDelay(1) }}
                        className="text-sm font-semibold" style={{ color: personaColor(ps.color) }}>with a {shortName(ps)} streak</motion.p>}
                      <motion.p initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: lineDelay(2) }}
                        className="text-xs text-foreground">{pp.one_line}</motion.p>
                      <motion.p initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: lineDelay(3) }}
                        className="text-[11px] text-muted-foreground">{[city, month].filter(Boolean).join(". ")}</motion.p>
                    </div>
                  )}
                  {/* Socket */}
                  <div className="absolute right-4 bottom-4 h-11 w-11 flex items-center justify-center" data-testid="badge-socket">
                    {!badgeIn && <span className="badge-socket absolute inset-0 rounded-full border-2 border-dashed" style={{ borderColor: color }} />}
                    {badgeIn && (
                      <span className="relative badge-drop" data-testid="socket-badge">
                        {!reduce && <span className="badge-shock" style={{ ["--shock" as any]: color }} />}
                        <PersonaBadge slug={pp.slug} size="chip" label={`${pp.name} badge`} />
                      </span>
                    )}
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          )}
        </div>

        {phase === "sealed" && <p className="pack-hint text-sm text-muted-foreground">Tap to open your pack</p>}

        {badgeIn && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.5 }}
            className="text-center space-y-3 max-w-sm" data-testid="pack-after">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">{earned.isNew ? "Badge earned" : "Your badge"}</p>
            <p className="text-foreground">
              {pp.name}. {earned.isNew
                ? earned.n === 1 ? "Your first of nine." : `Your ${ordinalWord(earned.n)} of nine.`
                : `You already have this one. ${earned.n} of nine so far.`}
            </p>
            {points > 0 && <span className="inline-block rounded-full bg-primary/15 text-primary text-sm font-bold px-3 py-1" data-testid="pack-points">+{points} points</span>}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <Button className="city-pulse" onClick={() => navigate(lessonTo)}>Start your first lesson</Button>
              <Button variant="outline" disabled={busy} onClick={share} data-testid="pack-share"><Share2 className="h-4 w-4 mr-1" /> Share</Button>
            </div>
            <button className="text-sm text-muted-foreground underline" onClick={onDone}>See my full results</button>
          </motion.div>
        )}
      </div>
    </div>,
    document.body,
  );
}
