import Phaser from "phaser";
import { PALETTE } from "../config";

/** A chunky race car with spinning wheels and a bounce. */
export class Car extends Phaser.GameObjects.Container {
  baseScale = 1;
  private wheels: Phaser.GameObjects.Graphics[] = [];
  private spin = 0;
  speed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly color: number = PALETTE.orange, readonly number = 1, readonly length = 120, topDown = false) {
    super(scene, x, y);
    const L = length, H = L * 0.4;
    const body = scene.add.graphics();
    if (topDown) { this.drawTopDown(scene, body, L); return; }
    body.fillStyle(PALETTE.black, 0.4).fillEllipse(0, H * 0.75, L * 1.05, H * 0.5);
    body.fillStyle(color, 1).fillRoundedRect(-L / 2, -H * 0.2, L, H * 0.75, 12);
    body.fillStyle(color, 1).fillRoundedRect(-L * 0.22, -H * 0.75, L * 0.5, H * 0.6, 10);
    body.fillStyle(0xbfe6ff, 1).fillRoundedRect(-L * 0.14, -H * 0.65, L * 0.34, H * 0.38, 6);
    body.fillStyle(PALETTE.gold, 1).fillRoundedRect(L * 0.3, -H * 0.55, L * 0.08, H * 0.4, 3);
    body.fillStyle(0xffffff, 1).fillCircle(-L * 0.3, H * 0.15, H * 0.28);
    const num = scene.add.text(-L * 0.3, H * 0.15, String(number), { fontFamily: '"Lilita One", sans-serif', fontSize: `${H * 0.4}px`, color: "#111111" }).setOrigin(0.5);
    this.add([body, num]);
    for (const wx of [-L * 0.3, L * 0.3]) {
      const w = scene.add.graphics();
      w.fillStyle(PALETTE.black, 1).fillCircle(0, 0, H * 0.32);
      w.fillStyle(0xcccccc, 1).fillCircle(0, 0, H * 0.16);
      w.fillStyle(PALETTE.black, 1).fillRect(-H * 0.03, -H * 0.16, H * 0.06, H * 0.32);
      w.setPosition(wx, H * 0.55);
      this.wheels.push(w);
      this.add(w);
    }
    this.setSize(L, H * 1.5);
    scene.add.existing(this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.roll, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.roll, this));
  }

  /** Seen from above: a long rounded body with four wheels, nose at the top. */
  private drawTopDown(scene: Phaser.Scene, body: Phaser.GameObjects.Graphics, L: number) {
    const W = L * 0.55;
    body.fillStyle(PALETTE.black, 0.35).fillRoundedRect(-W / 2 + 4, -L / 2 + 8, W, L, W * 0.3);
    body.fillStyle(this.color, 1).fillRoundedRect(-W / 2, -L / 2, W, L, W * 0.3);
    body.fillStyle(0xbfe6ff, 1).fillRoundedRect(-W * 0.32, -L * 0.25, W * 0.64, L * 0.22, 8);
    body.fillStyle(0xffffff, 0.3).fillRoundedRect(-W * 0.38, -L * 0.46, W * 0.76, L * 0.14, 8);
    body.fillStyle(PALETTE.gold, 1).fillRoundedRect(-W * 0.4, -L * 0.5, W * 0.18, L * 0.06, 3).fillRoundedRect(W * 0.22, -L * 0.5, W * 0.18, L * 0.06, 3);
    body.fillStyle(PALETTE.charcoal, 1).fillRoundedRect(-W * 0.45, L * 0.3, W * 0.9, L * 0.08, 4);
    const num = scene.add.text(0, L * 0.12, String(this.number), { fontFamily: '"Lilita One", sans-serif', fontSize: `${W * 0.45}px`, color: "#111111" }).setOrigin(0.5);
    this.add([body, num]);
    for (const [wx, wy] of [[-W * 0.58, -L * 0.28], [W * 0.58, -L * 0.28], [-W * 0.58, L * 0.3], [W * 0.58, L * 0.3]]) {
      const w = scene.add.graphics();
      w.fillStyle(PALETTE.black, 1).fillRoundedRect(-W * 0.12, -L * 0.1, W * 0.24, L * 0.2, 4);
      w.fillStyle(0x555555, 1).fillRect(-W * 0.12, -L * 0.02, W * 0.24, L * 0.04);
      w.setPosition(wx, wy);
      this.wheels.push(w);
      this.add(w);
    }
    this.setSize(W * 1.4, L);
    scene.add.existing(this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.rollTopDown, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.rollTopDown, this));
  }

  private rollTopDown(_t: number, delta: number) {
    this.spin += (this.speed * delta) / 1000;
    const phase = Math.floor(this.spin / 12) % 2;
    for (const w of this.wheels) w.setAlpha(phase ? 1 : 0.85);
  }

  private roll(_t: number, delta: number) {
    this.spin += (this.speed * delta) / 1000;
    for (const w of this.wheels) w.setAngle(this.spin);
    const bounce = this.speed > 0 ? Math.sin(this.spin / 20) * 1.5 : 0;
    this.list.forEach((child, index) => { if (index === 0) (child as Phaser.GameObjects.Graphics).setY(bounce); });
  }

  boost() {
    this.scene.tweens.add({ targets: this, scaleX: this.baseScale * 1.15, scaleY: this.baseScale * 0.9, duration: 120, yoyo: true });
  }

  bump() {
    this.scene.tweens.add({ targets: this, angle: { from: -5, to: 5 }, duration: 60, yoyo: true, repeat: 3, onComplete: () => this.setAngle(0) });
  }
}
