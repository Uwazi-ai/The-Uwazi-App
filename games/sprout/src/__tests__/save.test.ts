import { describe, expect, it, vi } from "vitest";
import { LOCAL_KEY, mergeSaves, normalizeSave, SaveStore } from "../systems/save";
import { emptySave, type SaveData, type SproutHost } from "../types";

const memoryStorage = () => {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }, map };
};

const host = (overrides: Partial<SproutHost> = {}): SproutHost => ({
  loadSave: async () => null,
  saveProgress: async () => {},
  logParentEvent: async () => {},
  getVoiceClipUrl: async () => null,
  getFacePhotoUrl: async () => null,
  openGrownUpTools: () => {},
  exit: () => {},
  ...overrides,
});

describe("mergeSaves", () => {
  it("keeps the best of both devices", () => {
    const a: SaveData = { ...emptySave(), updatedAt: 10, xp: 50, mastery: { "counting:3": { attempts: 2, correct: 2, lastSeen: 5, streak: 2 } }, games: { "dino-egg-hunt": { "0": { stars: 2, bestScore: 60, plays: 1 } } }, trophies: [{ id: "x", gameId: "dino-egg-hunt", title: "x", earnedAt: 1 }] };
    const b: SaveData = { ...emptySave(), updatedAt: 20, xp: 40, mastery: { "counting:3": { attempts: 5, correct: 3, lastSeen: 15, streak: 0 }, "colors:red": { attempts: 1, correct: 1, lastSeen: 15, streak: 1 } }, games: { "dino-egg-hunt": { "0": { stars: 3, bestScore: 50, plays: 2 }, "1": { stars: 1, bestScore: 20, plays: 1 } } }, settings: { ...emptySave().settings, voice: "myke" } };
    const merged = mergeSaves(a, b);
    expect(merged.xp).toBe(50);
    expect(merged.settings.voice).toBe("myke");
    expect(merged.mastery["counting:3"].attempts).toBe(5);
    expect(merged.mastery["colors:red"]).toBeDefined();
    expect(merged.games["dino-egg-hunt"]["0"]).toEqual({ stars: 3, bestScore: 60, plays: 2 });
    expect(merged.games["dino-egg-hunt"]["1"].stars).toBe(1);
    expect(merged.trophies).toHaveLength(1);
  });

  it("handles missing sides", () => {
    const a = { ...emptySave(), xp: 9 };
    expect(mergeSaves(a, null).xp).toBe(9);
    expect(mergeSaves(null, a).xp).toBe(9);
    expect(mergeSaves(null, null).xp).toBe(0);
  });
});

describe("normalizeSave", () => {
  it("rejects junk and fills defaults", () => {
    expect(normalizeSave(null)).toBeNull();
    expect(normalizeSave("nope")).toBeNull();
    const fixed = normalizeSave({ xp: -4, settings: { voice: "robot" }, mastery: "bad" });
    expect(fixed?.xp).toBe(0);
    expect(fixed?.mastery).toEqual({});
    expect(fixed?.settings.voice).toBe("robot");
    expect(fixed?.settings.sound).toBe(true);
  });
});

describe("SaveStore", () => {
  it("writes locally at once and remotely after the debounce", async () => {
    const storage = memoryStorage();
    const saveProgress = vi.fn(async () => {});
    let pending: (() => void) | null = null;
    const store = new SaveStore(host({ saveProgress, storage }), { debounceMs: 10, setTimer: fn => { pending = fn; return 1; }, clearTimer: () => {} });
    store.update(data => ({ ...data, xp: 30 }));
    expect(JSON.parse(storage.map.get(LOCAL_KEY)!).xp).toBe(30);
    expect(saveProgress).not.toHaveBeenCalled();
    pending!();
    await Promise.resolve(); await Promise.resolve();
    expect(saveProgress).toHaveBeenCalledTimes(1);
  });

  it("stays dirty when the remote write fails and retries on flush", async () => {
    const storage = memoryStorage();
    let fail = true;
    const saveProgress = vi.fn(async () => { if (fail) throw new Error("offline"); });
    const store = new SaveStore(host({ saveProgress, storage }), { setTimer: () => 1, clearTimer: () => {} });
    store.update(data => ({ ...data, xp: 12 }));
    expect(await store.flush()).toBe(false);
    expect(store.isDirty).toBe(true);
    fail = false;
    expect(await store.flush()).toBe(true);
    expect(store.isDirty).toBe(false);
  });

  it("hydrates by merging the remote save with the local one", async () => {
    const storage = memoryStorage();
    storage.setItem(LOCAL_KEY, JSON.stringify({ ...emptySave(), updatedAt: 5, xp: 70 }));
    const remote = { ...emptySave(), updatedAt: 9, xp: 20, settings: { ...emptySave().settings, music: false } };
    const saveProgress = vi.fn(async () => {});
    const store = new SaveStore(host({ loadSave: async () => remote, saveProgress, storage }), { setTimer: () => 1, clearTimer: () => {} });
    const data = await store.hydrate();
    expect(data.xp).toBe(70);
    expect(data.settings.music).toBe(false);
    expect(saveProgress).toHaveBeenCalled();
  });
});
