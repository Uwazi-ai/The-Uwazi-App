import Phaser from "phaser";
import { LevelScene } from "./LevelScene";
import { DATA } from "../games";
import { Sprout } from "../actors/sprout";
import { drawGarden } from "../ui/background";
import { PALETTE } from "../config";
import { hintGlow } from "../systems/motion";
import { dustPuff, sparkles } from "../systems/particles";
import type { SkillId } from "../types";

type Relation = "under" | "over" | "on" | "behind" | "left" | "right";
interface Level { name: string; steps: number; rounds: number; relations: Relation[]; skill: SkillId; trophy: string }
interface Obstacle { key: string; label: string; x: number; y: number; container: Phaser.GameObjects.Container; w: number; h: number; relations: Relation[] }
interface Step { relation: Relation; obstacle: Obstacle; side?: "left" | "right" }

/** Follow 1–3 step directions with positional words by tapping park things in order. */
export class ParkCourseScene extends LevelScene {
  readonly gameId = "park-course" as const;
  readonly levelCount = DATA.parkCourse.levels.length;
  private level!: Level;
  private groundY = 0;
  private hero!: Sprout;
  private obstacles: Obstacle[] = [];
  private steps: Step[] = [];
  private stepIndex = 0;
  private busy = false;
  private homeX = 0;

  constructor() { super("ParkCourse"); }

  buildLevel() {
    this.level = DATA.parkCourse.levels[this.levelIndex] as Level;
    this.totalRounds = this.level.rounds;
    this.groundY = drawGarden(this, { groundRatio: 0.74, park: true });
    this.homeX = 70;
    this.buildPark();
    this.hero = new Sprout(this, this.homeX, this.groundY - 60, Sprout.fromConfig(this.ctx.save.hero, this.ctx.faceTextureKey), this.portrait ? 34 : 40);
    this.hero.setDepth(30);
  }

  private obstacle(key: string, label: string, x: number, w: number, h: number, relations: Relation[], draw: (g: Phaser.GameObjects.Graphics) => void) {
    const c = this.add.container(x, this.groundY).setDepth(20);
    const g = this.add.graphics();
    draw(g);
    c.add(g);
    const hw = Math.max(96, w), hh = Math.max(96, h);
    // the container sits on the ground line, so the hit box reaches up from it (origin-shifted by Phaser)
    c.setSize(hw, hh).setInteractive(new Phaser.Geom.Rectangle(0, -hh / 2, hw, hh), Phaser.Geom.Rectangle.Contains);
    c.on(Phaser.Input.Events.POINTER_UP, () => this.tapObstacle(ob));
    const ob: Obstacle = { key, label, x, y: this.groundY, container: c, w, h, relations };
    this.obstacles.push(ob);
    return ob;
  }

  private buildPark() {
    const W = this.W, s = this.portrait ? 0.7 : 1;
    const slots = [0.2, 0.42, 0.62, 0.84].map(f => W * f);
    const hasLR = this.level.relations.some(r => r === "left" || r === "right");
    // slide
    this.obstacle("slide", "the slide", slots[0], 150 * s, 130 * s, ["under", "over", "on"], g => {
      g.fillStyle(PALETTE.asphalt, 1).fillRect(-60 * s, -120 * s, 10 * s, 120 * s).fillRect(-30 * s, -120 * s, 10 * s, 120 * s);
      g.fillStyle(PALETTE.gold, 1).fillRect(-66 * s, -126 * s, 50 * s, 10 * s);
      g.lineStyle(14 * s, PALETTE.orange, 1).lineBetween(-20 * s, -120 * s, 70 * s, -8 * s);
      g.fillStyle(PALETTE.asphalt, 1); for (let i = 0; i < 5; i += 1) g.fillRect(-58 * s, -110 * s + i * 22 * s, 24 * s, 4 * s);
    });
    // swing(s)
    const swingDraw = (g: Phaser.GameObjects.Graphics) => {
      g.lineStyle(10 * s, PALETTE.asphalt, 1).lineBetween(-60 * s, 0, -30 * s, -130 * s).lineBetween(60 * s, 0, 30 * s, -130 * s).lineBetween(-36 * s, -130 * s, 36 * s, -130 * s);
      g.lineStyle(4 * s, 0xdddddd, 1).lineBetween(-16 * s, -126 * s, -16 * s, -40 * s).lineBetween(16 * s, -126 * s, 16 * s, -40 * s);
      g.fillStyle(PALETTE.red, 1).fillRoundedRect(-24 * s, -42 * s, 48 * s, 10 * s, 4);
    };
    if (hasLR) {
      this.obstacle("swingL", "the swing on the left", slots[1] - 70 * s, 130 * s, 135 * s, ["on", "under"], swingDraw);
      this.obstacle("swingR", "the swing on the right", slots[1] + 80 * s, 130 * s, 135 * s, ["on", "under"], swingDraw);
    } else {
      this.obstacle("swing", "the swing", slots[1], 130 * s, 135 * s, ["on", "under"], swingDraw);
    }
    // log
    this.obstacle("log", "the log", slots[2], 140 * s, 60 * s, ["over", "on", "behind"], g => {
      g.fillStyle(0x8a5a2b, 1).fillRoundedRect(-70 * s, -50 * s, 140 * s, 48 * s, 14);
      g.fillStyle(0xd9b382, 1).fillEllipse(66 * s, -26 * s, 24 * s, 44 * s);
      g.fillStyle(0x8a5a2b, 1).fillEllipse(66 * s, -26 * s, 12 * s, 24 * s);
      g.lineStyle(3 * s, 0x6b4320, 1).lineBetween(-50 * s, -36 * s, 20 * s, -36 * s).lineBetween(-30 * s, -16 * s, 40 * s, -16 * s);
    });
    // bench
    this.obstacle("bench", "the bench", slots[3], 130 * s, 80 * s, ["on", "under", "behind"], g => {
      g.fillStyle(PALETTE.asphalt, 1).fillRect(-50 * s, -40 * s, 10 * s, 40 * s).fillRect(40 * s, -40 * s, 10 * s, 40 * s);
      g.fillStyle(PALETTE.sand, 1).fillRoundedRect(-62 * s, -50 * s, 124 * s, 14 * s, 4).fillRoundedRect(-62 * s, -82 * s, 124 * s, 12 * s, 4);
    });
  }

  startRound() {
    this.stepIndex = 0;
    this.busy = false;
    const count = Math.max(1, this.level.steps - (this.eased ? 1 : 0));
    const usable = this.obstacles.filter(o => o.relations.some(r => this.level.relations.includes(r)));
    const picks = Phaser.Utils.Array.Shuffle([...usable]).slice(0, count);
    this.steps = picks.map(obstacle => {
      const options = obstacle.relations.filter(r => this.level.relations.includes(r));
      let relation = Phaser.Utils.Array.GetRandom(options) as Relation;
      if (obstacle.key.startsWith("swing") && this.level.relations.some(r => r === "left" || r === "right")) relation = obstacle.key === "swingL" ? "left" : "right";
      return { relation, obstacle };
    });
    const describe = (step: Step) => step.relation === "left" || step.relation === "right" ? `go to the swing on the ${step.relation.toUpperCase()}` : `go ${step.relation.toUpperCase()} ${step.obstacle.label}`;
    const text = this.steps.map(describe).map((s, i) => (i === 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s)).join(", then ");
    this.say(text + "!", text.replace(/UNDER|OVER|ON|BEHIND|LEFT|RIGHT/g, m => m.toLowerCase()) + ".");
    void this.hero.walkTo(this.homeX, this.groundY - 60, 500);
  }

  private tapObstacle(ob: Obstacle) {
    if (this.busy || this.locked) return;
    this.tapFeedback(ob.container);
    const step = this.steps[this.stepIndex];
    if (!step) return;
    if (ob !== step.obstacle) {
      this.ctx.voice.say(`That's ${ob.label}. We need ${step.obstacle.label}.`);
      this.answer(false, this.level.skill, step.relation);
      return;
    }
    this.busy = true;
    void this.performStep(step).then(() => {
      this.busy = false;
      this.stepIndex += 1;
      this.ctx.audio.play("correct");
      sparkles(this, ob.x, ob.y - ob.h / 2, 10);
      if (this.stepIndex >= this.steps.length) {
        this.ctx.voice.say("You followed every step!");
        this.answer(true, this.level.skill, this.steps.map(s => s.relation).join("+"), { x: this.hero.x, y: this.hero.y });
      } else {
        const next = this.steps[this.stepIndex];
        this.ctx.voice.say(next.relation === "left" || next.relation === "right" ? `Now the swing on the ${next.relation}.` : `Now go ${next.relation} ${next.obstacle.label}.`);
      }
    });
  }

  private async performStep(step: Step) {
    const ob = step.obstacle;
    const ground = this.groundY - 60;
    const left = ob.x - ob.w / 2 - 30, right = ob.x + ob.w / 2 + 30;
    const from = this.hero.x < ob.x ? left : right, to = this.hero.x < ob.x ? right : left;
    await this.hero.walkTo(from, ground, Math.min(900, Math.abs(this.hero.x - from) * 1.6 + 200));
    switch (step.relation) {
      case "under":
        this.ctx.voice.say("Under!");
        await new Promise<void>(resolve => this.tweens.add({ targets: this.hero, scaleY: 0.6, scaleX: 1.2, duration: 150, onComplete: () => resolve() }));
        this.hero.setDepth(25);
        await this.hero.walkTo(to, ground + 20, 600);
        await new Promise<void>(resolve => this.tweens.add({ targets: this.hero, scaleY: 1, scaleX: 1, y: ground, duration: 160, ease: "Back.easeOut", onComplete: () => resolve() }));
        this.hero.setDepth(30);
        break;
      case "over":
        this.ctx.voice.say("Over!");
        this.ctx.audio.play("jump");
        await new Promise<void>(resolve => this.tweens.add({ targets: this.hero, x: to, duration: 700, ease: "Linear", onUpdate: tw => { const p = tw.progress; this.hero.setY(ground - Math.sin(p * Math.PI) * (ob.h + 60)); }, onComplete: () => { dustPuff(this, this.hero.x, this.hero.y + 40, 8); resolve(); } }));
        break;
      case "on":
        this.ctx.voice.say("On!");
        this.ctx.audio.play("jump");
        await this.hero.walkTo(ob.x, ob.y - ob.h - 40, 500, true);
        this.hero.powerPose();
        await new Promise<void>(resolve => this.time.delayedCall(700, () => resolve()));
        this.hero.resetPose();
        break;
      case "behind":
        this.ctx.voice.say("Behind!");
        this.hero.setDepth(15);
        await this.hero.walkTo(ob.x, ground - 10, 500);
        await new Promise<void>(resolve => this.tweens.add({ targets: this.hero, alpha: 0.6, duration: 200, yoyo: true, hold: 400, onComplete: () => resolve() }));
        this.hero.setDepth(30);
        break;
      case "left":
      case "right":
        this.ctx.voice.say(step.relation === "left" ? "Left!" : "Right!");
        await this.hero.walkTo(ob.x, ground, 500);
        this.hero.jump(50);
        await new Promise<void>(resolve => this.time.delayedCall(600, () => resolve()));
        break;
    }
  }

  showHint() {
    const step = this.steps[this.stepIndex];
    if (!step) return;
    hintGlow(this.motion, step.obstacle.x, step.obstacle.y - step.obstacle.h / 2, Math.max(step.obstacle.w, step.obstacle.h) * 0.6);
    this.helper.pointAt(step.obstacle.x, step.obstacle.y - step.obstacle.h / 2);
    this.ctx.voice.say(step.relation === "left" || step.relation === "right" ? `The ${step.relation} one. Tap it!` : `Tap ${step.obstacle.label}. Sprout will go ${step.relation}.`);
  }
}
