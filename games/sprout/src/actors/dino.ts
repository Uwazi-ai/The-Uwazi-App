import Phaser from "phaser";
import { PALETTE } from "../config";

export type DinoKind = "stompy" | "neckie" | "trippy" | "spikes";
export const DINO_NAMES: Record<DinoKind, string> = { stompy: "Stompy", neckie: "Neckie", trippy: "Trippy", spikes: "Spikes" };
const DINO_COLORS: Record<DinoKind, number> = { stompy: PALETTE.teal, neckie: PALETTE.purple, trippy: PALETTE.orange, spikes: PALETTE.blue };

/** Original friendly dinos with idle sway, blinking and a roar. */
export class Dino extends Phaser.GameObjects.Container {
  baseScale = 1;
  private bodyG: Phaser.GameObjects.Graphics;
  private head: Phaser.GameObjects.Container;
  private tail: Phaser.GameObjects.Graphics;
  private mouth: Phaser.GameObjects.Graphics;
  private lids: Phaser.GameObjects.Graphics;
  private phase = 0;
  readonly color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly kind: DinoKind, private readonly size = 70, baby = false) {
    super(scene, x, y);
    this.color = DINO_COLORS[kind];
    const s = baby ? size * 0.55 : size;
    this.tail = scene.add.graphics();
    this.bodyG = scene.add.graphics();
    this.head = scene.add.container(0, 0);
    this.mouth = scene.add.graphics();
    this.lids = scene.add.graphics();
    this.drawTail(0, s);
    this.drawBody(s);
    this.drawHead(s);
    this.add([this.tail, this.bodyG, this.head]);
    this.setSize(s * 2.4, s * 2.2);
    scene.add.existing(this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.sway, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.sway, this));
    this.scheduleBlink();
  }

  get dinoName() { return DINO_NAMES[this.kind]; }

  private drawTail(angle: number, s: number) {
    const g = this.tail;
    g.clear();
    g.fillStyle(this.color, 1);
    g.beginPath();
    g.moveTo(-s * 0.6, s * 0.1);
    g.lineTo(-s * 1.5 + angle * 10, -s * 0.1 + angle * 14);
    g.lineTo(-s * 1.1 + angle * 6, s * 0.55);
    g.closePath();
    g.fillPath();
    if (this.kind === "spikes") { g.fillStyle(PALETTE.gold, 1); for (let i = 0; i < 3; i += 1) g.fillTriangle(-s * (0.7 + i * 0.25), s * 0.05 - i * 4, -s * (0.8 + i * 0.25), -s * 0.25 - i * 6, -s * (0.9 + i * 0.25), s * 0.08 - i * 4); }
  }

  private drawBody(s: number) {
    const g = this.bodyG;
    g.clear();
    g.fillStyle(this.color, 1).fillEllipse(0, s * 0.3, s * 1.5, s * 1.15);
    g.fillStyle(0xffffff, 0.35).fillEllipse(s * 0.05, s * 0.5, s * 0.8, s * 0.55);
    g.fillStyle(this.color, 1).fillRoundedRect(-s * 0.55, s * 0.7, s * 0.4, s * 0.45, 8).fillRoundedRect(s * 0.15, s * 0.7, s * 0.4, s * 0.45, 8);
    if (this.kind === "spikes") { g.fillStyle(PALETTE.gold, 1); for (let i = -2; i <= 2; i += 1) g.fillTriangle(i * s * 0.28 - s * 0.12, -s * 0.2, i * s * 0.28, -s * 0.5, i * s * 0.28 + s * 0.12, -s * 0.2); }
    if (this.kind === "stompy") g.fillStyle(this.color, 1).fillRoundedRect(s * 0.3, s * 0.05, s * 0.3, s * 0.3, 6);
  }

  private drawHead(s: number) {
    const g = this.scene.add.graphics();
    const neck = this.kind === "neckie" ? s * 0.9 : 0;
    const hx = this.kind === "neckie" ? s * 0.55 : s * 0.45, hy = -s * 0.45 - neck;
    if (neck) g.fillStyle(this.color, 1).fillRoundedRect(s * 0.25, -s * 0.5 - neck, s * 0.45, neck + s * 0.5, 12);
    const hw = this.kind === "stompy" ? s * 1.0 : s * 0.75, hh = this.kind === "stompy" ? s * 0.8 : s * 0.6;
    g.fillStyle(this.color, 1).fillRoundedRect(hx - hw * 0.3, hy - hh * 0.5, hw, hh, 16);
    if (this.kind === "trippy") { g.fillStyle(PALETTE.gold, 1).fillTriangle(hx - hw * 0.1, hy - hh * 0.45, hx, hy - hh * 1.2, hx + hw * 0.1, hy - hh * 0.45).fillTriangle(hx + hw * 0.3, hy - hh * 0.45, hx + hw * 0.4, hy - hh * 1.05, hx + hw * 0.5, hy - hh * 0.45).fillTriangle(hx - hw * 0.25, hy - hh * 0.2, hx - hw * 0.45, hy - hh * 0.6, hx - hw * 0.2, hy); g.fillStyle(this.color, 1).fillEllipse(hx - hw * 0.1, hy - hh * 0.1, hw * 0.9, hh * 1.1); }
    g.fillStyle(0xffffff, 1).fillCircle(hx + hw * 0.15, hy - hh * 0.1, s * 0.14);
    g.fillStyle(PALETTE.black, 1).fillCircle(hx + hw * 0.19, hy - hh * 0.08, s * 0.07);
    this.head.add([g, this.mouth, this.lids]);
    this.head.setData("hx", hx).setData("hy", hy).setData("hw", hw).setData("hh", hh);
    this.drawMouth(0);
  }

  private drawMouth(open: number) {
    const hx = this.head.getData("hx"), hy = this.head.getData("hy"), hw = this.head.getData("hw"), hh = this.head.getData("hh");
    const g = this.mouth;
    g.clear();
    if (open > 0) { g.fillStyle(PALETTE.black, 1).fillEllipse(hx + hw * 0.4, hy + hh * 0.3, hw * 0.4, hh * 0.5 * open + 6); g.fillStyle(0xffffff, 1).fillTriangle(hx + hw * 0.3, hy + hh * 0.1, hx + hw * 0.36, hy + hh * 0.3, hx + hw * 0.42, hy + hh * 0.1); return; }
    g.lineStyle(4, PALETTE.black, 1).beginPath().arc(hx + hw * 0.35, hy + hh * 0.15, hw * 0.22, 0.2, Math.PI * 0.8).strokePath();
  }

  private sway(_t: number, delta: number) {
    this.phase += delta / 1000;
    this.drawTail(Math.sin(this.phase * 2.2) * 0.5, this.size * (this.height / (this.size * 2.2)));
    this.head.setY(Math.sin(this.phase * 1.6) * 3);
  }

  private scheduleBlink() {
    this.scene.time.delayedCall(Phaser.Math.Between(3000, 6000), () => {
      if (!this.scene) return;
      const hx = this.head.getData("hx"), hy = this.head.getData("hy"), hw = this.head.getData("hw"), hh = this.head.getData("hh");
      this.lids.clear().fillStyle(this.color, 1).fillCircle(hx + hw * 0.15, hy - hh * 0.1, this.size * 0.15);
      this.scene.time.delayedCall(120, () => { this.lids.clear(); this.scheduleBlink(); });
    });
  }

  roar(duration = 700) {
    this.drawMouth(1);
    this.scene.tweens.add({ targets: this.head, scaleX: 1.08, scaleY: 1.08, duration: 100, yoyo: true, repeat: Math.floor(duration / 200) });
    this.scene.time.delayedCall(duration, () => this.drawMouth(0));
  }

  /** Mouth position in world space for feeding. */
  mouthPoint(): Phaser.Math.Vector2 {
    const hx = this.head.getData("hx"), hy = this.head.getData("hy"), hw = this.head.getData("hw"), hh = this.head.getData("hh");
    const m = this.getWorldTransformMatrix();
    return new Phaser.Math.Vector2(m.tx + (hx + hw * 0.4) * this.scaleX, m.ty + (hy + hh * 0.3) * this.scaleY);
  }

  chomp() {
    this.drawMouth(1);
    this.scene.tweens.add({ targets: this.head, y: 6, duration: 90, yoyo: true, repeat: 1, onComplete: () => this.drawMouth(0) });
  }

  stompAnim(onHit?: () => void) {
    this.scene.tweens.chain({ targets: this, tweens: [
      { y: this.y - 30, duration: 160, ease: "Quad.easeOut" },
      { y: this.y, scaleY: this.baseScale * 0.85, scaleX: this.baseScale * 1.12, duration: 110, ease: "Quad.easeIn", onComplete: () => onHit?.() },
      { scaleX: this.baseScale, scaleY: this.baseScale, duration: 150, ease: "Back.easeOut" },
    ] });
  }
}
