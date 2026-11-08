import Phaser from "phaser";
import { getContext, type GameContext } from "../context";
import { Sprout } from "../actors/sprout";
import { Chip, RoundButton, bodyStyle, displayStyle, drawBackIcon } from "../ui/widgets";
import { drawGarden } from "../ui/background";
import { CAPE_UNLOCKS, COLOR_NAMES, HEX, PALETTE } from "../config";
import { capeSwipe } from "../systems/transitions";
import { rankIndex, RANKS } from "../systems/rewards";
import type { Emblem } from "../types";
import { sparkles } from "../systems/particles";

const MASKS = ["#111111", "#1F2A33", "#1E88E5", "#7B4FBF", "#D9453D"];
const EMBLEMS: Emblem[] = ["star", "bolt", "heart", "dino", "car"];

/** Kaleb's own hero: cape colour (unlocked by rank), mask, emblem and his face photo. */
export class HeroBuilderScene extends Phaser.Scene {
  private ctx!: GameContext;
  private preview!: Sprout;
  constructor() { super("HeroBuilder"); }

  create() {
    this.ctx = getContext(this);
    const W = this.scale.width, H = this.scale.height, portrait = H > W;
    drawGarden(this, { groundRatio: 0.9 });
    this.scale.once(Phaser.Scale.Events.RESIZE, () => this.time.delayedCall(200, () => this.scene.restart()));
    new RoundButton(this, 56, 56, drawBackIcon, () => capeSwipe(this, "Hub", {}, this.ctx.reduced));
    this.add.text(W / 2, 54, `Super ${this.ctx.heroName}`, displayStyle(Math.min(48, W * 0.08), HEX.gold)).setOrigin(0.5);
    this.ctx.voice.say("Make your own hero! Pick a cape, a mask and an emblem.");
    const previewX = portrait ? W / 2 : W * 0.2, previewY = portrait ? 230 : H * 0.5;
    this.rebuildPreview(previewX, previewY, portrait ? 70 : Math.min(90, H * 0.13));
    this.preview.setInteractive(new Phaser.Geom.Circle(this.preview.width / 2, this.preview.height / 2, 120), Phaser.Geom.Circle.Contains).on(Phaser.Input.Events.POINTER_UP, () => { this.preview.powerPose(); this.ctx.audio.play("sparkle"); sparkles(this, previewX, previewY - 40); this.time.delayedCall(900, () => this.preview.resetPose()); });

    const panelX = portrait ? W / 2 : W * 0.68, startY = portrait ? 380 : 120;
    const panelW = portrait ? W - 40 : W * 0.55;
    const swatch = 64, gapX = 14;
    const row = (label: string, y: number) => this.add.text(panelX - panelW / 2, y, label, displayStyle(26, HEX.white)).setOrigin(0, 0.5);

    row("Cape", startY);
    const unlockedCount = rankIndex(this.ctx.save.xp) + 1;
    CAPE_UNLOCKS.forEach((color, index) => {
      const x = panelX - panelW / 2 + swatch / 2 + index * (swatch + gapX), y = startY + 60;
      const unlocked = index < unlockedCount;
      this.swatch(x, y, swatch, color, unlocked, this.ctx.save.hero.capeColor === color, () => this.setHero({ capeColor: color }, `${COLOR_NAMES[color] ?? "new"} cape!`));
      if (!unlocked) this.add.text(x, y + swatch / 2 + 14, RANKS[index].name, bodyStyle(12, HEX.cream)).setOrigin(0.5);
    });

    row("Mask", startY + 140);
    MASKS.forEach((color, index) => {
      const x = panelX - panelW / 2 + swatch / 2 + index * (swatch + gapX), y = startY + 200;
      this.swatch(x, y, swatch, color, true, this.ctx.save.hero.maskColor === color, () => this.setHero({ maskColor: color }, "New mask!"));
    });

    row("Emblem", startY + 280);
    EMBLEMS.forEach((emblem, index) => {
      const x = panelX - panelW / 2 + swatch / 2 + index * (swatch + gapX), y = startY + 340;
      const chip = new Chip(this, x, y, "", { width: swatch, height: swatch, fill: this.ctx.save.hero.emblem === emblem ? PALETTE.gold : PALETTE.charcoal, onTap: () => this.setHero({ emblem }, `${emblem} emblem!`) });
      const g = this.add.graphics();
      const mini = new Sprout(this, 0, 0, { emblem }, 1);
      mini.destroy();
      g.fillStyle(this.ctx.save.hero.emblem === emblem ? PALETTE.charcoal : PALETTE.gold, 1);
      drawEmblemIcon(g, emblem, 18);
      chip.add(g);
    });

    const hasPhoto = !!this.ctx.faceTextureKey || this.ctx.save.hero.facePhoto;
    new Chip(this, panelX, startY + 430, hasPhoto ? (this.ctx.save.hero.facePhoto ? "Hide my face" : "Show my face") : "Add my face (grown-ups)", { width: Math.min(panelW, 420), height: 72, fontSize: 24, onTap: () => {
      if (!this.ctx.faceTextureKey) { this.ctx.voice.say("Ask a grown-up to add your photo in the grown-up corner."); return; }
      this.setHero({ facePhoto: !this.ctx.save.hero.facePhoto }, "Super face!");
    } });
  }

  private swatch(x: number, y: number, size: number, color: string, unlocked: boolean, selected: boolean, onTap: () => void) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.black, 0.5).fillRoundedRect(-size / 2 + 3, -size / 2 + 6, size, size, 14);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, unlocked ? 1 : 0.35).fillRoundedRect(-size / 2, -size / 2, size, size, 14);
    g.lineStyle(selected ? 5 : 3, selected ? PALETTE.white : PALETTE.gold, 1).strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
    if (!unlocked) { g.fillStyle(0xffffff, 0.8).fillRoundedRect(-12, -6, 24, 20, 4); g.lineStyle(4, 0xffffff, 0.8).beginPath().arc(0, -8, 8, Math.PI, 0).strokePath(); }
    c.add(g).setSize(Math.max(96, size), Math.max(96, size)).setInteractive();
    c.on(Phaser.Input.Events.POINTER_UP, () => { if (!unlocked) { this.ctx.audio.play("wrong"); this.ctx.voice.say("Earn more XP to unlock this cape, hero!"); return; } this.ctx.audio.play("pop"); onTap(); });
    return c;
  }

  private setHero(patch: Partial<typeof this.ctx.save.hero>, phrase: string) {
    this.ctx.store.update(data => ({ ...data, hero: { ...data.hero, ...patch } }));
    this.ctx.voice.say(phrase);
    this.scene.restart();
  }

  private rebuildPreview(x: number, y: number, size: number) {
    this.preview?.destroy();
    this.preview = new Sprout(this, x, y, Sprout.fromConfig(this.ctx.save.hero, this.ctx.faceTextureKey), size);
  }
}

function drawEmblemIcon(g: Phaser.GameObjects.Graphics, emblem: Emblem, r: number) {
  switch (emblem) {
    case "bolt": g.fillTriangle(-r * 0.2, -r, r * 0.6, -r, 0, 0).fillTriangle(r * 0.2, r, -r * 0.6, r, 0, 0); break;
    case "heart": g.fillCircle(-r * 0.45, -r * 0.3, r * 0.5).fillCircle(r * 0.45, -r * 0.3, r * 0.5).fillTriangle(-r * 0.95, -r * 0.1, r * 0.95, -r * 0.1, 0, r); break;
    case "dino": g.fillEllipse(0, 0, r * 1.8, r * 1.1).fillTriangle(-r * 0.8, -r * 0.4, -r * 0.4, -r * 1.1, 0, -r * 0.4).fillTriangle(0, -r * 0.4, r * 0.4, -r * 1.1, r * 0.8, -r * 0.4); break;
    case "car": g.fillRoundedRect(-r, -r * 0.3, r * 2, r * 0.8, 4).fillRoundedRect(-r * 0.5, -r * 0.8, r, r * 0.6, 4); break;
    default: g.beginPath(); for (let i = 0; i < 10; i += 1) { const rad = i % 2 === 0 ? r : r * 0.45; const a = -Math.PI / 2 + (i * Math.PI) / 5; const px = Math.cos(a) * rad, py = Math.sin(a) * rad; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); } g.closePath().fillPath();
  }
}
