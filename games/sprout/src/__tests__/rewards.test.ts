import { describe, expect, it } from "vitest";
import { applyLevelResult, pickPhrase, PRAISE, rankIndex, rankName, rankProgress, starsFor, unlockedCapes, unlockedLevels, updateStreak, xpForLevel } from "../systems/rewards";
import { emptySave } from "../types";

describe("stars and xp", () => {
  it("always gives at least one star and three only for a clean run", () => {
    expect(starsFor(0, 5, 0)).toBe(1);
    expect(starsFor(3, 5, 0)).toBe(2);
    expect(starsFor(5, 5, 0)).toBe(3);
    expect(starsFor(5, 5, 1)).toBe(2);
    expect(starsFor(0, 0, 0)).toBe(1);
  });

  it("gives more xp for more stars and later levels", () => {
    expect(xpForLevel(1, 0)).toBeLessThan(xpForLevel(3, 0));
    expect(xpForLevel(2, 0)).toBeLessThan(xpForLevel(2, 4));
  });
});

describe("ranks", () => {
  it("moves Rookie to Hero to Super Kaleb to Legend", () => {
    expect(rankName(0)).toBe("Rookie");
    expect(rankName(200)).toBe("Hero");
    expect(rankName(600)).toBe("Super Kaleb");
    expect(rankName(5000)).toBe("Legend");
    expect(rankProgress(100)).toBeCloseTo(0.5);
    expect(rankProgress(5000)).toBe(1);
  });

  it("unlocks one cape colour per rank", () => {
    expect(unlockedCapes(0)).toHaveLength(1);
    expect(unlockedCapes(600)).toHaveLength(3);
  });
});

describe("applyLevelResult", () => {
  it("records stars, xp, trophies and new records without mutating the input", () => {
    const save = emptySave();
    const first = applyLevelResult(save, "dino-egg-hunt", 0, 3, 5, 0, 1000, "Egg Cracker");
    expect(save.xp).toBe(0);
    expect(first.stars).toBe(2);
    expect(first.save.xp).toBe(xpForLevel(2, 0));
    expect(first.newTrophy).toBeNull();
    expect(first.save.games["dino-egg-hunt"]["0"]).toEqual({ stars: 2, bestScore: 60, plays: 1 });

    const second = applyLevelResult(first.save, "dino-egg-hunt", 0, 5, 5, 0, 2000, "Egg Cracker");
    expect(second.newRecord).toBe(true);
    expect(second.newTrophy?.title).toBe("Egg Cracker");
    expect(second.save.games["dino-egg-hunt"]["0"]).toEqual({ stars: 3, bestScore: 100, plays: 2 });

    const third = applyLevelResult(second.save, "dino-egg-hunt", 0, 5, 5, 0, 3000, "Egg Cracker");
    expect(third.newTrophy).toBeNull();
    expect(third.save.trophies).toHaveLength(1);
  });

  it("reports a rank up when xp crosses a threshold", () => {
    const save = { ...emptySave(), xp: 190 };
    const outcome = applyLevelResult(save, "rhyme-roar", 2, 5, 5, 0, 1);
    expect(outcome.rankedUp).toBe(true);
    expect(rankIndex(outcome.save.xp)).toBe(1);
  });
});

describe("streaks and unlocks", () => {
  it("extends a streak on consecutive days and restarts after a gap", () => {
    const day1 = updateStreak({ lastDay: "", count: 0, best: 0 }, "2026-11-07", "2026-11-06");
    expect(day1).toEqual({ lastDay: "2026-11-07", count: 1, best: 1 });
    const day2 = updateStreak(day1, "2026-11-08", "2026-11-07");
    expect(day2.count).toBe(2);
    expect(updateStreak(day2, "2026-11-08", "2026-11-07")).toBe(day2);
    const gap = updateStreak(day2, "2026-11-12", "2026-11-11");
    expect(gap).toEqual({ lastDay: "2026-11-12", count: 1, best: 2 });
  });

  it("unlocks the next level after each finished one, up to the level count", () => {
    const save = emptySave();
    expect(unlockedLevels(save, "letter-racer", 5)).toBe(1);
    save.games["letter-racer"] = { "0": { stars: 1, bestScore: 50, plays: 1 }, "1": { stars: 2, bestScore: 80, plays: 1 } };
    expect(unlockedLevels(save, "letter-racer", 5)).toBe(3);
    save.games["letter-racer"]["4"] = { stars: 3, bestScore: 100, plays: 1 };
    expect(unlockedLevels(save, "letter-racer", 5)).toBe(5);
  });

  it("fills the hero's name into praise", () => {
    expect(pickPhrase(PRAISE, "Kaleb", () => 0)).toBe("Great job, Super Kaleb!");
  });
});
