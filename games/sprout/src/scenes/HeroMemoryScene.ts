import Phaser from "phaser";
import { LevelScene } from "./LevelScene";
import { DATA } from "../games";
import { Sprout } from "../actors/sprout";
import { Chip, displayStyle } from "../ui/widgets";
import { drawGarden } from "../ui/background";
import { HEX, PALETTE } from "../config";
import { hintGlow, shake } from "../systems/motion";
import { dustPuff, leafBurst } from "../systems/particles";

type Move = "stomp" | "roar" | "jump" | "spin";
interface Level { name: string; rounds: number; start: number; grow: number; moves: Move[]; skill: string; trophy: string }
const MOVE_LABEL: Record<Move, string> = { stomp: "Stomp", roar: "Roar", jump: "Jump", spin: "Spin" };
const MOVE_COLOR: Record<Move, number> = { stomp: PALETTE.sand, roar: PALETTE.orange, jump: PALETTE.blue, spin: PALETTE.purple };

/** Sprout performs a sequence of hero moves and Kaleb repeats it. */
export class HeroMemoryScene extends LevelScene {
  readonly gameId = "hero-memory" as const;
  readonly levelCount = DATA.heroMemory.levels.length;
  private level!: Level;
  private star!: Sprout;
  private sequence: Move[] = [];
  private entered: Move[] = [];
  private buttons = new Map<Move, Chip>();
  private watching = false;
  private groundY = 0;

  constructor() { super("HeroMemory"); }

  buildLevel() {
    this.level = DATA.heroMemory.levels[this.levelIndex] as Level;
    this.totalRounds = this.level.rounds;
    this.groundY = drawGarden(this, { groundRatio: 0.72 });
    this.star = new Sprout(this, this.W / 2, this.groundY - 110, Sprout.fromConfig(this.ctx.save.hero, this.ctx.faceTextureKey), this.portrait ? 70 : 85);
    this.star.setDepth(10);
    const moves = this.level.moves;
    const btnW = Math.min(200, (this.W - 40) / moves.length - 12);
    moves.forEach((move, index) => {
      const x = this.W / 2 + (index - (moves.length - 1) / 2) * (btnW + 12);
      const chip = new Chip(this, x, this.groundY + 70, MOVE_LABEL[move], { width: btnW, height: 96, fill: MOVE_COLOR[move], border: PALETTE.gold, fontSize: Math.min(32, btnW * 0.18), onTap: () => this.press(move) });
      chip.setDepth(20);
      this.buttons.set(move, chip);
    });
  }

  private perform(move: Move, speak = true) {
    const chip = this.buttons.get(move);
    if (chip) this.tweens.add({ targets: chip, scale: 1.1, duration: 120, yoyo: true });
    if (speak) this.ctx.voice.say(MOVE_LABEL[move], { interrupt: true });
    switch (move) {
      case "stomp": this.star.stomp(() => { this.ctx.audio.play("stomp"); shake(this.motion, 0.004, 150); dustPuff(this, this.star.x, this.star.y + 80, 12); }); break;
      case "roar": this.star.roar(500); this.ctx.audio.play("roar"); break;
      case "jump": this.ctx.audio.play("jump"); this.star.jump(120, () => dustPuff(this, this.star.x, this.star.y + 80, 8)); break;
      case "spin": this.ctx.audio.play("whoosh"); this.star.spin(); leafBurst(this, this.star.x, this.star.y, 8); break;
    }
  }

  startRound() {
    const length = this.level.start + this.round * this.level.grow - (this.eased && this.round > 0 ? 1 : 0);
    this.sequence = Array.from({ length: Math.max(2, length) }, () => Phaser.Utils.Array.GetRandom(this.level.moves));
    this.entered = [];
    this.say("Watch Super Sprout!", `Watch carefully! ${this.sequence.length} moves.`);
    this.showSequence();
  }

  private showSequence() {
    this.watching = true;
    this.buttons.forEach(chip => chip.setAlpha(0.5));
    this.sequence.forEach((move, index) => this.time.delayedCall(1200 + index * 1100, () => this.perform(move)));
    this.time.delayedCall(1200 + this.sequence.length * 1100, () => {
      this.watching = false;
      this.buttons.forEach(chip => chip.setAlpha(1));
      this.say("Your turn, hero!", "Your turn! Do the moves in order.");
    });
  }

  private press(move: Move) {
    if (this.watching || this.locked) return;
    this.ctx.audio.play("tap");
    const expected = this.sequence[this.entered.length];
    this.perform(move, false);
    if (move !== expected) {
      this.entered = [];
      this.answer(false, "memory", String(this.sequence.length), undefined);
      this.time.delayedCall(1400, () => { if (!this.locked) { this.say("Watch again!", "Let's watch it again."); this.showSequence(); } });
      return;
    }
    this.entered.push(move);
    this.ctx.voice.say(MOVE_LABEL[move]);
    if (this.entered.length === this.sequence.length) {
      this.time.delayedCall(500, () => this.answer(true, "memory", String(this.sequence.length), { x: this.star.x, y: this.star.y - 60 }));
    }
  }

  showHint() {
    const next = this.sequence[this.entered.length];
    const chip = this.buttons.get(next);
    if (chip) { hintGlow(this.motion, chip.x, chip.y, 80); this.helper.pointAt(chip.x, chip.y); }
    this.ctx.voice.say(`The next move is ${MOVE_LABEL[next]}.`);
  }
}
