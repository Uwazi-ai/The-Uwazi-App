import Phaser from "phaser";
import { LevelScene } from "./LevelScene";
import { DATA } from "../games";
import { Dino, type DinoKind } from "../actors/dino";
import { Chip, displayStyle } from "../ui/widgets";
import { drawGarden } from "../ui/background";
import { HEX, PALETTE } from "../config";
import { hintGlow, pop, squash } from "../systems/motion";
import { dustPuff, leafBurst, sparkles } from "../systems/particles";
import { pickItem } from "../systems/mastery";
import type { SkillId } from "../types";

type Mode = "crack" | "feed" | "numeral" | "add" | "subtract";
interface Level { name: string; mode: Mode; rounds: number; min: number; max: number; skill: string; trophy: string }

const KINDS: DinoKind[] = ["stompy", "neckie", "trippy", "spikes"];

/** Counting, numerals, adding and taking away with eggs, berries and dinos. */
export class DinoEggHuntScene extends LevelScene {
  readonly gameId = "dino-egg-hunt" as const;
  readonly levelCount = DATA.dinoEggHunt.levels.length;
  private level!: Level;
  private groundY = 0;
  private stompy!: Dino;
  private stage!: Phaser.GameObjects.Container;
  private target = 0;
  private tapped = 0;
  private doneChip: Chip | null = null;
  private hintTargets: { x: number; y: number }[] = [];

  constructor() { super("DinoEggHunt"); }

  buildLevel() {
    this.level = DATA.dinoEggHunt.levels[this.levelIndex] as Level;
    this.totalRounds = this.level.rounds;
    this.groundY = drawGarden(this, { groundRatio: 0.8 });
    this.stompy = new Dino(this, this.portrait ? this.W * 0.78 : this.W * 0.85, this.groundY - 10, "stompy", this.portrait ? 48 : 60);
    this.stompy.setDepth(20);
    this.stage = this.add.container(0, 0).setDepth(10);
  }

  private range(): number {
    const { min, max } = this.level;
    const span = max - min;
    const cap = this.eased ? Math.max(min, min + Math.floor(span / 2)) : min + Math.min(span, Math.floor(span * (0.4 + this.difficulty * 0.3)));
    return Phaser.Math.Between(min, Math.max(min, cap));
  }

  startRound() {
    this.stage.removeAll(true);
    this.doneChip?.destroy(); this.doneChip = null;
    this.tapped = 0;
    this.hintTargets = [];
    switch (this.level.mode) {
      case "crack": return this.roundCrack();
      case "feed": return this.roundFeed();
      case "numeral": return this.roundNumeral();
      case "add": return this.roundAdd();
      case "subtract": return this.roundSubtract();
    }
  }

  /** Grid positions for n things in the play area. */
  private spots(n: number): { x: number; y: number }[] {
    const top = 200, bottom = this.groundY - 40, left = 40, right = this.portrait ? this.W - 40 : this.W * 0.68;
    const cols = n <= 4 ? n : n <= 8 ? 4 : n <= 12 ? 4 : 5;
    const rows = Math.ceil(n / cols);
    const cellW = (right - left) / cols, cellH = Math.min(150, (bottom - top) / rows);
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i += 1) {
      const c = i % cols, r = Math.floor(i / cols);
      out.push({ x: left + cellW * (c + 0.5), y: top + cellH * (r + 0.5) + (bottom - top - cellH * rows) / 2 });
    }
    return out;
  }

  private egg(x: number, y: number, size = 56): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.black, 0.3).fillEllipse(0, size * 0.75, size * 1.1, size * 0.3);
    g.fillStyle(0xfff3d6, 1).fillEllipse(0, 0, size, size * 1.35);
    g.fillStyle(PALETTE.teal, 1).fillCircle(-size * 0.15, -size * 0.2, size * 0.09).fillCircle(size * 0.2, size * 0.05, size * 0.11).fillCircle(-size * 0.05, size * 0.35, size * 0.07);
    c.add(g);
    c.setSize(Math.max(96, size * 1.4), Math.max(96, size * 1.6)).setInteractive();
    this.tweens.add({ targets: c, angle: { from: -3, to: 3 }, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.stage.add(c);
    return c;
  }

  private berry(x: number, y: number, size = 22): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.purple, 1).fillCircle(0, 0, size).fillCircle(-size * 0.5, -size * 0.4, size * 0.7).fillCircle(size * 0.5, -size * 0.4, size * 0.7);
    g.fillStyle(0xffffff, 0.5).fillCircle(-size * 0.3, -size * 0.4, size * 0.25);
    g.fillStyle(PALETTE.greenLight, 1).fillEllipse(0, -size * 1.0, size * 0.6, size * 0.4);
    c.add(g);
    c.setSize(96, 96);
    this.stage.add(c);
    return c;
  }

  private numeralEgg(x: number, y: number, n: number, onTap: () => void) {
    const c = this.egg(x, y, 60);
    c.add(this.add.text(0, 0, String(n), displayStyle(48, HEX.charcoal)).setOrigin(0.5));
    c.on(Phaser.Input.Events.POINTER_UP, () => { this.tapFeedback(c); onTap(); });
    return c;
  }

  private hatch(c: Phaser.GameObjects.Container, kind: DinoKind, name = true) {
    this.tweens.killTweensOf(c);
    this.ctx.audio.play("hatch");
    squash(this.motion, c, 1.25, 0.8);
    sparkles(this, c.x, c.y, 10);
    this.time.delayedCall(180, () => {
      c.removeAll(true);
      const baby = new Dino(this, 0, 10, kind, 60, true);
      c.add(baby);
      this.tweens.add({ targets: baby, y: 0, duration: 300, ease: "Back.easeOut" });
      if (name) this.ctx.voice.say(`Hi! I'm baby ${baby.dinoName}!`, { interrupt: false });
    });
  }

  private showDone(onDone: () => void) {
    if (this.doneChip) return;
    this.doneChip = new Chip(this, this.portrait ? this.W / 2 : this.W * 0.35, this.groundY + 55, "Done!", { width: 220, height: 84, fill: PALETTE.orange, onTap: () => { this.ctx.audio.play("tap"); onDone(); } });
    this.doneChip.setDepth(30).setScale(0);
    this.tweens.add({ targets: this.doneChip, scale: 1, duration: 260, ease: "Back.easeOut" });
  }

  private roundCrack() {
    this.target = this.range();
    const count = Math.min(14, this.target + Phaser.Math.Between(2, 3));
    this.say(`Crack ${this.target} eggs!`);
    const item = String(this.target);
    const eggs = this.spots(count).map(spot => this.egg(spot.x, spot.y, this.portrait ? 44 : 52));
    this.hintTargets = eggs.map(e => ({ x: e.x, y: e.y }));
    eggs.forEach((egg, index) => egg.once(Phaser.Input.Events.POINTER_UP, () => {
      if (this.locked) return;
      this.tapped += 1;
      this.ctx.audio.playCount(this.tapped);
      this.ctx.voice.say(String(this.tapped));
      this.hatch(egg, KINDS[index % KINDS.length], false);
      egg.disableInteractive();
      this.hintTargets = eggs.filter((_, i) => eggs[i].input?.enabled).map(e => ({ x: e.x, y: e.y }));
      this.showDone(() => this.answer(this.tapped === this.target, "counting", item, { x: this.W / 2, y: this.H / 2 }));
    }));
  }

  private roundFeed() {
    this.target = this.range();
    const count = Math.min(10, this.target + 2);
    this.say(`Feed Stompy ${this.target} berries!`);
    const item = String(this.target);
    const mouth = this.stompy.mouthPoint();
    const berries = this.spots(count).map(spot => this.berry(spot.x, spot.y));
    this.hintTargets = berries.map(b => ({ x: b.x, y: b.y }));
    berries.forEach(b => {
      b.setInteractive({ draggable: true, useHandCursor: true });
      b.on(Phaser.Input.Events.DRAG, (_p: Phaser.Input.Pointer, x: number, y: number) => { b.setPosition(x, y); b.setDepth(50); });
      b.on(Phaser.Input.Events.DRAG_END, () => {
        if (this.locked) return;
        if (Phaser.Math.Distance.Between(b.x, b.y, mouth.x, mouth.y) < 110) {
          this.tapped += 1;
          this.ctx.audio.playCount(this.tapped);
          this.ctx.voice.say(String(this.tapped));
          this.stompy.chomp();
          b.disableInteractive();
          this.tweens.add({ targets: b, x: mouth.x, y: mouth.y, scale: 0.2, alpha: 0, duration: 200, onComplete: () => b.destroy() });
          this.showDone(() => this.answer(this.tapped === this.target, "counting", item, { x: mouth.x, y: mouth.y }));
        } else {
          this.tweens.add({ targets: b, x: b.input!.dragStartX, y: b.input!.dragStartY, duration: 250, ease: "Back.easeOut" });
        }
      });
      b.on(Phaser.Input.Events.POINTER_DOWN, () => this.ctx.audio.play("tap"));
    });
  }

  private roundNumeral() {
    const pool = Array.from({ length: this.level.max - this.level.min + 1 }, (_, i) => String(this.level.min + i));
    const item = pickItem(this.ctx.save.mastery, "numerals", pool, Date.now());
    this.target = Number(item);
    const choices = this.eased ? 2 : 3;
    const options = Phaser.Utils.Array.Shuffle([item, ...Phaser.Utils.Array.Shuffle(pool.filter(p => p !== item)).slice(0, choices - 1)]);
    this.say(`Find the number ${this.target}!`);
    this.stompy.roar(400);
    this.ctx.audio.play("roar");
    const spots = this.spots(choices);
    options.forEach((option, index) => {
      const egg = this.numeralEgg(spots[index].x, spots[index].y, Number(option), () => {
        const right = option === item;
        if (right) this.hatch(egg, KINDS[this.round % KINDS.length]);
        this.answer(right, "numerals", item, { x: egg.x, y: egg.y });
      });
      if (option === item) this.hintTargets = [{ x: egg.x, y: egg.y }];
    });
  }

  private berryGroup(x: number, y: number, n: number, color?: number) {
    const spacing = 44;
    const out: Phaser.GameObjects.Container[] = [];
    for (let i = 0; i < n; i += 1) {
      const row = Math.floor(i / 5), col = i % 5;
      const b = this.berry(x + (col - Math.min(n, 5) / 2 + 0.5) * spacing, y + row * spacing, 16);
      if (color) { const g = b.list[0] as Phaser.GameObjects.Graphics; g.clear().fillStyle(color, 1).fillCircle(0, 0, 16).fillCircle(-8, -6, 11).fillCircle(8, -6, 11); }
      out.push(b);
    }
    return out;
  }

  private numberChoices(answer: number, skill: SkillId, item: string, y: number) {
    const choices = this.eased ? 2 : 3;
    const pool = new Set<number>([answer]);
    while (pool.size < choices) { const alt = Phaser.Math.Clamp(answer + Phaser.Math.Between(-2, 2), 0, 20); if (alt !== answer) pool.add(alt); }
    const options = Phaser.Utils.Array.Shuffle(Array.from(pool));
    const spacing = Math.min(160, (this.portrait ? this.W - 60 : this.W * 0.6) / choices);
    options.forEach((option, index) => {
      const x = (this.portrait ? this.W / 2 : this.W * 0.35) + (index - (choices - 1) / 2) * spacing;
      const egg = this.numeralEgg(x, y, option, () => this.answer(option === answer, skill, item, { x, y }));
      if (option === answer) this.hintTargets = [{ x, y }];
    });
  }

  private roundAdd() {
    const a = this.range(), b = Phaser.Math.Between(1, this.eased ? 2 : this.level.max);
    const item = `${a}+${b}`;
    this.say(`${a} berries and ${b} berries. How many altogether?`, `${a} berries, plus ${b} berries. How many berries altogether?`);
    const cx = this.portrait ? this.W / 2 : this.W * 0.35, y = 250;
    this.berryGroup(cx - 110, y, a, PALETTE.purple);
    this.berryGroup(cx + 110, y, b, PALETTE.red);
    this.stage.add(this.add.text(cx, y + 10, "+", displayStyle(56, HEX.gold)).setOrigin(0.5));
    this.numberChoices(a + b, "adding", item, this.groundY - 90);
  }

  private roundSubtract() {
    const a = Math.max(2, this.range()), b = Phaser.Math.Between(1, Math.min(a - 1, this.eased ? 2 : a - 1));
    const item = `${a}-${b}`;
    this.say(`${a} berries. Stompy eats ${b}. How many are left?`);
    const cx = this.portrait ? this.W / 2 : this.W * 0.35, y = 250;
    const berries = this.berryGroup(cx, y, a);
    const mouth = this.stompy.mouthPoint();
    berries.slice(0, b).forEach((berry, i) => this.time.delayedCall(700 + i * 450, () => {
      this.stompy.chomp();
      this.ctx.audio.play("pop");
      this.tweens.add({ targets: berry, x: mouth.x, y: mouth.y, scale: 0.2, alpha: 0, duration: 350 });
    }));
    this.time.delayedCall(700 + b * 450 + 300, () => this.numberChoices(a - b, "subtracting", item, this.groundY - 90));
  }

  showHint() {
    if (this.level.mode === "crack" || this.level.mode === "feed") {
      if (this.tapped < this.target && this.hintTargets.length) { const t = this.hintTargets[0]; hintGlow(this.motion, t.x, t.y, 60); this.helper.pointAt(t.x, t.y); this.ctx.voice.say(`We need ${this.target}. You have ${this.tapped}. Keep going!`); return; }
      if (this.tapped === this.target && this.doneChip) { hintGlow(this.motion, this.doneChip.x, this.doneChip.y, 120); this.ctx.voice.say("That's it! Tap Done."); return; }
      this.ctx.voice.say(`We only needed ${this.target}. Let's try the next one.`);
      this.startRound();
      return;
    }
    const t = this.hintTargets[0];
    if (t) { hintGlow(this.motion, t.x, t.y, 70); this.helper.pointAt(t.x, t.y); }
    leafBurst(this, this.helper.x, this.helper.y, 6);
    dustPuff(this, this.helper.x, this.helper.y + 40, 4);
    pop(this.motion, this.helper);
  }
}
