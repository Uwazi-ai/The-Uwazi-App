import Phaser from "phaser";
import { PALETTE } from "../config";

/**
 * Cape-swipe wipe: a charcoal cape with a gold edge sweeps across, the next scene starts under it,
 * and it sweeps out. With reduced motion it is a plain cross fade.
 */
export function capeSwipe(scene: Phaser.Scene, target: string, data: object = {}, reduced = false) {
  const W = scene.scale.width, H = scene.scale.height;
  if (reduced) {
    scene.cameras.main.fadeOut(220, 17, 17, 17);
    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      scene.scene.start(target, data);
      scene.scene.get(target).cameras.main.fadeIn(260, 17, 17, 17);
    });
    return;
  }
  const cape = scene.add.graphics().setDepth(1000).setScrollFactor(0);
  const drawCape = (x: number) => {
    cape.clear();
    cape.fillStyle(PALETTE.charcoal, 1);
    cape.beginPath();
    cape.moveTo(x, 0);
    cape.lineTo(x + W * 1.4, 0);
    cape.lineTo(x + W * 1.4, H);
    cape.lineTo(x, H);
    cape.lineTo(x + W * 0.18, H * 0.75);
    cape.lineTo(x - W * 0.02, H * 0.5);
    cape.lineTo(x + W * 0.16, H * 0.25);
    cape.closePath();
    cape.fillPath();
    cape.lineStyle(14, PALETTE.gold, 1);
    cape.beginPath();
    cape.moveTo(x, 0);
    cape.lineTo(x + W * 0.16, H * 0.25);
    cape.lineTo(x - W * 0.02, H * 0.5);
    cape.lineTo(x + W * 0.18, H * 0.75);
    cape.lineTo(x, H);
    cape.strokePath();
  };
  const progress = { x: W * 1.2 };
  drawCape(progress.x);
  scene.tweens.add({
    targets: progress, x: -W * 0.3, duration: 320, ease: "Cubic.easeIn",
    onUpdate: () => drawCape(progress.x),
    onComplete: () => {
      scene.scene.start(target, data);
      const next = scene.scene.get(target);
      next.events.once(Phaser.Scenes.Events.CREATE, () => {
        const out = next.add.graphics().setDepth(1000).setScrollFactor(0);
        const nw = next.scale.width, nh = next.scale.height;
        const draw = (x: number) => {
          out.clear();
          out.fillStyle(PALETTE.charcoal, 1);
          out.beginPath();
          out.moveTo(x, 0); out.lineTo(x + nw * 1.4, 0); out.lineTo(x + nw * 1.4, nh); out.lineTo(x, nh);
          out.lineTo(x + nw * 0.18, nh * 0.75); out.lineTo(x - nw * 0.02, nh * 0.5); out.lineTo(x + nw * 0.16, nh * 0.25);
          out.closePath(); out.fillPath();
          out.lineStyle(14, PALETTE.gold, 1);
          out.beginPath(); out.moveTo(x, 0); out.lineTo(x + nw * 0.16, nh * 0.25); out.lineTo(x - nw * 0.02, nh * 0.5); out.lineTo(x + nw * 0.18, nh * 0.75); out.lineTo(x, nh); out.strokePath();
        };
        const p = { x: -nw * 0.3 };
        draw(p.x);
        next.tweens.add({ targets: p, x: -nw * 1.5, duration: 360, ease: "Cubic.easeOut", onUpdate: () => draw(p.x), onComplete: () => out.destroy() });
      });
    },
  });
}
