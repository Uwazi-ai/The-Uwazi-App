import type { GameId, LevelResult, SaveData, Trophy } from "../types";
import { CAPE_UNLOCKS } from "../config";

export const RANKS = [
  { name: "Rookie", xp: 0 },
  { name: "Hero", xp: 200 },
  { name: "Super Kaleb", xp: 600 },
  { name: "Legend", xp: 1500 },
] as const;

export type Stars = 1 | 2 | 3;

/** Finishing always earns a star. Accuracy and hints decide the rest. */
export function starsFor(correct: number, total: number, hintsShown: number): Stars {
  if (total <= 0) return 1;
  const ratio = correct / total;
  if (ratio >= 0.9 && hintsShown === 0) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
}

export function xpForLevel(stars: Stars, levelIndex: number): number {
  return 20 + stars * 10 + levelIndex * 5;
}

export function rankIndex(xp: number): number {
  let index = 0;
  RANKS.forEach((rank, i) => { if (xp >= rank.xp) index = i; });
  return index;
}

export const rankName = (xp: number) => RANKS[rankIndex(xp)].name;

/** Progress toward the next rank, 0..1. Legends stay full. */
export function rankProgress(xp: number): number {
  const index = rankIndex(xp);
  if (index >= RANKS.length - 1) return 1;
  const from = RANKS[index].xp, to = RANKS[index + 1].xp;
  return Math.min(1, Math.max(0, (xp - from) / (to - from)));
}

export const nextRankXp = (xp: number) => RANKS[Math.min(RANKS.length - 1, rankIndex(xp) + 1)].xp;

export const unlockedCapes = (xp: number) => CAPE_UNLOCKS.slice(0, rankIndex(xp) + 1);

export interface LevelOutcome {
  save: SaveData;
  stars: Stars;
  xpEarned: number;
  rankedUp: boolean;
  newRecord: boolean;
  newTrophy: Trophy | null;
}

/** Applies a finished level to a save. Pure: returns a new SaveData. */
export function applyLevelResult(save: SaveData, gameId: GameId, levelIndex: number, correct: number, total: number, hintsShown: number, now: number, trophyTitle?: string): LevelOutcome {
  const stars = starsFor(correct, total, hintsShown);
  const xpEarned = xpForLevel(stars, levelIndex);
  const rankBefore = rankIndex(save.xp);
  const score = total ? Math.round((correct / total) * 100) : 100;
  const key = String(levelIndex);
  const gameLevels = { ...(save.games[gameId] ?? {}) };
  const previous: LevelResult | undefined = gameLevels[key];
  const newRecord = !!previous && score > previous.bestScore;
  gameLevels[key] = {
    stars: Math.max(stars, previous?.stars ?? 1) as Stars,
    bestScore: Math.max(score, previous?.bestScore ?? 0),
    plays: (previous?.plays ?? 0) + 1,
  };
  const trophyId = `${gameId}:${levelIndex}`;
  const newTrophy: Trophy | null = stars === 3 && !save.trophies.some(t => t.id === trophyId)
    ? { id: trophyId, gameId, title: trophyTitle ?? `${gameId} level ${levelIndex + 1}`, earnedAt: now }
    : null;
  const xp = save.xp + xpEarned;
  const next: SaveData = {
    ...save,
    updatedAt: now,
    xp,
    games: { ...save.games, [gameId]: gameLevels },
    trophies: newTrophy ? [...save.trophies, newTrophy] : save.trophies,
  };
  return { save: next, stars, xpEarned, rankedUp: rankIndex(xp) > rankBefore, newRecord, newTrophy };
}

export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Daily hero streak: consecutive days with at least one play. */
export function updateStreak(streak: SaveData["streak"], today: string, yesterday: string): SaveData["streak"] {
  if (streak.lastDay === today) return streak;
  const count = streak.lastDay === yesterday ? streak.count + 1 : 1;
  return { lastDay: today, count, best: Math.max(streak.best, count) };
}

export const totalStars = (save: SaveData) => Object.values(save.games).reduce((sum, levels) => sum + Object.values(levels).reduce((s, l) => s + l.stars, 0), 0);

/** Highest level unlocked for a game: every finished level plus one. */
export function unlockedLevels(save: SaveData, gameId: GameId, levelCount: number): number {
  const done = Object.keys(save.games[gameId] ?? {}).map(Number);
  const highest = done.length ? Math.max(...done) : -1;
  return Math.min(levelCount, highest + 2);
}

export const PRAISE = [
  "Great job, Super {name}!", "You did it, hero!", "Super strong brain!", "Wow, {name}! Amazing!", "That was heroic!",
];
export const TRY_AGAIN = ["Try again, hero!", "Almost! Let's look again.", "Heroes keep trying!", "You can do it, {name}!"];

export const pickPhrase = (list: readonly string[], name: string, rng: () => number = Math.random) =>
  list[Math.floor(rng() * list.length)].replace("{name}", name);
