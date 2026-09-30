import { useEffect, useState } from "react";
import { Landmark, Briefcase, ShieldCheck, Home, GraduationCap, HeartPulse, Bus, Vote, Compass, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, useReducedMotion } from "framer-motion";
import { PersonaBadge } from "@/components/compass/PersonaBadge";

export interface Persona {
  suggested_prompts?: string[];
  slug: string; name: string; top_dimension_slug: string | null; one_line: string; strength: string;
  blind_spot: string; color: string; icon_key: string; next_step_lean: string; sort_order: number;
}

export const PERSONA_ICONS: Record<string, LucideIcon> = {
  landmark: Landmark, briefcase: Briefcase, shield: ShieldCheck, home: Home, graduation: GraduationCap,
  heart: HeartPulse, bus: Bus, vote: Vote, compass: Compass,
};

/** Plain topic word used in greetings. */
export const PERSONA_TOPIC: Record<string, string> = {
  watchdog: "accountability", builder: "jobs", guardian: "safety", neighbor: "housing", mentor: "schools",
  caretaker: "health", connector: "getting around", organizer: "voting and taking part", steward: "the issues you care about",
};

export const personaColor = (color?: string | null, alpha = 1) =>
  `hsl(var(--persona-${color || "silver"}) / ${alpha})`;

/** Short name without "The", for "with a Builder streak". */
export const shortName = (p?: Persona | null) => (p?.name ?? "").replace(/^The\s+/i, "");

let cache: Persona[] | null = null;
let pending: Promise<Persona[]> | null = null;
export function loadPersonas(force = false): Promise<Persona[]> {
  if (cache && !force) return Promise.resolve(cache);
  if (!pending || force) {
    pending = (supabase as any).from("compass_personas").select("*").order("sort_order")
      .then(({ data }: any) => { cache = data ?? []; pending = null; return cache!; });
  }
  return pending!;
}

export function usePersonas() {
  const [list, setList] = useState<Persona[]>(cache ?? []);
  useEffect(() => { loadPersonas().then(setList); }, []);
  const bySlug = (s?: string | null) => list.find((p) => p.slug === s) ?? null;
  const byDim = (d?: string | null) => list.find((p) => p.top_dimension_slug === d) ?? null;
  return { list, bySlug, byDim, reload: () => loadPersonas(true).then(setList) };
}

export interface PersonaState { persona: string | null; streak: string | null; evidence: string | null }

/** Name, streak, one line, evidence. Used on the Compass results. */
export function PersonaHeadline({ state, size = "lg" }: { state: PersonaState; size?: "lg" | "md" }) {
  const { bySlug } = usePersonas();
  const reduce = useReducedMotion();
  const p = bySlug(state.persona);
  const s = bySlug(state.streak);
  if (!p) return null;
  return (
    <div className="space-y-1.5 text-center" data-testid="persona-headline">
      {size === "lg" && (
        <motion.div className="flex justify-center pb-1" initial={reduce ? false : { scale: 0.6 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}>
          <PersonaBadge slug={p.slug} size="medallion" label={`${p.name} badge`} />
        </motion.div>
      )}
      <h2 className={`font-heading ${size === "lg" ? "text-4xl" : "text-3xl"} leading-tight`} style={{ color: personaColor(p.color) }} data-testid="persona-name">{p.name}</h2>
      {s && <p className="text-sm font-semibold" style={{ color: personaColor(s.color) }} data-testid="persona-streak">with a {shortName(s)} streak</p>}
      <p className="text-foreground">{p.one_line}</p>
      {state.evidence && <p className="text-sm text-muted-foreground" data-testid="persona-evidence">{state.evidence}</p>}
    </div>
  );
}
