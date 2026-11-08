import Phaser from "phaser";
import type { SproutHost } from "./types";
import { CONTEXT_KEY, GameContext } from "./context";
import { BootScene } from "./scenes/BootScene";
import { HubScene } from "./scenes/HubScene";
import { LevelsScene } from "./scenes/LevelsScene";
import { CelebrationScene } from "./scenes/CelebrationScene";
import { TrophyScene } from "./scenes/TrophyScene";
import { GrownUpScene } from "./scenes/GrownUpScene";
import { HeroBuilderScene } from "./scenes/HeroBuilderScene";
import { DinoEggHuntScene } from "./scenes/DinoEggHuntScene";
import { LetterRacerScene } from "./scenes/LetterRacerScene";
import { BlockBuilderScene } from "./scenes/BlockBuilderScene";
import { ParkCourseScene } from "./scenes/ParkCourseScene";
import { RhymeRoarScene } from "./scenes/RhymeRoarScene";
import { WordBuilderScene } from "./scenes/WordBuilderScene";
import { HeroMemoryScene } from "./scenes/HeroMemoryScene";

export type { SproutHost, SaveData, ParentEvent } from "./types";
export { VOICE_CLIPS } from "./systems/voice";

export interface SproutGame {
  game: Phaser.Game;
  context: GameContext;
  /** Flushes the save and tears the game down. */
  destroy(): Promise<void>;
  /** Call after a grown-up records new voice clips so the game reloads them. */
  refreshVoices(): void;
}

/** Boots Phaser inside `parent`. The host owns Supabase; the game only talks to the host. */
export function createSproutGame(parent: HTMLElement, host: SproutHost): SproutGame {
  const context = new GameContext(host);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#1F2A33",
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER, width: "100%", height: "100%" },
    render: { antialias: true, roundPixels: false, powerPreference: "high-performance" },
    input: { activePointers: 2 },
    fps: { target: 60, smoothStep: true },
    dom: { createContainer: false },
    scene: [BootScene, HubScene, LevelsScene, CelebrationScene, TrophyScene, GrownUpScene, HeroBuilderScene, DinoEggHuntScene, LetterRacerScene, BlockBuilderScene, ParkCourseScene, RhymeRoarScene, WordBuilderScene, HeroMemoryScene],
    callbacks: { preBoot: g => { g.registry.set(CONTEXT_KEY, context); } },
  });
  const unlock = () => { context.audio.unlock(); };
  parent.addEventListener("pointerdown", unlock, { passive: true });
  const online = () => { void context.store.flush(); };
  window.addEventListener("online", online);
  const hidden = () => { if (document.visibilityState === "hidden") { context.tickTime(); void context.store.flush(); context.voice.stop(); } };
  document.addEventListener("visibilitychange", hidden);
  return {
    game,
    context,
    refreshVoices: () => { context.voice.invalidate(); void context.voice.preload(); },
    destroy: async () => {
      parent.removeEventListener("pointerdown", unlock);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", hidden);
      context.tickTime();
      context.voice.stop();
      context.audio.destroy();
      await context.store.flush();
      game.destroy(true);
    },
  };
}
