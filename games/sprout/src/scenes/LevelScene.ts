import Phaser from "phaser";
import type { GameId, SkillId } from "../types";
import { getContext, type GameContext } from "../context";
import { Caption, MissionBar, ProgressBar, RoundButton, drawHomeIcon } from "../ui/widgets";
import { Sprout } from "../actors/sprout";
import { applyResult, consumeHint, startAdaptive, type AdaptiveState } from "../systems/adaptive";
import { newlyMastered, recordAttempt } from "../systems/mastery";
import { pickPhrase, TRY_AGAIN } from "../systems/rewards";
import { pop, shake, type MotionContext } from "../systems/motion";
import { sparkles } from "../systems/particles";
import { capeSwipe } from "../systems/transitions";

export interface LevelData {
  levelIndex: number;
  /** restart snapshot when the screen rotates */
  resume?: { round: number; correct: number; adaptive: AdaptiveState; misses: number };
}

/**
 * Every game scene extends this. It owns the mission bar, progress bar, caption, the helper
 * Sprout, adaptive difficulty, mastery recording and the hand-off to the celebration.
 */
export abstract class LevelScene extends Phaser.Scene {
  abstract readonly gameId: GameId;
  abstract readonly levelCount: number;
  protected ctx!: GameContext;
  protected mission!: MissionBar;
  protected progress!: ProgressBar;
  protected caption!: Caption;
  protected helper!: Sprout;
  protected levelIndex = 0;
  protected round = 0;
  protected totalRounds = 5;
  protected correct = 0;
  protected misses = 0;
  protected adaptive: AdaptiveState = startAdaptive(1);
  protected roundFirstTry = true;
  protected locked = false;
  protected lastPrompt = "";
  private lastSize = { w: 0, h: 0 };
  private resizeTimer: Phaser.Time.TimerEvent | null = null;

  protected get W() { return this.scale.width; }
  protected get H() { return this.scale.height; }
  protected get portrait() { return this.H > this.W; }
  protected get motion(): MotionContext { return { scene: this, reduced: this.ctx.reduced }; }
  protected get rng() { return Math.random; }

  init(data: LevelData) {
    this.ctx = getContext(this);
    this.levelIndex = data?.levelIndex ?? 0;
    this.round = data?.resume?.round ?? 0;
    this.correct = data?.resume?.correct ?? 0;
    this.misses = data?.resume?.misses ?? 0;
    const pinned = this.ctx.save.settings.difficulty;
    this.adaptive = data?.resume?.adaptive ?? startAdaptive(pinned === "auto" ? 1 : pinned);
    this.locked = false;
  }

  /** Subclasses build their world here, then call startRound(). */
  abstract buildLevel(): void;
  abstract startRound(): void;
  /** Sprout points or glows at the right answer. */
  abstract showHint(): void;

  create() {
    this.lastSize = { w: this.W, h: this.H };
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this); this.ctx.tickTime(); this.ctx.caption = null; this.ctx.voice.stop(); });
    this.cameras.main.setBackgroundColor("#3D8FD1");
    this.buildLevel();
    this.buildHud();
    this.ctx.caption = text => this.caption.show(text);
    this.updateProgress();
    this.startRound();
  }

  private onResize() {
    const dw = Math.abs(this.W - this.lastSize.w), dh = Math.abs(this.H - this.lastSize.h);
    if (dw < 40 && dh < 120) return;
    this.resizeTimer?.remove();
    this.resizeTimer = this.time.delayedCall(250, () => {
      this.scene.restart({ levelIndex: this.levelIndex, resume: { round: this.round, correct: this.correct, adaptive: this.adaptive, misses: this.misses } } satisfies LevelData);
    });
  }

  protected buildHud() {
    const top = 70;
    this.mission = new MissionBar(this, this.W, top, () => this.repeatPrompt());
    this.progress = new ProgressBar(this, this.W / 2, top + 72, Math.min(this.W - 120, 700));
    this.caption = new Caption(this, this.W / 2, this.H - 40, this.W);
    new RoundButton(this, 56, this.H - 64, drawHomeIcon, () => this.goHome());
    this.helper = new Sprout(this, this.W - 70, this.H - 90, Sprout.fromConfig(this.ctx.save.hero, this.ctx.faceTextureKey), 30);
    this.helper.setDepth(205).baseScale = 1;
  }

  protected updateProgress() { this.progress.setProgress(this.round / this.totalRounds); }

  /** Speaks and shows the mission. */
  protected say(text: string, spoken = text) {
    this.lastPrompt = spoken;
    this.mission.setMission(text);
    this.ctx.voice.say(spoken);
  }

  protected repeatPrompt() { if (this.lastPrompt) this.ctx.voice.say(this.lastPrompt); this.helper.jump(30); }

  /** Called by the game when Kaleb answers. Handles sound, mastery, adaptive flow and advancing. */
  protected answer(isCorrect: boolean, skill: SkillId, item: string, at?: { x: number; y: number }, onAdvance?: () => void) {
    if (this.locked) return;
    const before = this.ctx.save.mastery;
    const after = recordAttempt(before, skill, item, isCorrect, Date.now());
    this.ctx.store.update(data => ({ ...data, mastery: after }));
    this.ctx.announceMastery(newlyMastered(before, after));
    this.adaptive = applyResult(this.adaptive, isCorrect, { min: 1, max: 3 });
    if (isCorrect) {
      this.locked = true;
      if (this.roundFirstTry) this.correct += 1;
      this.ctx.audio.play("correct");
      if (at) sparkles(this, at.x, at.y);
      this.helper.jump(40);
      this.helper.setMood(true);
      this.round += 1;
      this.updateProgress();
      const done = this.round >= this.totalRounds;
      this.time.delayedCall(done ? 900 : 750, () => {
        this.locked = false;
        this.roundFirstTry = true;
        if (done) this.finish(); else { onAdvance?.(); this.startRound(); }
      });
      return;
    }
    this.roundFirstTry = false;
    this.misses += 1;
    this.ctx.audio.play("wrong");
    shake(this.motion, 0.002, 120);
    this.helper.setMood(false);
    this.time.delayedCall(600, () => this.helper.setMood(true));
    this.ctx.voice.say(pickPhrase(TRY_AGAIN, this.ctx.heroName));
    if (this.adaptive.hint) {
      this.adaptive = consumeHint(this.adaptive);
      this.time.delayedCall(900, () => { if (!this.locked) this.showHint(); });
    }
  }

  /** Whether the next prompt should be easier (fewer choices or smaller numbers). */
  protected get eased() { return this.adaptive.ease; }
  protected get difficulty() { return this.adaptive.level; }

  protected finish() {
    this.locked = true;
    this.ctx.audio.play("fanfare");
    this.time.delayedCall(400, () => capeSwipe(this, "Celebration", { gameId: this.gameId, levelIndex: this.levelIndex, correct: this.correct, total: this.totalRounds, hints: this.adaptive.hintsShown, levelCount: this.levelCount }, this.ctx.reduced));
  }

  protected goHome() {
    this.ctx.audio.play("whoosh");
    capeSwipe(this, "Hub", {}, this.ctx.reduced);
  }

  /** Tap feedback shared by every tappable thing. */
  protected tapFeedback(target: Phaser.GameObjects.Container | Phaser.GameObjects.Image) {
    this.ctx.audio.play("tap");
    pop(this.motion, target);
  }

  /** Play-timer guard: when time is up the level ends early with what was earned. */
  protected timeIsUp() {
    const left = this.ctx.timerRemainingMs();
    return left !== null && left <= 0;
  }
}
