import snapshot from "./compassOfflineCatalog.json";
import type { DemoLabels } from "./compassDemo";

// Public content only. No answers, sessions or completion records are cached here.
export const offlineCatalog = snapshot;
export const offlineEvents = [{ slug: "expo-oct-19", label: "Freshman Career Expo", startsAt: "2026-10-19T12:22:07.029245Z", expiresAt: "2026-10-20T04:59:00Z" }];
export function offlineEvent(slug: string, now = Date.now()) {
  return offlineEvents.find(event => event.slug === slug && now >= Date.parse(event.startsAt) && now < Date.parse(event.expiresAt)) ?? null;
}

// Display-only mirror of persona_label. Never used for normal Compass or access.
export function offlinePersonaLabels(scores: Record<string, number>, catalog = offlineCatalog): DemoLabels {
  const ranked = catalog.dimensions.filter(d => typeof scores[d.slug] === "number").sort((a, b) => scores[b.slug] - scores[a.slug]);
  const [first, second] = ranked;
  const balanced = first && second && Math.round(Math.abs(scores[first.slug] - scores[second.slug]) * 1000) <= 50;
  const words: Record<string, string> = { "local-accountability": "accountability", "economic-opportunity": "opportunity", "public-safety": "safety", "housing-development": "housing", "education-youth": "schools", "health-wellbeing": "health", "infrastructure-mobility": "getting around", "civic-participation": "your voice" };
  const leads = ranked.filter(d => scores[d.slug] >= 0.6).slice(0, 2).map(d => words[d.slug] ?? d.name.toLowerCase());
  const phrase = leads.join(" and ");
  const primary = balanced ? "Balanced across issues" : !leads.length ? "Sees many sides" : phrase.charAt(0).toUpperCase() + phrase.slice(1) + (leads.length === 1 ? " first" : "");
  return { primary, persona: balanced || !first ? "steward" : catalog.personas.find(p => p.top_dimension_slug === first.slug)?.slug ?? "steward", streak: !balanced && second && scores[second.slug] >= 0.6 ? catalog.personas.find(p => p.top_dimension_slug === second.slug)?.slug ?? null : null };
}