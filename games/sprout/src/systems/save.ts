import { emptySave, SAVE_VERSION, type SaveData, type SproutHost } from "../types";

export const LOCAL_KEY = "sprout:save:v1";

/** Merges two saves so neither device loses progress. Pure. */
export function mergeSaves(a: SaveData | null, b: SaveData | null): SaveData {
  if (!a) return b ?? emptySave();
  if (!b) return a;
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const older = newer === a ? b : a;
  const mastery = { ...older.mastery };
  for (const [key, record] of Object.entries(newer.mastery)) {
    const other = mastery[key];
    mastery[key] = !other || record.attempts >= other.attempts ? record : other;
  }
  const games: SaveData["games"] = {};
  for (const gameId of new Set([...Object.keys(a.games), ...Object.keys(b.games)])) {
    const levels: SaveData["games"][string] = {};
    const la = a.games[gameId] ?? {}, lb = b.games[gameId] ?? {};
    for (const level of new Set([...Object.keys(la), ...Object.keys(lb)])) {
      const ra = la[level], rb = lb[level];
      if (!ra) levels[level] = rb; else if (!rb) levels[level] = ra;
      else levels[level] = { stars: Math.max(ra.stars, rb.stars) as 1 | 2 | 3, bestScore: Math.max(ra.bestScore, rb.bestScore), plays: Math.max(ra.plays, rb.plays) };
    }
    games[gameId] = levels;
  }
  const trophies = [...newer.trophies];
  for (const trophy of older.trophies) if (!trophies.some(t => t.id === trophy.id)) trophies.push(trophy);
  return {
    ...newer,
    version: SAVE_VERSION,
    mastery,
    games,
    xp: Math.max(a.xp, b.xp),
    timePlayedMs: Math.max(a.timePlayedMs, b.timePlayedMs),
    streak: a.streak.count >= b.streak.count ? a.streak : b.streak,
    trophies,
    masteredAnnounced: Array.from(new Set([...a.masteredAnnounced, ...b.masteredAnnounced])),
  };
}

/** Shape check for anything read from storage or the network. */
export function normalizeSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== "object") return null;
  const base = emptySave();
  const data = raw as Partial<SaveData>;
  return {
    ...base,
    ...data,
    version: SAVE_VERSION,
    mastery: data.mastery && typeof data.mastery === "object" ? data.mastery : {},
    games: data.games && typeof data.games === "object" ? data.games : {},
    settings: { ...base.settings, ...(data.settings ?? {}) },
    hero: { ...base.hero, ...(data.hero ?? {}) },
    streak: { ...base.streak, ...(data.streak ?? {}) },
    trophies: Array.isArray(data.trophies) ? data.trophies : [],
    masteredAnnounced: Array.isArray(data.masteredAnnounced) ? data.masteredAnnounced : [],
    xp: typeof data.xp === "number" && Number.isFinite(data.xp) ? Math.max(0, data.xp) : 0,
    timePlayedMs: typeof data.timePlayedMs === "number" ? Math.max(0, data.timePlayedMs) : 0,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
  };
}

export interface SaveStoreOptions {
  debounceMs?: number;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

/**
 * Local-first save store. Writes go to local storage at once and to the host after a short
 * debounce; a failed remote write stays dirty and retries on flush() or when the browser comes online.
 */
export class SaveStore {
  data: SaveData;
  private dirty = false;
  private timer: unknown = null;
  private readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  private readonly debounceMs: number;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;
  private listeners = new Set<(data: SaveData) => void>();
  private remoteBusy: Promise<void> | null = null;

  constructor(private readonly host: SproutHost, options: SaveStoreOptions = {}) {
    this.storage = host.storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
    this.debounceMs = options.debounceMs ?? 1500;
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? (handle => clearTimeout(handle as number));
    this.data = this.readLocal() ?? emptySave();
  }

  private readLocal(): SaveData | null {
    try { return normalizeSave(JSON.parse(this.storage?.getItem(LOCAL_KEY) ?? "null")); } catch { return null; }
  }

  private writeLocal() {
    try { this.storage?.setItem(LOCAL_KEY, JSON.stringify(this.data)); } catch { /* storage may be full or blocked */ }
  }

  /** Loads the remote save and merges it with whatever is on this device. */
  async hydrate(): Promise<SaveData> {
    let remote: SaveData | null = null;
    try { remote = normalizeSave(await this.host.loadSave()); } catch { remote = null; }
    const merged = mergeSaves(this.data, remote);
    const changedLocally = JSON.stringify(merged) !== JSON.stringify(remote);
    this.data = merged;
    this.writeLocal();
    if (changedLocally) this.dirty = true;
    this.emit();
    if (this.dirty) void this.flush();
    return this.data;
  }

  subscribe(listener: (data: SaveData) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit() { for (const listener of this.listeners) listener(this.data); }

  /** Applies an update and schedules the remote write. */
  update(mutate: (data: SaveData) => SaveData) {
    this.data = { ...mutate(this.data), updatedAt: this.now() };
    this.dirty = true;
    this.writeLocal();
    this.emit();
    if (this.timer) this.clearTimer(this.timer);
    this.timer = this.setTimer(() => { this.timer = null; void this.flush(); }, this.debounceMs);
  }

  get isDirty() { return this.dirty; }

  /** Pushes the current save to the host. Safe to call often. */
  async flush(): Promise<boolean> {
    if (!this.dirty) return true;
    if (this.remoteBusy) await this.remoteBusy;
    if (!this.dirty) return true;
    const snapshot = this.data;
    this.remoteBusy = (async () => {
      try {
        await this.host.saveProgress(snapshot);
        if (this.data === snapshot) this.dirty = false;
      } catch { /* stays dirty for the next flush */ }
    })();
    await this.remoteBusy;
    this.remoteBusy = null;
    return !this.dirty;
  }
}
