import Phaser from "phaser";
import { PALETTE } from "../config";

/** Generates the tiny textures every emitter uses. Called once in Boot. */
export function makeParticleTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("p-dot")) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
  g.generateTexture("p-dot", 16, 16);
  g.clear().fillStyle(0xffffff, 1).fillRect(0, 0, 14, 8);
  g.generateTexture("p-rect", 14, 8);
  g.clear().fillStyle(0xffffff, 1);
  g.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 10 : 4.5;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = 11 + Math.cos(a) * r, py = 11 + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath().fillPath();
  g.generateTexture("p-star", 22, 22);
  g.clear().fillStyle(0xffffff, 1).fillEllipse(8, 10, 10, 18);
  g.generateTexture("p-leaf", 16, 20);
  g.destroy();
}

const CONFETTI = [PALETTE.gold, PALETTE.orange, PALETTE.blue, PALETTE.teal, PALETTE.greenLight, PALETTE.white];

export function confetti(scene: Phaser.Scene, x: number, y: number, count = 60) {
  const emitter = scene.add.particles(x, y, "p-rect", {
    speed: { min: 250, max: 650 }, angle: { min: 220, max: 320 }, gravityY: 900, lifespan: { min: 1200, max: 2000 },
    scale: { start: 1.3, end: 0.6 }, rotate: { start: 0, end: 720 }, tint: CONFETTI, quantity: count, emitting: false,
  }).setDepth(90);
  emitter.explode(count);
  scene.time.delayedCall(2300, () => emitter.destroy());
}

export function sparkles(scene: Phaser.Scene, x: number, y: number, count = 14, color: number = PALETTE.gold) {
  const emitter = scene.add.particles(x, y, "p-star", {
    speed: { min: 60, max: 220 }, lifespan: 600, scale: { start: 0.9, end: 0 }, tint: color, quantity: count, emitting: false, alpha: { start: 1, end: 0 },
  }).setDepth(80);
  emitter.explode(count);
  scene.time.delayedCall(800, () => emitter.destroy());
}

export function dustPuff(scene: Phaser.Scene, x: number, y: number, count = 10) {
  const emitter = scene.add.particles(x, y, "p-dot", {
    speed: { min: 40, max: 160 }, angle: { min: 200, max: 340 }, lifespan: 500, scale: { start: 1.2, end: 0 }, tint: [PALETTE.sand, 0xe8d5b0], quantity: count, emitting: false, alpha: { start: 0.8, end: 0 },
  }).setDepth(40);
  emitter.explode(count);
  scene.time.delayedCall(700, () => emitter.destroy());
}

export function leafBurst(scene: Phaser.Scene, x: number, y: number, count = 16) {
  const emitter = scene.add.particles(x, y, "p-leaf", {
    speed: { min: 80, max: 260 }, gravityY: 300, lifespan: 900, scale: { start: 1, end: 0.3 }, rotate: { start: 0, end: 360 }, tint: [PALETTE.greenLight, PALETTE.green, PALETTE.greenDark], quantity: count, emitting: false,
  }).setDepth(80);
  emitter.explode(count);
  scene.time.delayedCall(1100, () => emitter.destroy());
}
