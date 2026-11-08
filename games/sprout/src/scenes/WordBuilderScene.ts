import Phaser from "phaser";
import { LevelScene } from "./LevelScene";
import { DATA } from "../games";
import { drawWordIcon } from "../actors/icons";
import { displayStyle } from "../ui/widgets";
import { drawGarden } from "../ui/background";
import { HEX, PALETTE } from "../config";
import { hintGlow } from "../systems/motion";
import { sparkles } from "../systems/particles";
import { pickItem } from "../systems/mastery";
import { ALPHABET, LETTER_SOUNDS } from "../data/words";
import type { SkillId } from "../types";

interface Level { name: string; mode: "cvc" | "sight"; rounds: number; words: string[]; extraTiles: number; skill: SkillId; trophy: string }
interface Slot { x: number; y: number; letter: string; filled: boolean; g: Phaser.GameObjects.Graphics }

/** Drag letter tiles into slots to spell a word, then watch the word come alive. */
export class WordBuilderScene extends LevelScene {
  readonly gameId = "word-builder" as const;
  readonly levelCount = DATA.wordBuilder.levels.length;
  private level!: Level;
  private stage!: Phaser.GameObjects.Container;
  private slots: Slot[] = [];
  private word = "";
  private roundClean = true;
  private groundY = 0;

  constructor() { super("WordBuilder"); }

  buildLevel() {
    this.level = DATA.wordBuilder.levels[this.levelIndex] as Level;
    this.totalRounds = this.level.rounds;
    this.groundY = drawGarden(this, { groundRatio: 0.8 });
    this.stage = this.add.container(0, 0).setDepth(10);
  }

  startRound() {
    this.stage.removeAll(true);
    this.slots = [];
    this.roundClean = true;
    this.word = pickItem(this.ctx.save.mastery, this.level.skill, this.level.words, Date.now());
    const spokenLetters = this.level.mode === "cvc" ? this.word.split("").map(l => LETTER_SOUNDS[l]).join(", ") : this.word.split("").map(l => l.toUpperCase()).join(", ");
    this.say(`Spell ${this.word.toUpperCase()}`, `Let's spell ${this.word}. ${spokenLetters}. ${this.word}!`);
    const icon = drawWordIcon(this, this.word, Math.min(140, this.W * 0.25));
    icon.setPosition(this.W / 2, 250);
    this.stage.add(icon);
    const tile = Math.min(110, (this.W - 60) / Math.max(this.word.length, 4) - 12);
    const slotY = this.portrait ? 400 : this.H * 0.5;
    this.word.split("").forEach((letter, index) => {
      const x = this.W / 2 + (index - (this.word.length - 1) / 2) * (tile + 12);
      const g = this.add.graphics();
      g.fillStyle(PALETTE.black, 0.35).fillRoundedRect(x - tile / 2, slotY - tile / 2, tile, tile, 16);
      g.lineStyle(4, PALETTE.gold, 0.8).strokeRoundedRect(x - tile / 2, slotY - tile / 2, tile, tile, 16);
      this.stage.add(g);
      this.slots.push({ x, y: slotY, letter, filled: false, g });
    });
    const extras = Phaser.Utils.Array.Shuffle(ALPHABET.filter(l => !this.word.includes(l))).slice(0, this.eased ? Math.max(0, this.level.extraTiles - 1) : this.level.extraTiles);
    const letters = Phaser.Utils.Array.Shuffle([...this.word.split(""), ...extras]);
    const tileY = Math.min(this.groundY + 40, this.H - 150);
    const perRow = Math.max(1, Math.floor((this.W - 40) / (tile + 12)));
    letters.forEach((letter, index) => {
      const row = Math.floor(index / perRow), col = index % perRow, inRow = Math.min(perRow, letters.length - row * perRow);
      const x = this.W / 2 + (col - (inRow - 1) / 2) * (tile + 12), y = tileY + row * (tile + 12);
      this.makeTile(x, y, tile, letter);
    });
  }

  private makeTile(x: number, y: number, size: number, letter: string) {
    const c = this.add.container(x, y).setDepth(20);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.black, 0.5).fillRoundedRect(-size / 2 + 4, -size / 2 + 8, size, size, 16);
    g.fillStyle(0xfff6dc, 1).fillRoundedRect(-size / 2, -size / 2, size, size, 16);
    g.lineStyle(4, PALETTE.gold, 1).strokeRoundedRect(-size / 2, -size / 2, size, size, 16);
    c.add([g, this.add.text(0, 0, letter.toUpperCase(), displayStyle(size * 0.55, HEX.charcoal)).setOrigin(0.5)]);
    c.setSize(Math.max(96, size), Math.max(96, size)).setInteractive({ draggable: true, useHandCursor: true });
    c.on(Phaser.Input.Events.POINTER_DOWN, () => { this.ctx.audio.play("tap"); this.ctx.voice.say(this.level.mode === "cvc" ? LETTER_SOUNDS[letter] : letter.toUpperCase()); c.setDepth(30); });
    c.on(Phaser.Input.Events.DRAG, (_p: Phaser.Input.Pointer, dx: number, dy: number) => c.setPosition(dx, dy));
    c.on(Phaser.Input.Events.DRAG_END, () => this.drop(c, letter, size));
    this.stage.add(c);
    return c;
  }

  private drop(tile: Phaser.GameObjects.Container, letter: string, size: number) {
    if (this.locked) return;
    const slot = this.slots.find(s => !s.filled && Phaser.Math.Distance.Between(tile.x, tile.y, s.x, s.y) < size * 0.7);
    const back = () => this.tweens.add({ targets: tile, x: tile.input!.dragStartX, y: tile.input!.dragStartY, duration: 260, ease: "Back.easeOut", onComplete: () => tile.setDepth(20) });
    if (!slot) return back();
    if (slot.letter !== letter) {
      this.roundClean = false;
      this.ctx.audio.play("wrong");
      this.ctx.voice.say(`${letter.toUpperCase()} doesn't go there. Try again, hero!`);
      this.misses += 1;
      this.adaptiveMiss();
      return back();
    }
    slot.filled = true;
    tile.disableInteractive();
    this.ctx.audio.play("pop");
    this.tweens.add({ targets: tile, x: slot.x, y: slot.y, duration: 160, ease: "Back.easeOut" });
    sparkles(this, slot.x, slot.y, 8);
    this.ctx.voice.say(letter.toUpperCase());
    if (this.slots.every(s => s.filled)) {
      this.time.delayedCall(500, () => {
        this.ctx.voice.say(`${this.word}! You spelled ${this.word}!`);
        this.animateWord();
        this.time.delayedCall(1400, () => { const wasClean = this.roundClean; this.roundFirstTry = wasClean; this.answer(true, this.level.skill, this.word, { x: this.W / 2, y: 250 }); });
      });
    }
  }

  /** Counts a wrong drop toward hints without ending the round. */
  private adaptiveMiss() {
    this.roundFirstTry = false;
    const before = this.adaptive;
    this.adaptive = { ...before, missRun: before.missRun + 1 };
    if (this.adaptive.missRun >= 2) { this.adaptive = { ...this.adaptive, missRun: 0, hintsShown: this.adaptive.hintsShown + 1 }; this.time.delayedCall(700, () => this.showHint()); }
  }

  private animateWord() {
    const icon = this.stage.list.find(item => item instanceof Phaser.GameObjects.Container && (item as Phaser.GameObjects.Container).y === 250) as Phaser.GameObjects.Container | undefined;
    if (!icon) return;
    this.ctx.audio.play("sparkle");
    if (["run", "hop", "jump", "cat", "dog", "car", "bus", "van", "go"].includes(this.word)) this.tweens.add({ targets: icon, x: this.W + 120, duration: 1200, ease: "Quad.easeIn", onUpdate: () => { if (["hop", "jump"].includes(this.word)) icon.setY(250 - Math.abs(Math.sin(icon.x / 60)) * 60); } });
    else if (["sun", "up", "star", "moon"].includes(this.word)) this.tweens.add({ targets: icon, y: 120, scale: 1.3, duration: 1000, ease: "Sine.easeOut" });
    else this.tweens.add({ targets: icon, scale: 1.3, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: 4 });
  }

  showHint() {
    const slot = this.slots.find(s => !s.filled);
    if (!slot) return;
    hintGlow(this.motion, slot.x, slot.y, 70);
    const tile = this.stage.list.find(item => item instanceof Phaser.GameObjects.Container && item.input?.enabled && (item.list[1] as Phaser.GameObjects.Text)?.text === slot.letter.toUpperCase()) as Phaser.GameObjects.Container | undefined;
    if (tile) { hintGlow(this.motion, tile.x, tile.y, 70, PALETTE.orange); this.helper.pointAt(tile.x, tile.y); }
    this.ctx.voice.say(`We need ${this.level.mode === "cvc" ? LETTER_SOUNDS[slot.letter] : slot.letter.toUpperCase()}, the letter ${slot.letter.toUpperCase()}. Drag it here.`);
  }
}
