import Phaser from "phaser";
import { getContext, type GameContext } from "../context";
import { GAMES } from "../games";
import { Sprout } from "../actors/sprout";
import { Chip, ProgressBar, RoundButton, bodyStyle, displayStyle, drawLockIcon } from "../ui/widgets";
import { drawGarden } from "../ui/background";
import { HEX, PALETTE } from "../config";
import { rankName, rankProgress, totalStars, unlockedLevels } from "../systems/rewards";
import { capeSwipe } from "../systems/transitions";
import { leafBurst } from "../systems/particles";

/** Home: Super Sprout, hero rank, the seven game tiles, trophies and the grown-up lock. */
export class HubScene extends Phaser.Scene {
  private ctx!: GameContext;
  private holdTimer: Phaser.Time.TimerEvent | null = null;
  private holdRing: Phaser.GameObjects.Arc | null = null;

  constructor() { super("Hub"); }

  create(data: { fresh?: boolean } = {}) {
    this.ctx = getContext(this);
    const W = this.scale.width, H = this.scale.height, portrait = H > W;
    drawGarden(this, { groundRatio: 0.86 });
    this.scale.once(Phaser.Scale.Events.RESIZE, () => this.time.delayedCall(200, () => this.scene.restart({})));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.ctx.tickTime());

    const save = this.ctx.save;
    const titleSize = Math.min(56, (W - 150) / 7.2);
    this.add.text((W - 110) / 2, 46, "Sprout's Garden", displayStyle(titleSize, HEX.gold)).setOrigin(0.5);

    // hero card: Sprout + rank + xp bar + streak
    const heroY = portrait ? 150 : 120;
    const card = this.add.graphics().setDepth(-1);
    card.fillStyle(PALETTE.charcoal, 0.45).fillRoundedRect(12, heroY - 70, W - 24, 140, 26);
    const sprout = new Sprout(this, portrait ? 90 : 110, heroY + 10, Sprout.fromConfig(save.hero, this.ctx.faceTextureKey), portrait ? 44 : 50);
    sprout.setInteractive(new Phaser.Geom.Circle(sprout.width / 2, sprout.height / 2, 90), Phaser.Geom.Circle.Contains).on(Phaser.Input.Events.POINTER_UP, () => { this.ctx.audio.play("jump"); sprout.jump(70); leafBurst(this, sprout.x, sprout.y + 40, 8); });
    const infoX = portrait ? 170 : 200;
    this.add.text(infoX, heroY - 36, `${rankName(save.xp)}  ·  ${save.hero.name}`, displayStyle(30, HEX.white)).setOrigin(0, 0.5);
    const barW = Math.min(W - infoX - 30, 420);
    const bar = new ProgressBar(this, infoX + barW / 2, heroY + 4, barW, 24, PALETTE.gold);
    bar.setProgress(rankProgress(save.xp));
    const stats = this.add.text(infoX, heroY + 36, `${save.xp} XP  ·  ★ ${totalStars(save)}  ·  🔥 ${save.streak.count} day${save.streak.count === 1 ? "" : "s"}`, bodyStyle(20, HEX.cream)).setOrigin(0, 0.5);
    if (stats.width > W - infoX - 20) stats.setScale((W - infoX - 20) / stats.width);

    if (data.fresh) { this.time.delayedCall(500, () => this.ctx.voice.sayClip("welcome", save.hero.name)); }

    // play timer
    this.drawTimer();

    // game grid
    const cols = portrait ? 2 : 4;
    const gap = 16;
    const tileW = Math.min(portrait ? (W - gap * (cols + 1)) / cols : (W - gap * (cols + 1)) / cols, 300);
    const tileH = Math.min(portrait ? 170 : 190, (H - heroY - 220) / Math.ceil(GAMES.length / cols) - gap);
    const gridW = cols * tileW + (cols - 1) * gap;
    const startX = (W - gridW) / 2 + tileW / 2;
    const startY = heroY + (portrait ? 110 : 120) + tileH / 2;
    GAMES.forEach((game, index) => {
      const col = index % cols, row = Math.floor(index / cols);
      const x = startX + col * (tileW + gap), y = startY + row * (tileH + gap);
      const unlocked = unlockedLevels(save, game.id, game.levels.length);
      const stars = Object.values(save.games[game.id] ?? {}).reduce((s, l) => s + l.stars, 0);
      const chip = new Chip(this, x, y, "", { width: tileW, height: tileH, fill: PALETTE.charcoal, onTap: () => this.openGame(index) });
      const icon = this.add.graphics();
      game.icon(icon, Math.min(tileW, tileH) * 0.36);
      icon.setPosition(0, -tileH * 0.18);
      const badge = this.add.graphics();
      badge.fillStyle(game.color, 1).fillCircle(0, -tileH * 0.18, Math.min(tileW, tileH) * 0.26);
      chip.addAt(badge, 1);
      chip.add(icon);
      chip.add(this.add.text(0, tileH * 0.2, game.title, { ...displayStyle(Math.min(26, tileW * 0.1), HEX.white), wordWrap: { width: tileW - 20 } }).setOrigin(0.5));
      chip.add(this.add.text(0, tileH * 0.38, `★ ${stars}   Level ${unlocked}/${game.levels.length}`, bodyStyle(16, HEX.gold)).setOrigin(0.5));
      chip.setAlpha(0).setScale(0.8);
      this.tweens.add({ targets: chip, alpha: 1, scale: 1, duration: 260, delay: index * 50, ease: "Back.easeOut" });
    });

    // bottom row: trophies, hero builder, lock
    const bottomY = H - 60;
    new Chip(this, W / 2 - (portrait ? 110 : 150), bottomY, "Trophies", { width: portrait ? 180 : 240, height: 72, fontSize: 28, onTap: () => { this.ctx.audio.play("whoosh"); capeSwipe(this, "Trophies", {}, this.ctx.reduced); } });
    new Chip(this, W / 2 + (portrait ? 110 : 150), bottomY, "My Hero", { width: portrait ? 180 : 240, height: 72, fontSize: 28, onTap: () => { this.ctx.audio.play("whoosh"); capeSwipe(this, "HeroBuilder", {}, this.ctx.reduced); } });
    this.buildLock(W - 56, 56);

    if (this.ctx.timerDone) this.showAllDone();
  }

  private drawTimer() {
    const left = this.ctx.timerRemainingMs();
    if (left === null) return;
    const label = this.add.text(this.scale.width - 110, 110, "", bodyStyle(18, HEX.cream)).setOrigin(0.5);
    const tick = () => { const ms = this.ctx.timerRemainingMs() ?? 0; label.setText(`⏱ ${Math.ceil(ms / 60000)} min left`); if (ms <= 0 && !this.ctx.timerDone) { this.ctx.timerDone = true; this.showAllDone(); } };
    tick();
    this.time.addEvent({ delay: 10_000, loop: true, callback: tick });
  }

  private showAllDone() {
    const W = this.scale.width, H = this.scale.height;
    const shade = this.add.rectangle(W / 2, H / 2, W, H, PALETTE.black, 0.82).setDepth(500).setInteractive();
    this.add.text(W / 2, H / 2 - 80, "All done for today, hero!", { ...displayStyle(Math.min(48, W * 0.08), HEX.gold), wordWrap: { width: W - 60 } }).setOrigin(0.5).setDepth(501);
    this.add.text(W / 2, H / 2, "Great playing. Time to rest your super brain.", { ...bodyStyle(22, HEX.cream), wordWrap: { width: W - 80 } }).setOrigin(0.5).setDepth(501);
    const sprout = new Sprout(this, W / 2, H / 2 + 140, Sprout.fromConfig(this.ctx.save.hero, this.ctx.faceTextureKey), 50).setDepth(501);
    sprout.powerPose();
    this.ctx.voice.sayClip("all_done", this.ctx.heroName);
    shade.setData("allDone", true);
  }

  /** Hold the lock for two seconds to open the grown-up corner. */
  private buildLock(x: number, y: number) {
    const lock = new RoundButton(this, x, y, drawLockIcon, () => {}, 40);
    lock.removeAllListeners(Phaser.Input.Events.POINTER_UP);
    lock.setDepth(600);
    const start = () => {
      this.cancelHold();
      this.holdRing = this.add.circle(x, y, 44, PALETTE.gold, 0).setStrokeStyle(6, PALETTE.gold, 1).setDepth(601).setScale(0.3);
      this.tweens.add({ targets: this.holdRing, scale: 1.3, duration: 2000, ease: "Linear" });
      this.holdTimer = this.time.delayedCall(2000, () => { this.cancelHold(); this.ctx.audio.play("sparkle"); capeSwipe(this, "GrownUp", {}, this.ctx.reduced); });
    };
    lock.on(Phaser.Input.Events.POINTER_DOWN, start);
    lock.on(Phaser.Input.Events.POINTER_UP, () => this.cancelHold());
    lock.on(Phaser.Input.Events.POINTER_OUT, () => this.cancelHold());
    this.add.text(x, y + 56, "hold", bodyStyle(14, HEX.cream)).setOrigin(0.5).setDepth(600);
  }

  private cancelHold() {
    this.holdTimer?.remove(); this.holdTimer = null;
    this.holdRing?.destroy(); this.holdRing = null;
  }

  private openGame(index: number) {
    if (this.ctx.timerDone) return;
    this.ctx.audio.unlock();
    this.ctx.audio.play("whoosh");
    capeSwipe(this, "Levels", { gameIndex: index }, this.ctx.reduced);
  }
}
