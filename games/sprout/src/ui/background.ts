import Phaser from "phaser";
import { PALETTE } from "../config";

/** Sky, sun, rolling hills. Returns the ground line y so scenes can place things on it. */
export function drawGarden(scene: Phaser.Scene, options: { groundRatio?: number; road?: boolean; park?: boolean } = {}): number {
  const W = scene.scale.width, H = scene.scale.height;
  const groundY = H * (options.groundRatio ?? 0.72);
  const g = scene.add.graphics().setDepth(-10);
  g.fillGradientStyle(PALETTE.sky, PALETTE.sky, 0x8fc6ef, 0x8fc6ef, 1).fillRect(0, 0, W, groundY);
  g.fillStyle(PALETTE.gold, 1).fillCircle(W * 0.82, H * 0.14, Math.min(W, H) * 0.07);
  g.fillStyle(0xffffff, 0.85);
  for (const [cx, cy, s] of [[W * 0.18, H * 0.12, 1], [W * 0.5, H * 0.2, 0.7], [W * 0.75, H * 0.3, 0.6]] as const) {
    g.fillEllipse(cx, cy, 160 * s, 50 * s).fillEllipse(cx - 40 * s, cy + 8 * s, 100 * s, 44 * s).fillEllipse(cx + 50 * s, cy + 6 * s, 110 * s, 46 * s);
  }
  g.fillStyle(PALETTE.greenDark, 1).fillEllipse(W * 0.2, groundY + 10, W * 0.9, H * 0.22);
  g.fillStyle(PALETTE.green, 1).fillEllipse(W * 0.85, groundY + 20, W * 0.9, H * 0.2);
  g.fillStyle(PALETTE.greenLight, 1).fillRect(0, groundY, W, H - groundY);
  g.fillStyle(PALETTE.green, 0.5);
  for (let i = 0; i < 14; i += 1) { const x = (i / 14) * W + 20; g.fillTriangle(x, groundY + 2, x + 10, groundY - 18, x + 20, groundY + 2); }
  if (options.road) {
    g.fillStyle(PALETTE.asphalt, 1).fillRect(0, groundY + 30, W, H * 0.16);
    g.fillStyle(PALETTE.gold, 1);
    for (let x = 0; x < W; x += 90) g.fillRect(x, groundY + 30 + H * 0.08 - 4, 50, 8);
  }
  return groundY;
}

/** Soft vignette panel behind cards. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.35) {
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.black, alpha).fillRoundedRect(x - w / 2, y - h / 2, w, h, 28);
  return g;
}
