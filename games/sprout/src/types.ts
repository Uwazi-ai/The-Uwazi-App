/** Shared types for Sprout's Garden. Pure data: no Phaser imports here. */

export type SkillId =
  | "counting" | "numerals" | "adding" | "subtracting"
  | "letterNames" | "letterSounds" | "beginningSounds" | "rhyming" | "cvcWords" | "sightWords"
  | "shapes" | "colors" | "patterns" | "positional" | "directions" | "memory";

export type GameId =
  | "dino-egg-hunt" | "letter-racer" | "block-builder" | "park-course"
  | "rhyme-roar" | "word-builder" | "hero-memory";

export const GAME_IDS: GameId[] = [
  "dino-egg-hunt", "letter-racer", "block-builder", "park-course", "rhyme-roar", "word-builder", "hero-memory",
];

export interface SkillItemRecord {
  attempts: number;
  correct: number;
  /** ms since epoch of the last time this item was shown */
  lastSeen: number;
  /** consecutive correct answers */
  streak: number;
}

export type MasteryItems = Record<string, SkillItemRecord>;

export type MasteryLevel = "new" | "learning" | "shaky" | "mastered";

export interface LevelResult {
  stars: 1 | 2 | 3;
  bestScore: number;
  plays: number;
}

export type VoiceChoice = "mama" | "myke" | "robot";
export type PlayTimerMinutes = 0 | 10 | 15 | 20 | 30;

export interface Settings {
  /** hex digest of the grown-up PIN; unset until a grown-up sets one */
  pinHash?: string;
  /** auto follows the adaptive tracker; a number pins the starting level for new sessions */
  difficulty: "auto" | 1 | 2 | 3;
  voice: VoiceChoice;
  sound: boolean;
  music: boolean;
  playTimerMin: PlayTimerMinutes;
  reducedMotion: "system" | "on";
}

export type Emblem = "star" | "bolt" | "heart" | "dino" | "car";

export interface HeroConfig {
  name: string;
  capeColor: string;
  maskColor: string;
  emblem: Emblem;
  /** true when a face photo is stored for the hero */
  facePhoto: boolean;
}

export interface Trophy {
  id: string;
  gameId: GameId;
  title: string;
  earnedAt: number;
}

export interface SaveData {
  version: number;
  updatedAt: number;
  childKey: string;
  mastery: MasteryItems;
  games: Record<string, Record<string, LevelResult>>;
  xp: number;
  settings: Settings;
  hero: HeroConfig;
  streak: { lastDay: string; count: number; best: number };
  timePlayedMs: number;
  trophies: Trophy[];
  /** skills already announced to parents, so a mastery event posts once */
  masteredAnnounced: string[];
}

export const SAVE_VERSION = 1;

export const defaultSettings = (): Settings => ({
  difficulty: "auto",
  voice: "mama",
  sound: true,
  music: true,
  playTimerMin: 0,
  reducedMotion: "system",
});

export const defaultHero = (): HeroConfig => ({
  name: "Kaleb",
  capeColor: "#1F2A33",
  maskColor: "#111111",
  emblem: "star",
  facePhoto: false,
});

export const emptySave = (childKey = "kaleb"): SaveData => ({
  version: SAVE_VERSION,
  updatedAt: 0,
  childKey,
  mastery: {},
  games: {},
  xp: 0,
  settings: defaultSettings(),
  hero: defaultHero(),
  streak: { lastDay: "", count: 0, best: 0 },
  timePlayedMs: 0,
  trophies: [],
  masteredAnnounced: [],
});

/** Events the game raises for grown-ups. The host decides where they go. */
export interface ParentEvent {
  kind: "level_complete" | "rank_up" | "skill_mastered" | "new_record" | "streak";
  title: string;
  body: string;
}

/** Everything the game needs from the app that hosts it. */
export interface SproutHost {
  loadSave(): Promise<SaveData | null>;
  saveProgress(data: SaveData): Promise<void>;
  logParentEvent(event: ParentEvent): Promise<void>;
  /** Signed URL for a recorded clip, or null when none exists. Never throws. */
  getVoiceClipUrl(voice: Exclude<VoiceChoice, "robot">, key: string): Promise<string | null>;
  /** Signed URL for the hero face photo, or null. Never throws. */
  getFacePhotoUrl(): Promise<string | null>;
  /** Opens the grown-up tools (record voices, choose photo) in the host UI. */
  openGrownUpTools(tab: "voice" | "photo"): void;
  /** Leaves the game. */
  exit(): void;
  /** Local storage for offline saves; defaults to window.localStorage. */
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
}
