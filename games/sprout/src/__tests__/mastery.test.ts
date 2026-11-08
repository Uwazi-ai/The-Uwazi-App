import { describe, expect, it } from "vitest";
import { dueAt, itemKey, masteryLevel, newlyMastered, pickItem, pickItems, recordAttempt, selectionWeight, summarizeSkill } from "../systems/mastery";
import type { MasteryItems } from "../types";

const now = 1_000_000_000;

describe("mastery records", () => {
  it("records attempts without mutating the previous map", () => {
    const before: MasteryItems = {};
    const after = recordAttempt(before, "counting", "4", true, now);
    expect(before).toEqual({});
    expect(after[itemKey("counting", "4")]).toEqual({ attempts: 1, correct: 1, lastSeen: now, streak: 1 });
  });

  it("resets the streak on a miss and keeps the attempt count", () => {
    let items = recordAttempt({}, "letterSounds", "b", true, now);
    items = recordAttempt(items, "letterSounds", "b", true, now + 1);
    items = recordAttempt(items, "letterSounds", "b", false, now + 2);
    expect(items["letterSounds:b"]).toEqual({ attempts: 3, correct: 2, lastSeen: now + 2, streak: 0 });
  });

  it("classifies new, learning, shaky and mastered items", () => {
    expect(masteryLevel(undefined)).toBe("new");
    expect(masteryLevel({ attempts: 1, correct: 1, lastSeen: now, streak: 1 })).toBe("learning");
    expect(masteryLevel({ attempts: 4, correct: 1, lastSeen: now, streak: 0 })).toBe("shaky");
    expect(masteryLevel({ attempts: 3, correct: 3, lastSeen: now, streak: 3 })).toBe("mastered");
    expect(masteryLevel({ attempts: 10, correct: 7, lastSeen: now, streak: 3 })).toBe("learning");
  });
});

describe("spaced repetition", () => {
  it("pushes review further out as the streak grows", () => {
    const short = dueAt({ attempts: 1, correct: 1, lastSeen: now, streak: 1 });
    const long = dueAt({ attempts: 5, correct: 5, lastSeen: now, streak: 5 });
    expect(long).toBeGreaterThan(short);
    expect(dueAt(undefined)).toBe(0);
  });

  it("weights shaky items above unseen items and far above fresh mastered items", () => {
    const shaky = selectionWeight({ attempts: 4, correct: 1, lastSeen: now, streak: 0 }, now + 1);
    const fresh = selectionWeight(undefined, now);
    const mastered = selectionWeight({ attempts: 3, correct: 3, lastSeen: now, streak: 3 }, now + 1);
    expect(shaky).toBeGreaterThan(fresh);
    expect(fresh).toBeGreaterThan(mastered);
  });

  it("brings mastered items back once they are due", () => {
    const record = { attempts: 3, correct: 3, lastSeen: now, streak: 3 };
    expect(selectionWeight(record, dueAt(record) + 1)).toBeGreaterThan(selectionWeight(record, now + 1));
  });

  it("picks the shaky item far more often than a mastered one", () => {
    const items: MasteryItems = {
      "numerals:3": { attempts: 4, correct: 1, lastSeen: now, streak: 0 },
      "numerals:7": { attempts: 3, correct: 3, lastSeen: now, streak: 3 },
    };
    let seed = 1;
    const rng = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
    const counts: Record<string, number> = { "3": 0, "7": 0 };
    for (let i = 0; i < 400; i += 1) counts[pickItem(items, "numerals", ["3", "7"], now + 1, rng)] += 1;
    expect(counts["3"]).toBeGreaterThan(counts["7"] * 5);
  });

  it("picks distinct items and respects exclusions", () => {
    const picks = pickItems({}, "colors", ["red", "blue", "gold"], 3, now, () => 0.99);
    expect(new Set(picks).size).toBe(3);
    expect(pickItem({}, "colors", ["red", "blue"], now, () => 0, ["red"])).toBe("blue");
  });
});

describe("skill summaries", () => {
  it("counts levels per skill and lists shaky items", () => {
    const items: MasteryItems = {
      "rhyming:cat": { attempts: 4, correct: 1, lastSeen: now, streak: 0 },
      "rhyming:sun": { attempts: 3, correct: 3, lastSeen: now, streak: 3 },
      "rhyming:dog": { attempts: 1, correct: 1, lastSeen: now, streak: 1 },
      "colors:red": { attempts: 2, correct: 2, lastSeen: now, streak: 2 },
    };
    const summary = summarizeSkill(items, "rhyming");
    expect(summary).toMatchObject({ seen: 3, mastered: 1, shaky: 1, learning: 1, shakyItems: ["cat"] });
    expect(summary.accuracy).toBeCloseTo(5 / 8);
  });

  it("detects items that just became mastered", () => {
    const before: MasteryItems = { "shapes:circle": { attempts: 2, correct: 2, lastSeen: now, streak: 2 } };
    const after = recordAttempt(before, "shapes", "circle", true, now + 1);
    expect(newlyMastered(before, after)).toEqual(["shapes:circle"]);
    expect(newlyMastered(after, after)).toEqual([]);
  });
});
