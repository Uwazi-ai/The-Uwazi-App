import type { ParentEvent } from "../types";
import { SKILL_LABELS } from "./mastery";
import type { SkillId } from "../types";
export { dayKey, updateStreak } from "./rewards";

/** Turns mastery keys like "rhyming:cat" into one friendly parent event. */
export function newlyMasteredAnnouncement(name: string, keys: string[]): ParentEvent {
  const groups = new Map<string, string[]>();
  for (const key of keys) {
    const [skill, item] = key.split(":");
    const label = SKILL_LABELS[skill as SkillId] ?? skill;
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  const parts = Array.from(groups.entries()).map(([label, items]) => `${label}: ${items.join(", ")}`);
  return { kind: "skill_mastered", title: `${name} mastered something new!`, body: parts.join(" · ") };
}
