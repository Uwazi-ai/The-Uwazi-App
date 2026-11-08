import Phaser from "phaser";
import { LevelScene } from "./LevelScene";
import { DATA } from "../games";
import { Dino, type DinoKind } from "../actors/dino";
import { drawWordIcon } from "../actors/icons";
import { Chip, displayStyle } from "../ui/widgets";
import { drawGarden } from "../ui/background";
import { HEX, PALETTE } from "../config";
import { hintGlow } from "../systems/motion";
import { pickItem } from "../systems/mastery";
import { MicMeter } from "../systems/mic";
import { sparkles } from "../systems/particles";

interface Level { name: string; rounds: number; choices: number; families: string[]; skill: string; trophy: string }
const KINDS: DinoKind[] = ["stompy", "trippy", "spikes", "neckie"];

/** A dino roars a word; Kaleb picks the picture that rhymes. Correct answers fill the roar meter. */
export class RhymeRoarScene extends LevelScene {
  readonly gameId = "rhyme-roar" as const;
  readonly levelCount = DATA.rhymeRoar.levels.length;
  private level!: Level;
  private dino!: Dino;
  private stage!: Phaser.GameObjects.Container;
  private meter!: Phaser.GameObjects.Graphics;
  private hintAt: { x: number; y: number } | null = null;
  private mic = new MicMeter();

  constructor() { super("RhymeRoar"); }

  buildLevel() {
    this.level = DATA.rhymeRoar.levels[this.levelIndex] as Level;
    this.totalRounds = this.level.rounds;
    const groundY = drawGarden(this, { groundRatio: 0.82 });
    this.dino = new Dino(this, this.portrait ? this.W * 0.5 : this.W * 0.2, this.portrait ? 290 : groundY - 20, KINDS[this.levelIndex % KINDS.length], this.portrait ? 52 : 70);
    this.dino.setDepth(10);
    this.stage = this.add.container(0, 0).setDepth(15);
    this.meter = this.add.graphics().setDepth(20);
    this.drawMeter(this.round / this.totalRounds);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.mic.stop());
  }

  private drawMeter(value: number) {
    const x = this.portrait ? 30 : this.W * 0.2 - 120, y = this.portrait ? 200 : 180, h = this.portrait ? 180 : 260, w = 28;
    this.meter.clear();
    this.meter.fillStyle(PALETTE.black, 0.6).fillRoundedRect(x - 4, y - 4, w + 8, h + 8, 12);
    this.meter.fillStyle(PALETTE.charcoal, 1).fillRoundedRect(x, y, w, h, 10);
    const fillH = h * Phaser.Math.Clamp(value, 0, 1);
    if (fillH > 0) this.meter.fillStyle(PALETTE.orange, 1).fillRoundedRect(x, y + h - fillH, w, fillH, 10);
    this.meter.lineStyle(3, PALETTE.gold, 1).strokeRoundedRect(x, y, w, h, 10);
  }

  protected updateProgress() { super.updateProgress(); if (this.meter) this.drawMeter(this.round / this.totalRounds); }

  startRound() {
    this.stage.removeAll(true);
    this.hintAt = null;
    const families = DATA.rhymeRoar.families as Record<string, string[]>;
    const familyKeys = this.level.families;
    const family = pickItem(this.ctx.save.mastery, "rhyming", familyKeys, Date.now());
    const words = Phaser.Utils.Array.Shuffle([...families[family]]);
    const prompt = words[0], answer = words[1];
    const choices = Math.max(2, this.eased ? 2 : this.level.choices);
    const distractors = Phaser.Utils.Array.Shuffle(familyKeys.filter(k => k !== family).flatMap(k => families[k])).slice(0, choices - 1);
    const options = Phaser.Utils.Array.Shuffle([answer, ...distractors]);
    this.say(`What rhymes with ${prompt.toUpperCase()}?`, `Roar! What rhymes with ${prompt}?`);
    this.dino.roar(500);
    this.ctx.audio.play("roar");
    const cardW = Math.min(170, (this.W - 40) / choices - 16), cardH = cardW * 1.25;
    const y = this.portrait ? this.H - 200 : this.H * 0.55;
    const startX = this.portrait ? this.W / 2 : this.W * 0.62;
    options.forEach((word, index) => {
      const x = startX + (index - (choices - 1) / 2) * (cardW + 16);
      const chip = new Chip(this, x, y, "", { width: cardW, height: cardH, fill: 0xfff6dc, border: PALETTE.gold, onTap: () => {
        this.ctx.voice.say(word);
        const right = word === answer;
        if (right) { sparkles(this, x, y); this.dino.roar(600); this.ctx.audio.play("roar"); }
        this.time.delayedCall(right ? 300 : 500, () => this.answer(right, "rhyming", family, { x, y }));
      } });
      const icon = drawWordIcon(this, word, cardW * 0.6);
      icon.setPosition(0, -cardH * 0.12);
      chip.add(icon);
      chip.add(this.add.text(0, cardH * 0.33, word, displayStyle(Math.min(30, cardW * 0.2), HEX.charcoal)).setOrigin(0.5));
      chip.setDepth(15).setAlpha(0).setY(y + 40);
      this.tweens.add({ targets: chip, alpha: 1, y, duration: 240, delay: index * 70, ease: "Back.easeOut" });
      this.stage.add(chip);
      if (word === answer) this.hintAt = { x, y };
    });
  }

  showHint() {
    if (!this.hintAt) return;
    hintGlow(this.motion, this.hintAt.x, this.hintAt.y, 110);
    this.helper.pointAt(this.hintAt.x, this.hintAt.y);
    this.ctx.voice.say("Listen to the ending sounds. This one!");
  }

  /** Bonus after the level: roar into the microphone (loudness only) or tap to roar. */
  protected finish() {
    this.locked = true;
    this.stage.removeAll(true);
    this.say("ROAR with me!", `Level done! Now roar with ${this.dino.dinoName}!`);
    const cx = this.W / 2, cy = this.portrait ? this.H - 220 : this.H * 0.55;
    const ring = this.add.circle(cx, cy, 90, PALETTE.orange, 0.3).setStrokeStyle(8, PALETTE.gold, 1).setDepth(30);
    let energy = 0;
    const bump = (amount: number) => { energy = Math.min(1, energy + amount); ring.setScale(1 + energy * 0.8); ring.setFillStyle(PALETTE.orange, 0.3 + energy * 0.5); };
    const tapZone = this.add.zone(cx, cy, 300, 300).setInteractive().setDepth(31);
    tapZone.on(Phaser.Input.Events.POINTER_DOWN, () => { bump(0.15); this.ctx.audio.play("roar"); this.dino.roar(300); });
    const label = this.add.text(cx, cy + 130, "Tap or ROAR!", displayStyle(30, HEX.gold)).setOrigin(0.5).setDepth(31);
    void this.mic.start(this.ctx.audio.audioContext).then(listening => { if (!listening) label.setText("Tap tap tap to roar!"); });
    const tick = this.time.addEvent({ delay: 60, loop: true, callback: () => { const level = this.mic.level(); if (level > 0.12) bump(level * 0.08); else energy = Math.max(0, energy - 0.004); ring.setScale(1 + energy * 0.8); } });
    this.time.delayedCall(4500, () => {
      tick.remove(); this.mic.stop(); tapZone.destroy();
      this.dino.roar(900); this.ctx.audio.play("roar");
      label.setText(energy > 0.6 ? "THUNDER ROAR!" : energy > 0.25 ? "Big roar!" : "Nice roar!");
      sparkles(this, cx, cy, 20, PALETTE.orange);
      this.time.delayedCall(1200, () => super.finish());
    });
  }
}
