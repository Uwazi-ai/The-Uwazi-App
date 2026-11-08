import Phaser from "phaser";
import { getContext, type GameContext } from "../context";
import { GAMES } from "../games";
import { Chip, RoundButton, bodyStyle, displayStyle, drawBackIcon, drawStar } from "../ui/widgets";
import { drawGarden } from "../ui/background";
import { HEX, PALETTE } from "../config";
import { unlockedLevels } from "../systems/rewards";
import { capeSwipe } from "../systems/transitions";

/** Level picker for one game: finished levels show stars, the next one is open, the rest wait. */
export class LevelsScene extends Phaser.Scene {
  private ctx!: GameContext;
  constructor() { super("Levels"); }

  create(data: { gameIndex: number }) {
    this.ctx = getContext(this);
    const game = GAMES[data.gameIndex] ?? GAMES[0];
    const W = this.scale.width, H = this.scale.height;
    drawGarden(this, { groundRatio: 0.9 });
    this.scale.once(Phaser.Scale.Events.RESIZE, () => this.time.delayedCall(200, () => this.scene.restart(data)));
    this.add.text((W + 70) / 2, 54, game.title, displayStyle(Math.min(50, (W - 150) / 8.5), HEX.gold)).setOrigin(0.5);
    this.add.text(W / 2, 104, game.teaches, bodyStyle(22, HEX.cream)).setOrigin(0.5);
    new RoundButton(this, 56, 56, drawBackIcon, () => capeSwipe(this, "Hub", {}, this.ctx.reduced));
    this.ctx.voice.say(`${game.title}. Pick a level!`);

    const unlocked = unlockedLevels(this.ctx.save, game.id, game.levels.length);
    const results = this.ctx.save.games[game.id] ?? {};
    const chipW = Math.min(W - 48, 620), chipH = Math.min(92, (H - 200) / game.levels.length - 10);
    game.levels.forEach((level, index) => {
      const y = 170 + index * (chipH + 12);
      const open = index < unlocked;
      const chip = new Chip(this, W / 2, y, `${index + 1}. ${level.name}`, { width: chipW, height: chipH, fontSize: Math.min(30, chipH * 0.36), fill: open ? PALETTE.charcoal : 0x2a2f36, border: open ? PALETTE.gold : 0x55606a, textColor: open ? HEX.white : "#8a949e", onTap: () => { if (!open) { this.ctx.audio.play("wrong"); this.ctx.voice.say("Finish the level before this one first, hero!"); return; } this.ctx.audio.unlock(); this.ctx.audio.play("whoosh"); capeSwipe(this, game.sceneKey, { levelIndex: index }, this.ctx.reduced); } });
      chip.label.setOrigin(0, 0.5).setX(-chipW / 2 + 24);
      const textRoom = chipW - 48 - 130;
      if (chip.label.width > textRoom) chip.label.setScale(textRoom / chip.label.width);
      const stars = this.add.graphics();
      const earned = results[String(index)]?.stars ?? 0;
      for (let s = 0; s < 3; s += 1) drawStar(stars, chipW / 2 - 28 - s * 34, 0, 13, s < earned ? PALETTE.gold : 0x4a5560);
      chip.add(stars);
      if (!open) { const lock = this.add.graphics(); lock.fillStyle(0x8a949e, 1).fillRoundedRect(chipW / 2 - 136, -8, 20, 16, 4); lock.lineStyle(4, 0x8a949e, 1).beginPath().arc(chipW / 2 - 126, -10, 6, Math.PI, 0).strokePath(); chip.add(lock); }
      chip.setAlpha(0).setX(W / 2 + 60);
      this.tweens.add({ targets: chip, alpha: 1, x: W / 2, duration: 240, delay: index * 60, ease: "Back.easeOut" });
    });
  }
}
