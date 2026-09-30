import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PersonaBadge, PERSONA_PATHS } from "@/components/compass/PersonaBadge";

const db = supabase as any;
export const BADGE_CHECK_EVENT = "uwazi:badges-check";
/** Ask the watcher to look for new badges now, for example right after a lesson. */
export const checkBadgesNow = () => window.dispatchEvent(new Event(BADGE_CHECK_EVENT));

interface B { id: string; name: string; description: string | null; art_key: string | null; emoji: string | null }

/** Badge drop overlay: socket pulse, drop with a bounce, shockwave, and "Badge earned". Tap to close. */
export function BadgeEarned({ badge, onClose }: { badge: B; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [dropped, setDropped] = useState(!!reduce);
  useEffect(() => { if (reduce) return; const t = setTimeout(() => setDropped(true), 700); return () => clearTimeout(t); }, [reduce]);
  const persona = badge.art_key && PERSONA_PATHS[badge.art_key];
  return (
    <div role="dialog" aria-label={`Badge earned. ${badge.name}.`} data-testid="badge-earned"
      className="fixed inset-0 z-[60] bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center gap-5 px-6 text-center cursor-pointer"
      onClick={onClose}>
      <div className="relative h-24 w-24 flex items-center justify-center">
        {!dropped && <span className="badge-socket absolute inset-0 rounded-full border-2 border-dashed border-primary" />}
        {dropped && (
          <span className="relative badge-drop">
            {!reduce && <span className="badge-shock" />}
            {persona ? <PersonaBadge slug={badge.art_key!} size="medallion" label={`${badge.name} badge`} /> : (
              <span className="h-20 w-20 rounded-full border-2 border-primary bg-primary/15 flex items-center justify-center text-4xl">
                {badge.emoji ?? <Award className="h-10 w-10 text-primary" />}
              </span>
            )}
          </span>
        )}
      </div>
      {dropped && (
        <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.4 }} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Badge earned</p>
          <p className="font-heading text-3xl text-foreground">{badge.name}</p>
          {badge.description && <p className="text-sm text-muted-foreground max-w-xs">{badge.description}</p>}
          <p className="text-xs text-muted-foreground pt-2">Tap anywhere to keep going.</p>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Watches for newly earned badges and plays the overlay over any screen.
 * Persona badges are skipped because the Compass pack opening shows them.
 */
export function BadgeWatcher() {
  const { user } = useAuth();
  const location = useLocation();
  const [queue, setQueue] = useState<B[]>([]);
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (!user || busy.current) return;
    busy.current = true;
    try {
      const key = `uwazi-seen-badges-${user.id}`;
      const { data } = await db.from("user_badges").select("badges(id, name, description, art_key, emoji, rule)").eq("user_id", user.id);
      const all: (B & { rule: any })[] = (data ?? []).map((r: any) => r.badges).filter(Boolean);
      const raw = localStorage.getItem(key);
      const seen = new Set<string>(raw ? JSON.parse(raw) : []);
      if (raw) {
        const fresh = all.filter((b) => !seen.has(b.id) && b.rule?.type !== "persona");
        if (fresh.length) setQueue((q) => [...q, ...fresh]);
      }
      localStorage.setItem(key, JSON.stringify(all.map((b) => b.id)));
    } finally { busy.current = false; }
  }, [user]);

  useEffect(() => { check(); }, [check, location.pathname]);
  useEffect(() => {
    const h = () => { setTimeout(check, 400); };
    window.addEventListener(BADGE_CHECK_EVENT, h);
    const iv = setInterval(check, 30000);
    return () => { window.removeEventListener(BADGE_CHECK_EVENT, h); clearInterval(iv); };
  }, [check]);

  if (!queue.length) return null;
  return <BadgeEarned key={queue[0].id} badge={queue[0]} onClose={() => setQueue((q) => q.slice(1))} />;
}
