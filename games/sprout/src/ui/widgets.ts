import Phaser from "phaser";
import { FONT_BODY, FONT_DISPLAY, HEX, PALETTE, TOUCH_MIN } from "../config";

export const displayStyle = (size: number, color: string = HEX.white): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT_DISPLAY, fontSize: `${size}px`, color, stroke: HEX.black, strokeThickness: Math.max(3, size * 0.08), align: "center",
});
export const bodyStyle = (size: number, color: string = HEX.white): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT_BODY, fontSize: `${size}px`, fontStyle: "800", color, align: "center",
});

export interface ChipOptions {
  width?: number; height?: number; fill?: number; border?: number; textColor?: string; fontSize?: number;
  onTap?: () => void; icon?: (g: Phaser.GameObjects.Graphics, w: number, h: number) => void;
}

/**
 * Charcoal chip with a 3px gold border and a chunky dark drop shadow. The hit area is never
 * smaller than TOUCH_MIN even when the chip is drawn smaller.
 */
export class Chip extends Phaser.GameObjects.Container {
  readonly label: Phaser.GameObjects.Text;
  readonly bg: Phaser.GameObjects.Graphics;
  readonly chipWidth: number;
  readonly chipHeight: number;
  baseScale = 1;
  private fill: number;
  private border: number;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, options: ChipOptions = {}) {
    super(scene, x, y);
    this.chipWidth = options.width ?? 260;
    this.chipHeight = options.height ?? 96;
    this.fill = options.fill ?? PALETTE.charcoal;
    this.border = options.border ?? PALETTE.gold;
    this.bg = scene.add.graphics();
    this.draw(options.icon);
    this.label = scene.add.text(0, 0, text, displayStyle(options.fontSize ?? Math.min(40, this.chipHeight * 0.42), options.textColor ?? HEX.white)).setOrigin(0.5);
    if (options.icon) this.label.setX(this.chipHeight * 0.3);
    this.add([this.bg, this.label]);
    const hitW = Math.max(TOUCH_MIN, this.chipWidth), hitH = Math.max(TOUCH_MIN, this.chipHeight);
    // Phaser shifts a Container's hit area by its display origin, so the default centered box is right.
    this.setSize(hitW, hitH).setInteractive();
    this.on(Phaser.Input.Events.POINTER_DOWN, () => { this.pressed = true; this.scene.tweens.add({ targets: this, scaleX: this.baseScale * 0.94, scaleY: this.baseScale * 0.94, duration: 60 }); });
    const release = () => { if (!this.pressed) return; this.pressed = false; this.scene.tweens.add({ targets: this, scaleX: this.baseScale, scaleY: this.baseScale, duration: 90, ease: "Back.easeOut" }); };
    this.on(Phaser.Input.Events.POINTER_OUT, release);
    this.on(Phaser.Input.Events.POINTER_UP, () => { release(); options.onTap?.(); });
    scene.add.existing(this);
  }

  private draw(icon?: ChipOptions["icon"]) {
    const w = this.chipWidth, h = this.chipHeight, r = Math.min(26, h / 2.6);
    this.bg.clear();
    this.bg.fillStyle(PALETTE.black, 0.55).fillRoundedRect(-w / 2 + 4, -h / 2 + 8, w, h, r);
    this.bg.fillStyle(this.fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    this.bg.lineStyle(3, this.border, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    if (icon) icon(this.bg, w, h);
  }

  setChipColors(fill: number, border: number) { this.fill = fill; this.border = border; this.draw(); return this; }
  setText(text: string) { this.label.setText(text); return this; }
}

/** Black and gold mission bar at the top with a speaker button to hear the prompt again. */
export class MissionBar extends Phaser.GameObjects.Container {
  readonly text: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Graphics;
  private barWidth: number;

  constructor(scene: Phaser.Scene, width: number, y: number, onRepeat: () => void) {
    super(scene, width / 2, y);
    this.barWidth = Math.min(width - 24, 1100);
    this.bg = scene.add.graphics();
    this.redraw();
    this.text = scene.add.text(-this.barWidth / 2 + 24, 0, "", { ...displayStyle(34, HEX.gold), align: "left", wordWrap: { width: this.barWidth - 150 } }).setOrigin(0, 0.5);
    const speaker = scene.add.container(this.barWidth / 2 - 60, 0);
    const sg = scene.add.graphics();
    sg.fillStyle(PALETTE.gold, 1).fillRoundedRect(-36, -36, 72, 72, 18);
    sg.fillStyle(PALETTE.black, 1).fillTriangle(-14, -10, -14, 10, -2, 10).fillRect(-20, -8, 8, 16).fillTriangle(-2, -22, -2, 22, 10, 0);
    sg.lineStyle(4, PALETTE.black, 1).beginPath().arc(8, 0, 16, -0.9, 0.9).strokePath().beginPath().arc(8, 0, 24, -0.9, 0.9).strokePath();
    speaker.add(sg).setSize(TOUCH_MIN, TOUCH_MIN).setInteractive({ useHandCursor: true });
    speaker.on(Phaser.Input.Events.POINTER_UP, () => { onRepeat(); scene.tweens.add({ targets: speaker, scale: 1.15, duration: 70, yoyo: true }); });
    this.add([this.bg, this.text, speaker]);
    scene.add.existing(this);
    this.setDepth(200);
  }

  private redraw() {
    const w = this.barWidth, h = 96;
    this.bg.clear();
    this.bg.fillStyle(PALETTE.black, 0.6).fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, 22);
    this.bg.fillStyle(PALETTE.black, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    this.bg.lineStyle(4, PALETTE.gold, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
  }

  setMission(text: string) {
    this.text.setText(text);
    const size = text.length > 34 ? 26 : text.length > 22 ? 30 : 34;
    this.text.setFontSize(size);
    this.scene.tweens.add({ targets: this.text, scaleX: { from: 1.08, to: 1 }, scaleY: { from: 1.08, to: 1 }, duration: 160, ease: "Back.easeOut" });
  }
}

/** Orange progress bar with a gold cap. */
export class ProgressBar extends Phaser.GameObjects.Container {
  private fill: Phaser.GameObjects.Graphics;
  private value = 0;
  constructor(scene: Phaser.Scene, x: number, y: number, private readonly barWidth: number, private readonly barHeight = 26, private readonly color: number = PALETTE.orange) {
    super(scene, x, y);
    const bg = scene.add.graphics();
    bg.fillStyle(PALETTE.black, 0.5).fillRoundedRect(-barWidth / 2 + 2, -barHeight / 2 + 4, barWidth, barHeight, barHeight / 2);
    bg.fillStyle(PALETTE.charcoal, 1).fillRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, barHeight / 2);
    bg.lineStyle(3, PALETTE.gold, 1).strokeRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, barHeight / 2);
    this.fill = scene.add.graphics();
    this.add([bg, this.fill]);
    scene.add.existing(this);
    this.setDepth(200);
  }
  /** Animates toward value in 0..1. */
  setProgress(value: number) {
    const target = Phaser.Math.Clamp(value, 0, 1);
    const state = { v: this.value };
    this.scene.tweens.add({ targets: state, v: target, duration: 320, ease: "Cubic.easeOut", onUpdate: () => this.drawFill(state.v) });
    this.value = target;
  }
  private drawFill(v: number) {
    this.fill.clear();
    if (v <= 0) return;
    const w = Math.max(this.barHeight, (this.barWidth - 8) * v), h = this.barHeight - 8;
    this.fill.fillStyle(this.color, 1).fillRoundedRect(-this.barWidth / 2 + 4, -h / 2, w, h, h / 2);
    this.fill.fillStyle(PALETTE.gold, 1).fillCircle(-this.barWidth / 2 + 4 + w - h / 2, 0, h / 2 - 1);
  }
}

/** Big round icon button (home, repeat, lock). */
export class RoundButton extends Phaser.GameObjects.Container {
  baseScale = 1;
  constructor(scene: Phaser.Scene, x: number, y: number, draw: (g: Phaser.GameObjects.Graphics) => void, onTap: () => void, radius = 44, fill: number = PALETTE.charcoal) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(PALETTE.black, 0.55).fillCircle(3, 6, radius);
    g.fillStyle(fill, 1).fillCircle(0, 0, radius);
    g.lineStyle(3, PALETTE.gold, 1).strokeCircle(0, 0, radius);
    draw(g);
    this.add(g);
    const hit = Math.max(TOUCH_MIN, radius * 2);
    this.setSize(hit, hit).setInteractive(new Phaser.Geom.Circle(hit / 2, hit / 2, hit / 2), Phaser.Geom.Circle.Contains);
    this.on(Phaser.Input.Events.POINTER_UP, () => { scene.tweens.add({ targets: this, scale: this.baseScale * 1.12, duration: 70, yoyo: true }); onTap(); });
    scene.add.existing(this);
    this.setDepth(210);
  }
}

export const drawHomeIcon = (g: Phaser.GameObjects.Graphics) => {
  g.fillStyle(PALETTE.gold, 1).fillTriangle(-24, -2, 0, -24, 24, -2).fillRect(-16, -2, 32, 22);
  g.fillStyle(PALETTE.charcoal, 1).fillRect(-6, 6, 12, 14);
};
export const drawLockIcon = (g: Phaser.GameObjects.Graphics) => {
  g.lineStyle(6, PALETTE.gold, 1).beginPath().arc(0, -8, 12, Math.PI, 0).strokePath();
  g.fillStyle(PALETTE.gold, 1).fillRoundedRect(-18, -6, 36, 28, 6);
  g.fillStyle(PALETTE.charcoal, 1).fillCircle(0, 6, 4).fillRect(-2, 6, 4, 8);
};
export const drawBackIcon = (g: Phaser.GameObjects.Graphics) => {
  g.fillStyle(PALETTE.gold, 1).fillTriangle(-22, 0, 2, -20, 2, 20).fillRect(0, -8, 22, 16);
};

/** Star row for level results. */
export function drawStar(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number) {
  g.fillStyle(color, 1).beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath().fillPath();
}

/** Caption line that mirrors every spoken prompt so Kaleb sees the words. */
export class Caption extends Phaser.GameObjects.Container {
  private text: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Graphics;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  constructor(scene: Phaser.Scene, x: number, y: number, width: number) {
    super(scene, x, y);
    this.bg = scene.add.graphics();
    this.text = scene.add.text(0, 0, "", { ...bodyStyle(24, HEX.cream), wordWrap: { width: width - 40 } }).setOrigin(0.5);
    this.add([this.bg, this.text]);
    this.setDepth(220).setAlpha(0);
    scene.add.existing(this);
  }
  show(message: string) {
    this.text.setText(message);
    const w = this.text.width + 36, h = this.text.height + 20;
    this.bg.clear().fillStyle(PALETTE.black, 0.75).fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    this.hideTimer?.remove();
    this.hideTimer = this.scene.time.delayedCall(2600 + message.length * 40, () => this.scene.tweens.add({ targets: this, alpha: 0, duration: 300 }));
  }
}
