import type { SaveData, SproutHost } from "./types";
import { SaveStore } from "./systems/save";
import { AudioSystem } from "./systems/audio";
import { VoiceSystem } from "./systems/voice";
import { reducedMotion } from "./systems/motion";
import { dayKey, updateStreak, newlyMasteredAnnouncement } from "./systems/session";

/** Everything scenes share. Created once by createSproutGame and stored in the registry. */
export class GameContext {
  readonly store: SaveStore;
  readonly audio = new AudioSystem();
  readonly voice: VoiceSystem;
  /** Set by whichever scene shows captions. */
  caption: ((text: string) => void) | null = null;
  faceTextureKey: string | null = null;
  sessionStartedAt = Date.now();
  private lastTick = Date.now();
  /** Minutes left on the grown-up play timer, or null when off. */
  timerEndsAt: number | null = null;
  timerDone = false;

  constructor(readonly host: SproutHost) {
    this.store = new SaveStore(host);
    this.voice = new VoiceSystem(host, { onCaption: text => this.caption?.(text) });
    this.applySettings(this.store.data);
    this.store.subscribe(data => this.applySettings(data));
  }

  get save(): SaveData { return this.store.data; }
  get reduced() { return reducedMotion(this.save.settings.reducedMotion); }
  get heroName() { return this.save.hero.name || "Kaleb"; }

  private applySettings(data: SaveData) {
    this.audio.enabled = data.settings.sound;
    this.audio.setMusic(data.settings.music && data.settings.sound);
    this.voice.enabled = data.settings.sound;
    if (this.voice.voice !== data.settings.voice) { this.voice.voice = data.settings.voice; void this.voice.preload(); }
    if (data.settings.playTimerMin > 0) {
      if (this.timerEndsAt === null) this.timerEndsAt = this.sessionStartedAt + data.settings.playTimerMin * 60_000;
    } else { this.timerEndsAt = null; this.timerDone = false; }
  }

  /** Called by the hub after hydration so the streak counts today. */
  touchStreak() {
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const today = dayKey(now), yesterdayKey = dayKey(yesterday);
    const before = this.save.streak;
    const after = updateStreak(before, today, yesterdayKey);
    if (after !== before) {
      this.store.update(data => ({ ...data, streak: after }));
      if (after.count >= 3 && after.count % 3 === 0) void this.host.logParentEvent({ kind: "streak", title: `${this.heroName} is on a ${after.count} day hero streak!`, body: "Played Sprout's Garden three days in a row." });
    }
  }

  /** Adds played time since the last tick. Scenes call this on shutdown. */
  tickTime() {
    const now = Date.now();
    const delta = Math.min(now - this.lastTick, 10 * 60_000);
    this.lastTick = now;
    if (delta > 1000) this.store.update(data => ({ ...data, timePlayedMs: data.timePlayedMs + delta }));
  }

  /** Posts mastery announcements once per skill item. */
  announceMastery(keys: string[]) {
    const fresh = keys.filter(key => !this.save.masteredAnnounced.includes(key));
    if (!fresh.length) return;
    this.store.update(data => ({ ...data, masteredAnnounced: [...data.masteredAnnounced, ...fresh] }));
    void this.host.logParentEvent(newlyMasteredAnnouncement(this.heroName, fresh));
  }

  timerRemainingMs(): number | null {
    return this.timerEndsAt === null ? null : Math.max(0, this.timerEndsAt - Date.now());
  }
}

export const CONTEXT_KEY = "sprout:context";
export const getContext = (scene: Phaser.Scene): GameContext => scene.registry.get(CONTEXT_KEY) as GameContext;
