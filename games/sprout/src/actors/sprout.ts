import Phaser from "phaser";
import { PALETTE } from "../config";
import type { HeroConfig } from "../types";

const hex = (color: string) => Phaser.Display.Color.HexStringToColor(color).color;

export interface HeroLook { capeColor: number; maskColor: number; emblem: HeroConfig["emblem"]; faceTexture?: string | null; bodyColor?: number }

/**
 * Super Sprout: a round green hero built from layered parts so every piece can move. The same
 * class draws Kaleb's own hero with a different cape, mask, emblem and an optional face photo.
 */
export class Sprout extends Phaser.GameObjects.Container {
  baseScale = 1;
  private cape: Phaser.GameObjects.Graphics;
  private bodyPart: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Graphics;
  private lids: Phaser.GameObjects.Graphics;
  private mouth: Phaser.GameObjects.Graphics;
  private armL: Phaser.GameObjects.Graphics;
  private armR: Phaser.GameObjects.Graphics;
  private legs: Phaser.GameObjects.Graphics;
  private capePhase = 0;
  private breathe: Phaser.Tweens.Tween | null = null;
  private blinkTimer: Phaser.Time.TimerEvent | null = null;
  private moodHappy = true;
  readonly look: HeroLook;

  constructor(scene: Phaser.Scene, x: number, y: number, look: Partial<HeroLook> = {}, private readonly radius = 56) {
    super(scene, x, y);
    this.look = { capeColor: PALETTE.charcoal, maskColor: PALETTE.black, emblem: "star", faceTexture: null, bodyColor: PALETTE.greenLight, ...look };
    const r = this.radius;
    this.cape = scene.add.graphics();
    this.legs = scene.add.graphics();
    this.armL = scene.add.graphics();
    this.armR = scene.add.graphics();
    this.bodyPart = scene.add.container(0, 0);
    this.eyes = scene.add.graphics();
    this.lids = scene.add.graphics();
    this.mouth = scene.add.graphics();
    this.drawCape(0);
    this.drawLegs();
    this.drawArm(this.armL, -1);
    this.drawArm(this.armR, 1);
    this.drawBody();
    this.drawFace();
    this.bodyPart.add([this.eyes, this.lids, this.mouth]);
    this.add([this.cape, this.legs, this.armL, this.armR, this.bodyPart]);
    this.setSize(r * 2.6, r * 3);
    scene.add.existing(this);
    this.startIdle();
  }

  static fromConfig(config: HeroConfig, faceTexture: string | null): Partial<HeroLook> {
    return { capeColor: hex(config.capeColor), maskColor: hex(config.maskColor), emblem: config.emblem, faceTexture: config.facePhoto ? faceTexture : null };
  }

  private drawCape(flutter: number) {
    const r = this.radius, g = this.cape;
    g.clear();
    g.fillStyle(this.look.capeColor, 1);
    g.beginPath();
    g.moveTo(-r * 0.75, -r * 0.55);
    g.lineTo(r * 0.75, -r * 0.55);
    g.lineTo(r * 1.1 + flutter * 8, r * 1.35);
    g.lineTo(r * 0.3, r * 1.15 - flutter * 6);
    g.lineTo(-r * 0.45, r * 1.3 + flutter * 7);
    g.lineTo(-r * 1.05 - flutter * 8, r * 1.1);
    g.closePath();
    g.fillPath();
    g.lineStyle(5, PALETTE.gold, 1);
    g.beginPath();
    g.moveTo(-r * 1.05 - flutter * 8, r * 1.1);
    g.lineTo(-r * 0.45, r * 1.3 + flutter * 7);
    g.lineTo(r * 0.3, r * 1.15 - flutter * 6);
    g.lineTo(r * 1.1 + flutter * 8, r * 1.35);
    g.strokePath();
  }

  private drawLegs() {
    const r = this.radius, g = this.legs;
    g.clear();
    g.fillStyle(PALETTE.greenDark, 1);
    g.fillRoundedRect(-r * 0.55, r * 0.75, r * 0.42, r * 0.5, 8);
    g.fillRoundedRect(r * 0.13, r * 0.75, r * 0.42, r * 0.5, 8);
    g.fillStyle(PALETTE.gold, 1);
    g.fillRoundedRect(-r * 0.62, r * 1.05, r * 0.56, r * 0.26, 8);
    g.fillRoundedRect(r * 0.06, r * 1.05, r * 0.56, r * 0.26, 8);
  }

  private drawArm(g: Phaser.GameObjects.Graphics, side: number) {
    const r = this.radius;
    g.clear();
    g.fillStyle(PALETTE.greenDark, 1);
    g.fillRoundedRect(side > 0 ? r * 0.7 : -r * 1.1, -r * 0.1, r * 0.4, r * 0.8, 10);
    g.fillStyle(PALETTE.gold, 1).fillCircle(side * r * 0.9, r * 0.72, r * 0.22);
  }

  private drawBody() {
    const r = this.radius, g = this.scene.add.graphics();
    g.fillStyle(this.look.bodyColor!, 1).fillCircle(0, 0, r);
    g.fillStyle(PALETTE.green, 1).fillEllipse(0, r * 0.35, r * 1.4, r * 0.9);
    g.fillStyle(this.look.bodyColor!, 1).fillEllipse(0, r * 0.3, r * 1.2, r * 0.7);
    // leaf hair
    g.fillStyle(PALETTE.greenDark, 1);
    g.fillEllipse(-r * 0.25, -r * 1.05, r * 0.42, r * 0.8);
    g.fillEllipse(r * 0.2, -r * 1.12, r * 0.4, r * 0.95);
    g.fillEllipse(r * 0.55, -r * 0.95, r * 0.36, r * 0.6);
    g.lineStyle(3, PALETTE.greenLight, 1).lineBetween(r * 0.2, -r * 1.45, r * 0.2, -r * 0.8);
    // mask with gold trim
    g.fillStyle(this.look.maskColor, 1);
    g.fillRoundedRect(-r * 0.82, -r * 0.5, r * 1.64, r * 0.56, 14);
    g.lineStyle(3, PALETTE.gold, 1).strokeRoundedRect(-r * 0.82, -r * 0.5, r * 1.64, r * 0.56, 14);
    // emblem
    this.drawEmblem(g, 0, r * 0.4, r * 0.24);
    this.bodyPart.add(g);
    if (this.look.faceTexture && this.scene.textures.exists(this.look.faceTexture)) {
      const face = this.scene.add.image(0, -r * 0.1, this.look.faceTexture).setDisplaySize(r * 1.4, r * 1.4);
      const maskShape = this.scene.make.graphics({ x: 0, y: 0 }, false).fillCircle(0, 0, r * 0.7);
      const mask = maskShape.createGeometryMask();
      face.setMask(mask);
      this.bodyPart.add(face);
      this.once(Phaser.GameObjects.Events.DESTROY, () => maskShape.destroy());
      // the geometry mask follows the container through the parent's transform
      this.scene.events.on(Phaser.Scenes.Events.UPDATE, () => { const m = this.getWorldTransformMatrix(); maskShape.setPosition(m.tx, m.ty - r * 0.1 * this.scaleY).setScale(this.scaleX, this.scaleY); });
    }
  }

  private drawEmblem(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
    g.fillStyle(PALETTE.gold, 1);
    switch (this.look.emblem) {
      case "bolt": g.fillTriangle(x - r * 0.2, y - r, x + r * 0.6, y - r, x, y).fillTriangle(x + r * 0.2, y + r, x - r * 0.6, y + r, x, y); break;
      case "heart": g.fillCircle(x - r * 0.45, y - r * 0.3, r * 0.5).fillCircle(x + r * 0.45, y - r * 0.3, r * 0.5).fillTriangle(x - r * 0.95, y - r * 0.1, x + r * 0.95, y - r * 0.1, x, y + r); break;
      case "dino": g.fillEllipse(x, y, r * 1.8, r * 1.1).fillTriangle(x - r * 0.8, y - r * 0.4, x - r * 0.4, y - r * 1.1, x, y - r * 0.4).fillTriangle(x, y - r * 0.4, x + r * 0.4, y - r * 1.1, x + r * 0.8, y - r * 0.4); break;
      case "car": g.fillRoundedRect(x - r, y - r * 0.3, r * 2, r * 0.8, 4).fillRoundedRect(x - r * 0.5, y - r * 0.8, r, r * 0.6, 4); g.fillStyle(PALETTE.black, 1).fillCircle(x - r * 0.55, y + r * 0.55, r * 0.28).fillCircle(x + r * 0.55, y + r * 0.55, r * 0.28); break;
      default: {
        g.beginPath();
        for (let i = 0; i < 10; i += 1) { const rad = i % 2 === 0 ? r : r * 0.45; const a = -Math.PI / 2 + (i * Math.PI) / 5; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
        g.closePath().fillPath();
      }
    }
  }

  private drawFace() {
    const r = this.radius;
    this.eyes.clear();
    this.eyes.fillStyle(PALETTE.white, 1).fillEllipse(-r * 0.3, -r * 0.22, r * 0.36, r * 0.3).fillEllipse(r * 0.3, -r * 0.22, r * 0.36, r * 0.3);
    this.eyes.fillStyle(PALETTE.black, 1).fillCircle(-r * 0.26, -r * 0.2, r * 0.09).fillCircle(r * 0.34, -r * 0.2, r * 0.09);
    this.lids.clear();
    this.drawMouth();
  }

  private drawMouth(open = 0) {
    const r = this.radius, g = this.mouth;
    g.clear();
    if (open > 0) { g.fillStyle(PALETTE.black, 1).fillEllipse(0, r * 0.12, r * 0.5, r * 0.3 * open + r * 0.1); return; }
    g.lineStyle(4, PALETTE.black, 1);
    g.beginPath();
    if (this.moodHappy) { g.arc(r * 0.05, r * 0.02, r * 0.3, 0.25, Math.PI * 0.75); } else { g.arc(0, r * 0.3, r * 0.22, Math.PI * 1.2, Math.PI * 1.8); }
    g.strokePath();
  }

  /** Breathing, blinking and cape flutter. */
  startIdle() {
    this.breathe?.remove();
    this.breathe = this.scene.tweens.add({ targets: this.bodyPart, scaleY: 1.03, scaleX: 0.99, duration: 1300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.scheduleBlink();
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.flutter, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => { this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.flutter, this); this.blinkTimer?.remove(); });
  }

  private flutter(_time: number, delta: number) {
    this.capePhase += delta / 1000;
    this.drawCape(Math.sin(this.capePhase * 3) * 0.6);
  }

  private scheduleBlink() {
    this.blinkTimer?.remove();
    this.blinkTimer = this.scene.time.delayedCall(Phaser.Math.Between(3000, 6000), () => {
      const r = this.radius;
      this.lids.clear().fillStyle(this.look.bodyColor!, 1).fillEllipse(-r * 0.3, -r * 0.22, r * 0.4, r * 0.34).fillEllipse(r * 0.3, -r * 0.22, r * 0.4, r * 0.34);
      this.scene.time.delayedCall(120, () => { this.lids.clear(); this.scheduleBlink(); });
    });
  }

  setMood(happy: boolean) { this.moodHappy = happy; this.drawMouth(); }

  /** Jump with anticipation, stretch in the air and squash on landing. */
  jump(height = 90, onLand?: () => void) {
    const y = this.y;
    this.scene.tweens.chain({ targets: this, tweens: [
      { scaleX: this.baseScale * 1.15, scaleY: this.baseScale * 0.85, duration: 110 },
      { scaleX: this.baseScale * 0.9, scaleY: this.baseScale * 1.15, y: y - height, duration: 260, ease: "Quad.easeOut" },
      { scaleX: this.baseScale * 1.2, scaleY: this.baseScale * 0.8, y, duration: 240, ease: "Quad.easeIn", onComplete: () => onLand?.() },
      { scaleX: this.baseScale, scaleY: this.baseScale, duration: 140, ease: "Back.easeOut" },
    ] });
  }

  stomp(onHit?: () => void) {
    this.scene.tweens.chain({ targets: this, tweens: [
      { y: this.y - 40, scaleY: this.baseScale * 1.1, duration: 180, ease: "Quad.easeOut" },
      { y: this.y, scaleY: this.baseScale * 0.82, scaleX: this.baseScale * 1.18, duration: 120, ease: "Quad.easeIn", onComplete: () => onHit?.() },
      { scaleX: this.baseScale, scaleY: this.baseScale, duration: 160, ease: "Back.easeOut" },
    ] });
  }

  roar(duration = 600) {
    this.drawMouth(1);
    this.scene.tweens.add({ targets: this.bodyPart, scaleX: 1.08, scaleY: 1.08, duration: 90, yoyo: true, repeat: Math.floor(duration / 180) });
    this.scene.time.delayedCall(duration, () => this.drawMouth(0));
  }

  spin() {
    this.scene.tweens.add({ targets: this, angle: 360, duration: 480, ease: "Cubic.easeInOut", onComplete: () => this.setAngle(0) });
  }

  /** Confident power pose: arms up, slight lean, cape flares. */
  powerPose() {
    this.scene.tweens.add({ targets: this.armL, angle: -60, y: -this.radius * 0.5, duration: 260, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: this.armR, angle: 60, y: -this.radius * 0.5, duration: 260, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: this, angle: -6, duration: 260, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: this.cape, scaleX: 1.3, scaleY: 1.15, duration: 300, ease: "Back.easeOut" });
  }

  resetPose() {
    this.scene.tweens.add({ targets: [this.armL, this.armR], angle: 0, y: 0, duration: 200 });
    this.scene.tweens.add({ targets: this, angle: 0, duration: 200 });
    this.scene.tweens.add({ targets: this.cape, scaleX: 1, scaleY: 1, duration: 200 });
  }

  /** Points at a spot to hint. */
  pointAt(x: number, y: number) {
    const side = x >= this.x ? this.armR : this.armL;
    const angle = Phaser.Math.RadToDeg(Math.atan2(y - this.y, x - this.x)) - (x >= this.x ? 90 : -90) ;
    this.scene.tweens.add({ targets: side, angle: Phaser.Math.Clamp(angle, -140, 140), y: -this.radius * 0.4, duration: 220, ease: "Back.easeOut", yoyo: true, hold: 1200, onComplete: () => { side.setAngle(0).setY(0); } });
  }

  /** Walks or flies to a point. */
  walkTo(x: number, y: number, duration = 600, fly = false) {
    return new Promise<void>(resolve => {
      const flip = x < this.x ? -1 : 1;
      this.bodyPart.setScale(flip, this.bodyPart.scaleY);
      this.scene.tweens.add({ targets: this, x, y, duration, ease: fly ? "Sine.easeInOut" : "Linear", onComplete: () => resolve() });
      if (!fly) this.scene.tweens.add({ targets: this.legs, y: 6, duration: 110, yoyo: true, repeat: Math.max(0, Math.floor(duration / 220)), onComplete: () => this.legs.setY(0) });
      else this.scene.tweens.add({ targets: this.cape, scaleY: 1.3, duration: duration / 2, yoyo: true });
    });
  }
}
