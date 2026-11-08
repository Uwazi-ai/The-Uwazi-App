import Phaser from "phaser";

/** True when the device or a grown-up asked for less motion. Shakes and zooms become fades. */
export function reducedMotion(setting: "system" | "on" = "system"): boolean {
  if (setting === "on") return true;
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface MotionContext { scene: Phaser.Scene; reduced: boolean }

/** Instant tap feedback: scale pop in under 100 ms. */
export function pop(ctx: MotionContext, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, amount = 1.15) {
  const base = (target as unknown as { baseScale?: number }).baseScale ?? target.scaleX;
  ctx.scene.tweens.killTweensOf(target);
  ctx.scene.tweens.add({ targets: target, scaleX: base * amount, scaleY: base * amount, duration: 70, yoyo: true, ease: "Quad.easeOut", onComplete: () => target.setScale(base) });
}

/** Squash on landing, stretch on take off. */
export function squash(ctx: MotionContext, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, sx = 1.2, sy = 0.8, duration = 110) {
  const base = (target as unknown as { baseScale?: number }).baseScale ?? 1;
  ctx.scene.tweens.add({ targets: target, scaleX: base * sx, scaleY: base * sy, duration, yoyo: true, ease: "Quad.easeOut", onComplete: () => target.setScale(base) });
}

/** Gentle camera shake, or a soft fade when motion is reduced. */
export function shake(ctx: MotionContext, intensity = 0.004, duration = 160) {
  if (ctx.reduced) { ctx.scene.cameras.main.flash(120, 255, 255, 255, false); return; }
  ctx.scene.cameras.main.shake(duration, intensity);
}

/** Zoom punch for wins, or a fade when motion is reduced. */
export function zoomPunch(ctx: MotionContext, amount = 1.06, duration = 220) {
  const camera = ctx.scene.cameras.main;
  if (ctx.reduced) { camera.fadeIn(300); return; }
  ctx.scene.tweens.add({ targets: camera, zoom: amount, duration, yoyo: true, ease: "Sine.easeInOut", onComplete: () => camera.setZoom(1) });
}

/** Wiggle used for Sprout's hint pointing. */
export function wiggle(ctx: MotionContext, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, angle = 8) {
  ctx.scene.tweens.add({ targets: target, angle: { from: -angle, to: angle }, duration: 90, yoyo: true, repeat: 3, onComplete: () => { (target as unknown as { setAngle(a: number): void }).setAngle(0); } });
}

/** A glowing pulse ring around a target to hint "tap here". */
export function hintGlow(ctx: MotionContext, x: number, y: number, radius: number, color: number = 0xffc531) {
  const ring = ctx.scene.add.circle(x, y, radius, color, 0).setStrokeStyle(6, color, 0.9).setDepth(50);
  ctx.scene.tweens.add({ targets: ring, scale: 1.25, alpha: 0, duration: 700, repeat: 2, onComplete: () => ring.destroy() });
  return ring;
}
