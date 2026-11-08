import Phaser from "phaser";
import { getContext, type GameContext } from "../context";
import type { GameId } from "../types";
import { gameById } from "../games";
import { Sprout } from "../actors/sprout";
import { Chip, bodyStyle, displayStyle, drawStar } from "../ui/widgets";
import { HEX, PALETTE } from "../config";
import { applyLevelResult, rankName } from "../systems/rewards";
import { confetti, sparkles } from "../systems/particles";
import { zoomPunch } from "../systems/motion";
import { capeSwipe } from "../systems/transitions";

export interface CelebrationData { gameId: GameId; levelIndex: number; correct: number; total: number; hints: number; levelCount: number }

/** Stars, trophy pop, confetti, fanfare, power pose and praise in a grown-up's voice. */
export class CelebrationScene extends Phaser.Scene {
  private ctx!: GameContext;
  constructor() { super("Celebration"); }

  create(data: CelebrationData) {
    this.ctx = getContext(this);
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor("#1F2A33");
    // the result is applied once below, so a rotation goes home instead of replaying it
    this.scale.once(Phaser.Scale.Events.RESIZE, () => this.time.delayedCall(200, () => this.scene.start("Hub", {})));
    const game = gameById(data.gameId);
    const level = game.levels[data.levelIndex];
    const outcome = applyLevelResult(this.ctx.save, data.gameId, data.levelIndex, data.correct, data.total, data.hints, Date.now(), level?.trophy);
    this.ctx.store.update(() => outcome.save);
    void this.ctx.store.flush();
    const name = this.ctx.heroName;
    void this.ctx.host.logParentEvent({ kind: "level_complete", title: `${name} finished ${game.title} level ${data.levelIndex + 1}`, body: `${outcome.stars} star${outcome.stars > 1 ? "s" : ""}, ${data.correct} of ${data.total} first try. +${outcome.xpEarned} XP.` });
    if (outcome.rankedUp) void this.ctx.host.logParentEvent({ kind: "rank_up", title: `${name} is now a ${rankName(outcome.save.xp)}!`, body: "A new cape colour is unlocked in My Hero." });
    if (outcome.newRecord) void this.ctx.host.logParentEvent({ kind: "new_record", title: `New record in ${game.title}!`, body: `Level ${data.levelIndex + 1}: ${Math.round((data.correct / data.total) * 100)}% first try.` });

    const rays = this.add.graphics().setDepth(0);
    for (let i = 0; i < 12; i += 1) { const a = (i * Math.PI) / 6; rays.fillStyle(PALETTE.gold, 0.08).fillTriangle(W / 2, H * 0.4, W / 2 + Math.cos(a) * W * 1.5, H * 0.4 + Math.sin(a) * W * 1.5, W / 2 + Math.cos(a + 0.26) * W * 1.5, H * 0.4 + Math.sin(a + 0.26) * W * 1.5); }
    if (!this.ctx.reduced) this.tweens.add({ targets: rays, angle: 360, duration: 40000, repeat: -1 });
    rays.setPosition(0, 0);

    this.add.text(W / 2, H * 0.12, outcome.newRecord ? "New record!" : "Level complete!", displayStyle(Math.min(56, W * 0.09), HEX.gold)).setOrigin(0.5);
    this.add.text(W / 2, H * 0.12 + 54, `${game.title} · ${level?.name ?? ""}`, bodyStyle(22, HEX.cream)).setOrigin(0.5);

    const starsG = this.add.graphics().setDepth(5);
    const starY = H * 0.28;
    for (let s = 0; s < 3; s += 1) {
      const x = W / 2 + (s - 1) * 110;
      this.time.delayedCall(400 + s * 300, () => {
        drawStar(starsG, x, starY, 44, s < outcome.stars ? PALETTE.gold : 0x4a5560);
        if (s < outcome.stars) { this.ctx.audio.play("sparkle"); sparkles(this, x, starY, 12); }
      });
    }

    const sprout = new Sprout(this, W / 2, H * 0.58, Sprout.fromConfig(this.ctx.save.hero, this.ctx.faceTextureKey), Math.min(80, W * 0.12));
    sprout.setDepth(5);
    this.time.delayedCall(1200, () => { sprout.powerPose(); zoomPunch({ scene: this, reduced: this.ctx.reduced }); confetti(this, W / 2, H * 0.3, 70); this.ctx.audio.play(outcome.rankedUp ? "rankup" : "fanfare"); });
    this.time.delayedCall(1500, () => this.ctx.voice.sayClip(outcome.newRecord ? "new_record" : "great_job", name));
    if (outcome.newTrophy) {
      const trophy = this.add.container(W / 2, H * 0.42).setDepth(6).setScale(0);
      const g = this.add.graphics();
      g.fillStyle(PALETTE.gold, 1).fillRoundedRect(-40, -46, 80, 60, 14).fillRect(-10, 10, 20, 24).fillRoundedRect(-34, 30, 68, 14, 4);
      g.lineStyle(8, PALETTE.gold, 1).beginPath().arc(-44, -24, 16, Math.PI / 2, Math.PI * 1.5).strokePath().beginPath().arc(44, -24, 16, -Math.PI / 2, Math.PI / 2).strokePath();
      trophy.add([g, this.add.text(0, 70, outcome.newTrophy.title, displayStyle(26, HEX.gold)).setOrigin(0.5)]);
      this.time.delayedCall(1700, () => { this.tweens.add({ targets: trophy, scale: 1, duration: 400, ease: "Back.easeOut" }); this.ctx.audio.play("hatch"); });
    }
    const xpLine = this.add.text(W / 2, H * 0.78, `+${outcome.xpEarned} XP${outcome.rankedUp ? `  ·  Rank up: ${rankName(outcome.save.xp)}!` : ""}`, displayStyle(30, HEX.orange)).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: xpLine, alpha: 1, y: H * 0.76, duration: 400, delay: 1400 });

    const hasNext = data.levelIndex + 1 < data.levelCount;
    const timeUp = (this.ctx.timerRemainingMs() ?? 1) <= 0;
    this.time.delayedCall(2000, () => {
      if (hasNext && !timeUp) new Chip(this, W / 2 - (W > 500 ? 150 : 0), H * 0.9 - (W > 500 ? 0 : 50), "Next level", { width: W > 500 ? 260 : 300, height: 80, fill: PALETTE.orange, border: PALETTE.gold, onTap: () => { this.ctx.audio.play("whoosh"); capeSwipe(this, game.sceneKey, { levelIndex: data.levelIndex + 1 }, this.ctx.reduced); } });
      new Chip(this, hasNext && !timeUp && W > 500 ? W / 2 + 150 : W / 2, H * 0.9 + (hasNext && !timeUp && W <= 500 ? 40 : 0), "More games", { width: 260, height: 80, onTap: () => { if (timeUp) this.ctx.timerDone = true; this.ctx.audio.play("whoosh"); capeSwipe(this, "Hub", {}, this.ctx.reduced); } });
    });
  }
}
