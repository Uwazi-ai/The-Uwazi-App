import type { MasteryItems, MasteryLevel, SkillId, SkillItemRecord } from "../types";

export const itemKey = (skill: SkillId, item: string) => `${skill}:${item}`;

const MINUTE = 60_000;
/** Review gaps by streak length: items he keeps getting right come back later and later. */
export const REVIEW_INTERVALS_MS = [MINUTE, 5 * MINUTE, 30 * MINUTE, 24 * 60 * MINUTE, 3 * 24 * 60 * MINUTE, 7 * 24 * 60 * MINUTE];

export const emptyRecord = (): SkillItemRecord => ({ attempts: 0, correct: 0, lastSeen: 0, streak: 0 });

export function accuracy(record: SkillItemRecord | undefined): number {
  if (!record || record.attempts === 0) return 0;
  return record.correct / record.attempts;
}

export function masteryLevel(record: SkillItemRecord | undefined): MasteryLevel {
  if (!record || record.attempts === 0) return "new";
  if (record.attempts >= 3 && record.streak >= 3 && accuracy(record) >= 0.8) return "mastered";
  if (record.attempts >= 2 && accuracy(record) < 0.5) return "shaky";
  return "learning";
}

/** Returns a new items map with one attempt recorded. Never mutates the input. */
export function recordAttempt(items: MasteryItems, skill: SkillId, item: string, correct: boolean, now: number): MasteryItems {
  const key = itemKey(skill, item);
  const previous = items[key] ?? emptyRecord();
  const next: SkillItemRecord = {
    attempts: previous.attempts + 1,
    correct: previous.correct + (correct ? 1 : 0),
    lastSeen: now,
    streak: correct ? previous.streak + 1 : 0,
  };
  return { ...items, [key]: next };
}

/** When an item is due for review. Unseen items are always due. */
export function dueAt(record: SkillItemRecord | undefined): number {
  if (!record || record.attempts === 0) return 0;
  const gap = REVIEW_INTERVALS_MS[Math.min(record.streak, REVIEW_INTERVALS_MS.length - 1)];
  return record.lastSeen + gap;
}

/**
 * Selection weight for spaced repetition. Shaky items weigh the most, mastered items that are
 * not yet due weigh the least, and unseen items sit in between so new material keeps arriving.
 */
export function selectionWeight(record: SkillItemRecord | undefined, now: number): number {
  const level = masteryLevel(record);
  if (level === "new") return 2;
  const overdue = now >= dueAt(record);
  if (level === "mastered") return overdue ? 1 : 0.25;
  if (level === "shaky") return overdue ? 5 : 3;
  return overdue ? 3 : 1.5;
}

/** Picks one item from the pool using weighted random choice; rng returns [0, 1). */
export function pickItem(items: MasteryItems, skill: SkillId, pool: string[], now: number, rng: () => number = Math.random, exclude: string[] = []): string {
  const candidates = pool.filter(item => !exclude.includes(item));
  const list = candidates.length ? candidates : pool;
  const weights = list.map(item => selectionWeight(items[itemKey(skill, item)], now));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let index = 0; index < list.length; index += 1) {
    roll -= weights[index];
    if (roll < 0) return list[index];
  }
  return list[list.length - 1];
}

/** Picks n distinct items, most shaky first. */
export function pickItems(items: MasteryItems, skill: SkillId, pool: string[], count: number, now: number, rng: () => number = Math.random): string[] {
  const chosen: string[] = [];
  while (chosen.length < Math.min(count, pool.length)) chosen.push(pickItem(items, skill, pool, now, rng, chosen));
  return chosen;
}

export interface SkillSummary {
  skill: SkillId;
  seen: number;
  mastered: number;
  shaky: number;
  learning: number;
  accuracy: number;
  shakyItems: string[];
}

export function summarizeSkill(items: MasteryItems, skill: SkillId): SkillSummary {
  const prefix = `${skill}:`;
  const summary: SkillSummary = { skill, seen: 0, mastered: 0, shaky: 0, learning: 0, accuracy: 0, shakyItems: [] };
  let attempts = 0, correct = 0;
  for (const [key, record] of Object.entries(items)) {
    if (!key.startsWith(prefix)) continue;
    summary.seen += 1;
    attempts += record.attempts;
    correct += record.correct;
    const level = masteryLevel(record);
    if (level === "mastered") summary.mastered += 1;
    else if (level === "shaky") { summary.shaky += 1; summary.shakyItems.push(key.slice(prefix.length)); }
    else summary.learning += 1;
  }
  summary.accuracy = attempts ? correct / attempts : 0;
  return summary;
}

/** Items that just crossed into mastered between two snapshots. */
export function newlyMastered(before: MasteryItems, after: MasteryItems): string[] {
  return Object.keys(after).filter(key => masteryLevel(after[key]) === "mastered" && masteryLevel(before[key]) !== "mastered");
}

export const SKILL_LABELS: Record<SkillId, string> = {
  counting: "Counting 1 to 20", numerals: "Numbers", adding: "Adding to 10", subtracting: "Taking away",
  letterNames: "Letter names", letterSounds: "Letter sounds", beginningSounds: "Beginning sounds", rhyming: "Rhyming",
  cvcWords: "Short words", sightWords: "Sight words", shapes: "Shapes", colors: "Colors", patterns: "Patterns",
  positional: "Over, under, left, right", directions: "Following directions", memory: "Memory and sequencing",
};
