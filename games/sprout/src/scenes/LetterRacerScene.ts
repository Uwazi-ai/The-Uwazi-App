import Phaser from "phaser";
import { LevelScene } from "./LevelScene";
import { DATA } from "../games";
import { Car } from "../actors/car";
import { drawWordIcon } from "../actors/icons";
import { displayStyle } from "../ui/widgets";
import { HEX, PALETTE } from "../config";
import { hintGlow } from "../systems/motion";
import { sparkles } from "../systems/particles";
import { pickItem } from "../systems/mastery";
import { ALPHABET, LETTER_SOUNDS } from "../data/words";
import type { SkillId } from "../types";

type Mode = "sound" | "name" | "beginning" | "cvc";
interface Level { name: string; mode: Mode; gates: number; choices: number; letters?: string[]; words?: string[]; skill: SkillId; trophy: string }

interface Gate { container: Phaser.GameObjects.Container; signs: { lane: number; letter: string; chip: Phaser.GameObjects.Container }[]; answer: string; resolved: boolean }

/**
 * Top-down road. Gates roll toward the car and wait at the decision line until Kaleb taps a
 * letter sign; the car steers into that lane and drives through. No timers.
 */
export class LetterRacerScene extends LevelScene {
  readonly gameId = "letter-racer" as const;
  readonly levelCount = DATA.letterRacer.levels.length;
  private level!: Level;
  private road!: Phaser.GameObjects.Graphics;
  private roadX = 0;
  private roadW = 0;
  private lanes = 2;
  private scroll = 0;
  private speed = 220;
  private car!: Car;
  private rival!: Car;
  private gate: Gate | null = null;
  private carY = 0;
  private decisionY = 0;
  private spellWord = "";
  private spellIndex = 0;
  private spellText: Phaser.GameObjects.Text | null = null;
  private promptIcon: Phaser.GameObjects.Container | null = null;

  constructor() { super("LetterRacer"); }

  buildLevel() {
    this.level = DATA.letterRacer.levels[this.levelIndex] as Level;
    this.totalRounds = this.level.gates;
    this.lanes = Math.max(2, this.level.choices);
    this.cameras.main.setBackgroundColor("#3E7B3A");
    this.roadW = Math.min(this.W - 40, 220 * this.lanes);
    this.roadX = (this.W - this.roadW) / 2;
    this.road = this.add.graphics().setDepth(-5);
    const grass = this.add.graphics().setDepth(-6);
    grass.fillStyle(PALETTE.greenLight, 1).fillRect(0, 0, this.W, this.H);
    for (let i = 0; i < 40; i += 1) grass.fillStyle(PALETTE.green, 0.7).fillEllipse(Math.random() * this.W, Math.random() * this.H, 30 + Math.random() * 40, 14);
    this.carY = this.H - 170;
    this.decisionY = this.carY - 230;
    const carLength = Math.min(130, (this.roadW / this.lanes) * 0.8);
    this.car = new Car(this, this.laneX(0), this.carY, PALETTE.orange, 1, carLength, true);
    this.car.setDepth(12);
    this.car.speed = this.speed;
    this.rival = new Car(this, this.laneX(this.lanes - 1), this.carY - 40, PALETTE.blue, 2, carLength, true);
    this.rival.setDepth(11);
    this.rival.speed = this.speed;
    if (this.level.mode === "cvc") this.spellText = this.add.text(this.W / 2, 185, "", displayStyle(44, HEX.gold)).setOrigin(0.5).setDepth(200);
  }

  private laneX(lane: number) { return this.roadX + (this.roadW / this.lanes) * (lane + 0.5); }

  private drawRoad() {
    const g = this.road;
    g.clear();
    g.fillStyle(PALETTE.asphalt, 1).fillRect(this.roadX, 0, this.roadW, this.H);
    g.fillStyle(PALETTE.gold, 1);
    for (let lane = 1; lane < this.lanes; lane += 1) {
      const x = this.roadX + (this.roadW / this.lanes) * lane;
      for (let y = (this.scroll % 80) - 80; y < this.H; y += 80) g.fillRect(x - 4, y, 8, 40);
    }
    g.fillStyle(0xffffff, 1).fillRect(this.roadX - 8, 0, 8, this.H).fillRect(this.roadX + this.roadW, 0, 8, this.H);
  }

  update(_t: number, delta: number) {
    if (!this.road) return;
    const dy = (this.speed * delta) / 1000;
    this.scroll += dy;
    this.drawRoad();
    if (this.gate && !this.gate.resolved) {
      const target = this.decisionY;
      if (this.gate.container.y < target) this.gate.container.y = Math.min(target, this.gate.container.y + dy);
    } else if (this.gate) {
      this.gate.container.y += dy * 1.6;
      if (this.gate.container.y > this.H + 160) { this.gate.container.destroy(); this.gate = null; }
    }
    this.rival.y += Math.sin(this.scroll / 300) * 0.3;
  }

  startRound() {
    this.promptIcon?.destroy(); this.promptIcon = null;
    const level = this.level;
    const mastery = this.ctx.save.mastery;
    const skill: SkillId = level.skill;
    let answer = "", item = "", text = "", spoken = "";
    const choices = this.eased ? 2 : level.choices;
    if (level.mode === "sound" || level.mode === "name") {
      answer = pickItem(mastery, skill, level.letters ?? ALPHABET, Date.now());
      item = answer;
      const sound = LETTER_SOUNDS[answer];
      text = level.mode === "sound" ? `Drive through ${sound}… ${answer.toUpperCase()}!` : `Find the letter ${answer.toUpperCase()}`;
      spoken = level.mode === "sound" ? `Drive through the letter that says ${sound}. ${sound}!` : `Drive through the letter ${answer.toUpperCase()}.`;
    } else if (level.mode === "beginning") {
      const word = pickItem(mastery, skill, level.words ?? [], Date.now());
      answer = word[0]; item = word;
      text = `What does ${word.toUpperCase()} start with?`;
      spoken = `${word}. What sound does ${word} start with?`;
      this.promptIcon = drawWordIcon(this, word, 90).setPosition(this.W / 2, 200).setDepth(200);
    } else {
      if (!this.spellWord || this.spellIndex >= this.spellWord.length) {
        this.spellWord = pickItem(mastery, "cvcWords", level.words ?? [], Date.now());
        this.spellIndex = 0;
        this.promptIcon = drawWordIcon(this, this.spellWord, 80).setPosition(this.W / 2, 250).setDepth(200);
      }
      answer = this.spellWord[this.spellIndex]; item = this.spellWord;
      const shown = this.spellWord.split("").map((ch, i) => (i < this.spellIndex ? ch.toUpperCase() : "_")).join(" ");
      this.spellText?.setText(shown);
      text = `Spell ${this.spellWord.toUpperCase()}: next letter ${LETTER_SOUNDS[answer]}`;
      spoken = this.spellIndex === 0 ? `Let's spell ${this.spellWord}. The first sound is ${LETTER_SOUNDS[answer]}.` : `Next sound: ${LETTER_SOUNDS[answer]}.`;
    }
    this.say(text, spoken);
    const pool = (level.letters ?? ALPHABET).filter(l => l !== answer);
    const options = Phaser.Utils.Array.Shuffle([answer, ...Phaser.Utils.Array.Shuffle(pool.length ? pool : ALPHABET.filter(l => l !== answer)).slice(0, choices - 1)]);
    const laneSlots = Phaser.Utils.Array.Shuffle(Array.from({ length: this.lanes }, (_, i) => i)).slice(0, choices);
    this.spawnGate(options, laneSlots, answer, skill, item);
  }

  private spawnGate(letters: string[], lanes: number[], answer: string, skill: SkillId, item: string) {
    this.gate?.container.destroy();
    const container = this.add.container(0, -160).setDepth(10);
    const bar = this.add.graphics();
    bar.fillStyle(PALETTE.charcoal, 1).fillRect(this.roadX - 16, -14, this.roadW + 32, 28);
    bar.fillStyle(PALETTE.gold, 1);
    for (let x = this.roadX - 16; x < this.roadX + this.roadW + 16; x += 40) bar.fillRect(x, -14, 20, 28);
    container.add(bar);
    const signs: Gate["signs"] = [];
    const size = Math.min(130, (this.roadW / this.lanes) * 0.8);
    letters.forEach((letter, index) => {
      const lane = lanes[index];
      const chip = this.add.container(this.laneX(lane), -size * 0.55);
      const g = this.add.graphics();
      g.fillStyle(PALETTE.black, 0.5).fillRoundedRect(-size / 2 + 4, -size / 2 + 8, size, size, 20);
      g.fillStyle(0xfff6dc, 1).fillRoundedRect(-size / 2, -size / 2, size, size, 20);
      g.lineStyle(5, PALETTE.gold, 1).strokeRoundedRect(-size / 2, -size / 2, size, size, 20);
      chip.add([g, this.add.text(0, 0, this.level.mode === "name" || this.level.mode === "cvc" ? letter.toUpperCase() : `${letter.toUpperCase()}${letter}`, displayStyle(size * 0.5, HEX.charcoal)).setOrigin(0.5)]);
      chip.setSize(Math.max(96, size), Math.max(96, size)).setInteractive();
      chip.on(Phaser.Input.Events.POINTER_UP, () => this.choose(lane, letter));
      container.add(chip);
      signs.push({ lane, letter, chip });
    });
    this.gate = { container, signs, answer, resolved: false };
    this.gate.container.setData("skill", skill).setData("item", item);
  }

  private choose(lane: number, letter: string) {
    if (!this.gate || this.gate.resolved || this.locked) return;
    const gate = this.gate;
    const sign = gate.signs.find(s => s.lane === lane)!;
    this.tapFeedback(sign.chip);
    this.ctx.voice.say(letter.toUpperCase());
    this.tweens.add({ targets: this.car, x: this.laneX(lane), duration: 260, ease: "Sine.easeInOut" });
    const right = letter === gate.answer;
    const skill = gate.container.getData("skill") as SkillId, item = gate.container.getData("item") as string;
    if (!right) {
      this.car.bump();
      this.answer(false, skill, item);
      return;
    }
    gate.resolved = true;
    this.car.boost();
    this.ctx.audio.play("boost");
    sparkles(this, this.car.x, this.car.y - 60, 12, PALETTE.orange);
    this.tweens.add({ targets: this.rival, y: this.rival.y + 60, duration: 600, yoyo: true });
    if (this.level.mode === "cvc") {
      this.spellIndex += 1;
      const shown = this.spellWord.split("").map((ch, i) => (i < this.spellIndex ? ch.toUpperCase() : "_")).join(" ");
      this.spellText?.setText(shown);
      if (this.spellIndex >= this.spellWord.length) { this.ctx.voice.say(`${this.spellWord}! You spelled ${this.spellWord}!`); }
    }
    this.answer(true, skill, item, { x: this.car.x, y: this.car.y - 80 });
  }

  showHint() {
    if (!this.gate) return;
    const sign = this.gate.signs.find(s => s.letter === this.gate!.answer);
    if (!sign) return;
    const m = sign.chip.getWorldTransformMatrix();
    hintGlow(this.motion, m.tx, m.ty, 90);
    this.helper.pointAt(m.tx, m.ty);
    this.ctx.voice.say(`${LETTER_SOUNDS[this.gate.answer]}. That's the letter ${this.gate.answer.toUpperCase()}. Tap it!`);
  }

  protected finish() {
    // checkered flag sweep before the celebration
    const flag = this.add.graphics().setDepth(300);
    for (let y = -40; y < 40; y += 20) for (let x = 0; x < this.W; x += 20) flag.fillStyle(((x / 20 + (y + 40) / 20) % 2 === 0) ? 0xffffff : 0x111111, 1).fillRect(x, y, 20, 20);
    flag.setY(-60);
    this.tweens.add({ targets: flag, y: this.H + 60, duration: 900, ease: "Sine.easeIn" });
    this.speed = 600; this.car.speed = this.speed; this.car.boost();
    this.ctx.voice.say("Checkered flag! You win the race!");
    this.time.delayedCall(900, () => super.finish());
  }
}
