import { Landmark, Vote, ShieldCheck, Home, Bus, GraduationCap, HeartPulse, Briefcase, type LucideIcon } from "lucide-react";

export interface DimMeta { slug: string; short: string; color: string; Icon: LucideIcon }

// Fixed order around the compass rose, clockwise from the top.
export const DIM_ORDER: DimMeta[] = [
  { slug: "local-accountability", short: "Accountability", color: "hsl(var(--dim-accountability))", Icon: Landmark },
  { slug: "civic-participation", short: "Participation", color: "hsl(var(--dim-participation))", Icon: Vote },
  { slug: "public-safety", short: "Safety", color: "hsl(var(--dim-safety))", Icon: ShieldCheck },
  { slug: "housing-development", short: "Housing", color: "hsl(var(--dim-housing))", Icon: Home },
  { slug: "infrastructure-mobility", short: "Getting around", color: "hsl(var(--dim-transit))", Icon: Bus },
  { slug: "education-youth", short: "Schools", color: "hsl(var(--dim-education))", Icon: GraduationCap },
  { slug: "health-wellbeing", short: "Health", color: "hsl(var(--dim-health))", Icon: HeartPulse },
  { slug: "economic-opportunity", short: "Jobs", color: "hsl(var(--dim-economy))", Icon: Briefcase },
];

export const dimMeta = (slug: string) => DIM_ORDER.find((d) => d.slug === slug) ?? DIM_ORDER[0];

export function stageColor(stage?: string | null) {
  switch ((stage ?? "").toLowerCase()) {
    case "informed": return "hsl(var(--stage-informed))";
    case "engaged": return "hsl(var(--stage-engaged))";
    case "leader": return "hsl(var(--stage-leader))";
    default: return "hsl(var(--stage-getting-started))";
  }
}

export function topSlugs(scores: Record<string, number> | null | undefined, n = 3) {
  return Object.entries(scores ?? {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([s]) => s);
}
