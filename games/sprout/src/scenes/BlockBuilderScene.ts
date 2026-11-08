import Phaser from "phaser";
import { LevelScene } from "./LevelScene";
import { DATA } from "../games";
import { Car } from "../actors/car";
import { drawShape } from "../actors/icons";
import { Chip, displayStyle } from "../ui/widgets";
import { drawGarden } from "../ui/background";
import { COLOR_NAMES, HEX, PALETTE } from "../config";
import { hintGlow, shake } from "../systems/motion";
import { dustPuff, sparkles } from "../systems/particles";
import type { SkillId } from "../types";

type Mode = "pattern" | "height" | "shapes" | "bridge";
interface Level { name: string; mode: Mode; rounds: number; pattern?: string; length?: number; min?: number; max?: number; shapes?: string[]; skill: SkillId; trophy: string }

const BLOCK = 64;

/** Copy patterns, build to a height, pick shapes, then SMASH with Matter physics. */
export class BlockBuilderScene extends LevelScene {
  readonly gameId = "block-builder" as const;
  readonly levelCount = DATA.blockBuilder.levels.length;
  private level!: Level;
  private groundY = 0;
  private towerX = 0;
  private blocks: Phaser.GameObjects.Container[] = [];
  private palette: Chip[] = [];
  private extras: Phaser.GameObjects.GameObject[] = [];
  private targetSeq: string[] = [];
  private targetCount = 0;
  private doneChip: Chip | null = null;
  private targetLine: Phaser.GameObjects.Graphics | null = null;
  private previewG: Phaser.GameObjects.Graphics | null = null;
  private gapX = 0;
  private gapW = 0;
  private colors: string[] = [];
  private hintAt: { x: number; y: number } | null = null;

  constructor() { super({ key: "BlockBuilder", physics: { default: "matter", matter: { gravity: { x: 0, y: 1.6 }, debug: false } } }); }

  buildLevel() {
    this.level = DATA.blockBuilder.levels[this.levelIndex] as Level;
    this.colors = DATA.blockBuilder.colors;
    this.totalRounds = this.level.rounds;
    this.groundY = drawGarden(this, { groundRatio: 0.72 });
    this.towerX = this.portrait ? this.W * 0.62 : this.W * 0.55;
    this.matter.world.setBounds(0, -2000, this.W, this.groundY + 2000, 64, true, true, false, true);
    if (this.level.mode === "bridge") {
      this.gapW = BLOCK * 2.2; this.gapX = this.W * 0.5;
      const hole = this.add.graphics().setDepth(-4);
      hole.fillStyle(0x5b3d1e, 1).fillRect(this.gapX - this.gapW / 2, this.groundY, this.gapW, 180);
      this.matter.add.rectangle(this.gapX - this.gapW / 2 - this.W, this.groundY + 50, this.W * 2, 100, { isStatic: true });
      this.matter.add.rectangle(this.gapX + this.gapW / 2 + this.W, this.groundY + 50, this.W * 2, 100, { isStatic: true });
      this.matter.add.rectangle(this.gapX, this.groundY + 180 + 50, this.gapW, 100, { isStatic: true });
      this.matter.add.rectangle(this.gapX - this.gapW / 2 - 50, this.groundY + 90, 100, 180, { isStatic: true });
      this.matter.add.rectangle(this.gapX + this.gapW / 2 + 50, this.groundY + 90, 100, 180, { isStatic: true });
    } else {
      this.matter.add.rectangle(this.W / 2, this.groundY + 50, this.W * 3, 100, { isStatic: true });
    }
  }

  private clearRound() {
    this.blocks.forEach(b => b.destroy());
    this.blocks = [];
    this.palette.forEach(p => p.destroy());
    this.palette = [];
    this.extras.forEach(e => e.destroy());
    this.extras = [];
    this.doneChip?.destroy(); this.doneChip = null;
    this.targetLine?.destroy(); this.targetLine = null;
    this.previewG?.destroy(); this.previewG = null;
    this.hintAt = null;
  }

  private makeBlock(x: number, y: number, color: string, shape = "square", dynamic = false) {
    const c = this.add.container(x, y).setDepth(10);
    const g = this.add.graphics();
    const col = Phaser.Display.Color.HexStringToColor(color).color;
    g.fillStyle(PALETTE.black, 0.3).fillRoundedRect(-BLOCK / 2 + 3, -BLOCK / 2 + 5, BLOCK, BLOCK, 10);
    if (shape === "square") { g.fillStyle(col, 1).fillRoundedRect(-BLOCK / 2, -BLOCK / 2, BLOCK, BLOCK, 10); g.fillStyle(0xffffff, 0.25).fillRoundedRect(-BLOCK / 2 + 8, -BLOCK / 2 + 8, BLOCK - 16, 14, 6); }
    else { g.fillStyle(0xfff6dc, 1).fillRoundedRect(-BLOCK / 2, -BLOCK / 2, BLOCK, BLOCK, 10); drawShape(g, shape, 0, 0, BLOCK * 0.7, col); }
    g.lineStyle(3, PALETTE.black, 0.6).strokeRoundedRect(-BLOCK / 2, -BLOCK / 2, BLOCK, BLOCK, 10);
    c.add(g);
    c.setData("color", color).setData("shape", shape);
    if (dynamic) this.matter.add.gameObject(c, { shape: { type: "rectangle", width: BLOCK, height: BLOCK }, restitution: 0.1, friction: 0.8 });
    this.blocks.push(c);
    return c;
  }

  /** Places a block on top of the tower with a little drop. */
  private stackBlock(color: string, shape = "square") {
    const index = this.blocks.length;
    const y = this.groundY - BLOCK / 2 - index * BLOCK;
    const block = this.makeBlock(this.towerX, y - 140, color, shape);
    this.ctx.audio.play("pop");
    this.tweens.add({ targets: block, y, duration: 220, ease: "Bounce.easeOut", onComplete: () => { dustPuff(this, this.towerX, y + BLOCK / 2, 5); } });
    return block;
  }

  private paletteChips(items: { key: string; color?: string; shape?: string; label?: string }[], onPick: (key: string) => void) {
    const size = Math.min(100, (this.W - 40) / items.length - 10);
    const y = this.groundY + 80;
    items.forEach((item, index) => {
      const x = this.W / 2 + (index - (items.length - 1) / 2) * (size + 10);
      const chip = new Chip(this, x, y, item.label ?? "", { width: size, height: size, fill: item.color ? Phaser.Display.Color.HexStringToColor(item.color).color : 0xfff6dc, border: PALETTE.gold, fontSize: 22, textColor: HEX.charcoal, onTap: () => { if (this.locked) return; this.ctx.audio.play("tap"); onPick(item.key); } });
      if (item.shape) { const g = this.add.graphics(); drawShape(g, item.shape, 0, 0, size * 0.6, PALETTE.blue); chip.add(g); }
      chip.setData("paletteColor", item.color ?? null).setDepth(30);
      this.palette.push(chip);
    });
  }

  startRound() {
    this.clearRound();
    switch (this.level.mode) {
      case "pattern": return this.roundPattern();
      case "height": return this.roundHeight();
      case "shapes": return this.roundShapes();
      case "bridge": return this.roundBridge();
    }
  }

  private roundPattern() {
    const pattern = this.level.pattern ?? "AB";
    const unique = Array.from(new Set(pattern.split("")));
    const chosen = Phaser.Utils.Array.Shuffle([...this.colors]).slice(0, unique.length);
    const map = Object.fromEntries(unique.map((u, i) => [u, chosen[i]]));
    const length = this.eased ? Math.max(pattern.length, (this.level.length ?? 4) - 2) : this.level.length ?? 4;
    this.targetSeq = Array.from({ length }, (_, i) => map[pattern[i % pattern.length]]);
    const names = this.targetSeq.map(c => COLOR_NAMES[c] ?? "color");
    this.say("Copy the pattern tower!", `Copy the pattern: ${names.join(", ")}.`);
    this.previewG = this.add.graphics().setDepth(5);
    const px = this.portrait ? this.W * 0.22 : this.W * 0.25, mini = BLOCK * 0.6;
    this.previewG.fillStyle(PALETTE.black, 0.3).fillRoundedRect(px - mini, this.groundY - length * mini - 30, mini * 2, length * mini + 36, 12);
    this.targetSeq.forEach((color, i) => { this.previewG!.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1).fillRoundedRect(px - mini / 2, this.groundY - (i + 1) * mini - 6, mini, mini - 4, 6); });
    this.add.existing(this.previewG);
    const options = Phaser.Utils.Array.Shuffle([...chosen, ...(this.eased ? [] : this.colors.filter(c => !chosen.includes(c)).slice(0, 1))]);
    this.paletteChips(options.map(color => ({ key: color, color })), color => {
      const expected = this.targetSeq[this.blocks.length];
      if (color !== expected) { this.hintAt = null; this.answer(false, "patterns", pattern); return; }
      this.stackBlock(color);
      this.ctx.voice.say(COLOR_NAMES[color] ?? "");
      if (this.blocks.length === this.targetSeq.length) this.time.delayedCall(500, () => this.smash(() => this.answer(true, "patterns", pattern, { x: this.towerX, y: this.groundY - 100 })));
    });
  }

  private roundHeight() {
    const min = this.level.min ?? 3, max = this.eased ? Math.max(min, (this.level.max ?? 6) - 2) : this.level.max ?? 6;
    this.targetCount = Phaser.Math.Between(min, max);
    this.say(`Build a tower ${this.targetCount} blocks tall!`);
    this.targetLine = this.add.graphics().setDepth(6);
    const ly = this.groundY - this.targetCount * BLOCK;
    this.targetLine.lineStyle(6, PALETTE.gold, 1).lineBetween(this.towerX - 90, ly, this.towerX + 90, ly);
    this.add.existing(this.targetLine);
    const flag = this.add.text(this.towerX + 100, ly, String(this.targetCount), displayStyle(40, HEX.gold)).setOrigin(0, 0.5).setDepth(6);
    this.extras.push(flag);
    this.paletteChips(this.colors.slice(0, 3).map(color => ({ key: color, color })), color => {
      if (this.blocks.length >= 12) return;
      this.stackBlock(color);
      this.ctx.audio.playCount(this.blocks.length);
      this.ctx.voice.say(String(this.blocks.length));
      this.showDone(() => this.smash(() => this.answer(this.blocks.length === this.targetCount, "counting", String(this.targetCount), { x: this.towerX, y: ly })));
    });
  }

  private roundShapes() {
    const shapes = this.level.shapes ?? ["circle", "square", "triangle"];
    const target = Phaser.Utils.Array.GetRandom(shapes);
    const options = Phaser.Utils.Array.Shuffle([...shapes]).slice(0, this.eased ? 2 : shapes.length);
    if (!options.includes(target)) options[0] = target;
    this.say(`Tap the ${target.toUpperCase()}!`, `Find the ${target} and add it to the tower!`);
    this.paletteChips(Phaser.Utils.Array.Shuffle(options).map(shape => ({ key: shape, shape })), shape => {
      const right = shape === target;
      if (right) { this.stackBlock(Phaser.Utils.Array.GetRandom(this.colors), shape); this.ctx.voice.say(`${shape}!`); }
      this.time.delayedCall(right ? 400 : 0, () => { if (right && this.round + 1 >= this.totalRounds) this.smash(() => this.answer(true, "shapes", target)); else this.answer(right, "shapes", target, right ? { x: this.towerX, y: this.groundY - 60 } : undefined); });
    });
    const idx = options.indexOf(target);
    const chip = this.palette[idx];
    if (chip) this.hintAt = { x: chip.x, y: chip.y };
  }

  private roundBridge() {
    const min = this.level.min ?? 2, max = this.eased ? min : this.level.max ?? 4;
    this.targetCount = Phaser.Math.Between(min, max);
    this.say(`Put ${this.targetCount} blocks in the hole so the car can cross!`);
    this.paletteChips(this.colors.slice(0, 3).map(color => ({ key: color, color })), color => {
      if (this.blocks.length >= 8) return;
      const b = this.makeBlock(this.gapX + Phaser.Math.Between(-10, 10), this.groundY - 200 - this.blocks.length * 10, color, "square", true);
      this.ctx.audio.play("pop");
      this.ctx.audio.playCount(this.blocks.length);
      this.ctx.voice.say(String(this.blocks.length));
      void b;
      this.showDone(() => this.driveAcross());
    });
  }

  private driveAcross() {
    this.locked = true;
    this.palette.forEach(p => p.setAlpha(0.4));
    const car = new Car(this, -140, this.groundY - 26, PALETTE.orange, 1, 120).setDepth(40);
    car.speed = 400;
    this.ctx.voice.say("Here comes the race car!");
    const enough = this.blocks.length === this.targetCount;
    this.tweens.add({ targets: car, x: enough ? this.W + 160 : this.gapX, duration: enough ? 2200 : 1100, ease: "Linear", onComplete: () => {
      if (enough) { this.locked = false; this.answer(true, "counting", String(this.targetCount), { x: this.gapX, y: this.groundY - 60 }); return; }
      this.ctx.audio.play("crash");
      shake(this.motion, 0.005, 200);
      this.tweens.add({ targets: car, y: this.groundY + 120, angle: 25, duration: 500, ease: "Quad.easeIn", onComplete: () => { car.destroy(); this.locked = false; this.palette.forEach(p => p.setAlpha(1)); this.answer(false, "counting", String(this.targetCount)); this.blocks.forEach(b => b.destroy()); this.blocks = []; this.doneChip?.destroy(); this.doneChip = null; } });
    } });
  }

  private showDone(onDone: () => void) {
    if (this.doneChip) return;
    this.doneChip = new Chip(this, this.portrait ? this.W / 2 : this.W * 0.2, this.groundY - 60, "Done!", { width: 200, height: 84, fill: PALETTE.orange, onTap: () => { if (this.locked) return; this.ctx.audio.play("tap"); onDone(); } });
    this.doneChip.setDepth(30).setScale(0);
    this.tweens.add({ targets: this.doneChip, scale: 1, duration: 240, ease: "Back.easeOut" });
  }

  /** Turns the static tower into physics bodies and knocks it down. Knocking things down is the point. */
  private smash(then: () => void) {
    this.locked = true;
    this.doneChip?.destroy(); this.doneChip = null;
    this.say("SMASH!", "Now… SMASH it!");
    const car = new Car(this, -140, this.groundY - 26, PALETTE.blue, 2, 120).setDepth(40);
    car.speed = 500;
    this.blocks.forEach(b => this.matter.add.gameObject(b, { shape: { type: "rectangle", width: BLOCK, height: BLOCK }, restitution: 0.2, friction: 0.6 }));
    this.tweens.add({ targets: car, x: this.towerX - 40, duration: 700, ease: "Quad.easeIn", onComplete: () => {
      this.ctx.audio.play("crash");
      shake(this.motion, 0.008, 260);
      dustPuff(this, this.towerX, this.groundY, 18);
      this.blocks.forEach((b, i) => { const body = b.body as MatterJS.BodyType; if (body) this.matter.body.applyForce(body, body.position, { x: 0.08 + i * 0.01, y: -0.03 - Math.random() * 0.03 }); });
      this.tweens.add({ targets: car, x: this.W + 200, duration: 900, ease: "Quad.easeOut", onComplete: () => car.destroy() });
      sparkles(this, this.towerX, this.groundY - 120, 16, PALETTE.gold);
      this.time.delayedCall(1300, () => { this.locked = false; then(); });
    } });
  }

  showHint() {
    if (this.level.mode === "pattern") {
      const expected = this.targetSeq[this.blocks.length];
      const chip = this.palette.find(p => this.paletteColorOf(p) === expected);
      if (chip) { hintGlow(this.motion, chip.x, chip.y, 70); this.helper.pointAt(chip.x, chip.y); }
      this.ctx.voice.say(`The next block is ${COLOR_NAMES[expected] ?? "this color"}. Look at the little tower!`);
      return;
    }
    if (this.level.mode === "height" || this.level.mode === "bridge") {
      const have = this.blocks.length;
      if (have < this.targetCount) { const chip = this.palette[0]; if (chip?.x) hintGlow(this.motion, chip.x, chip.y, 70); this.ctx.voice.say(`We have ${have}. We need ${this.targetCount}. Add ${this.targetCount - have} more!`); }
      else if (have === this.targetCount && this.doneChip) { hintGlow(this.motion, this.doneChip.x, this.doneChip.y, 110); this.ctx.voice.say("That's it! Tap Done."); }
      else { this.ctx.voice.say(`That's too many. We need ${this.targetCount}. Let's start again.`); this.startRound(); }
      return;
    }
    if (this.hintAt) { hintGlow(this.motion, this.hintAt.x, this.hintAt.y, 70); this.helper.pointAt(this.hintAt.x, this.hintAt.y); }
  }

  private paletteColorOf(chip: Chip): string | null {
    const stored = chip.getData("paletteColor");
    return typeof stored === "string" ? stored : null;
  }
}
