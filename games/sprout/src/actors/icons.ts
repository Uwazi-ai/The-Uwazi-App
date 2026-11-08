import Phaser from "phaser";
import { PALETTE } from "../config";

/**
 * Simple vector pictures for the words the games use, so nothing needs to be read to play.
 * Unknown words fall back to a big first letter in a coloured circle.
 */
export function drawWordIcon(scene: Phaser.Scene, word: string, size = 110): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const s = size / 2;
  const W = 0xffffff, K = PALETTE.black;
  const star = (x: number, y: number, r: number, color: number) => { g.fillStyle(color, 1).beginPath(); for (let i = 0; i < 10; i += 1) { const rad = i % 2 === 0 ? r : r * 0.45; const a = -Math.PI / 2 + (i * Math.PI) / 5; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); } g.closePath().fillPath(); };
  const eyes = (x: number, y: number, d: number) => { g.fillStyle(W, 1).fillCircle(x - d, y, s * 0.1).fillCircle(x + d, y, s * 0.1); g.fillStyle(K, 1).fillCircle(x - d, y, s * 0.05).fillCircle(x + d, y, s * 0.05); };
  switch (word) {
    case "ball": g.fillStyle(PALETTE.red, 1).fillCircle(0, 0, s * 0.8); g.fillStyle(W, 1).fillEllipse(0, 0, s * 0.5, s * 1.6); g.fillStyle(PALETTE.red, 1).fillEllipse(0, 0, s * 0.42, s * 1.5); g.fillStyle(W, 0.5).fillCircle(-s * 0.3, -s * 0.3, s * 0.15); break;
    case "sun": g.fillStyle(PALETTE.gold, 1); for (let i = 0; i < 8; i += 1) { const a = (i * Math.PI) / 4; g.fillTriangle(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, Math.cos(a + 0.25) * s * 0.65, Math.sin(a + 0.25) * s * 0.65, Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95); } g.fillCircle(0, 0, s * 0.55); break;
    case "moon": g.fillStyle(0xf5e9b8, 1).fillCircle(0, 0, s * 0.75); g.fillStyle(PALETTE.charcoal, 1).fillCircle(s * 0.3, -s * 0.15, s * 0.6); break;
    case "star": case "far": star(0, 0, s * 0.85, PALETTE.gold); break;
    case "cat": g.fillStyle(0xf0a24a, 1).fillCircle(0, s * 0.1, s * 0.6).fillTriangle(-s * 0.55, -s * 0.2, -s * 0.45, -s * 0.85, -s * 0.05, -s * 0.4).fillTriangle(s * 0.55, -s * 0.2, s * 0.45, -s * 0.85, s * 0.05, -s * 0.4); eyes(0, 0, s * 0.22); g.fillStyle(0xe06a8a, 1).fillTriangle(-s * 0.08, s * 0.2, s * 0.08, s * 0.2, 0, s * 0.3); g.lineStyle(2, K, 1).lineBetween(-s * 0.7, s * 0.15, -s * 0.2, s * 0.22).lineBetween(s * 0.7, s * 0.15, s * 0.2, s * 0.22); break;
    case "dog": g.fillStyle(0xb57a3c, 1).fillRoundedRect(-s * 0.55, -s * 0.5, s * 1.1, s * 1.1, 24).fillEllipse(-s * 0.65, -s * 0.1, s * 0.35, s * 0.8).fillEllipse(s * 0.65, -s * 0.1, s * 0.35, s * 0.8); eyes(0, -s * 0.1, s * 0.22); g.fillStyle(K, 1).fillEllipse(0, s * 0.25, s * 0.3, s * 0.2); g.fillStyle(0xe06a8a, 1).fillEllipse(0, s * 0.5, s * 0.22, s * 0.18); break;
    case "pig": g.fillStyle(0xf4a7c0, 1).fillCircle(0, 0, s * 0.7).fillTriangle(-s * 0.6, -s * 0.3, -s * 0.5, -s * 0.85, -s * 0.15, -s * 0.55).fillTriangle(s * 0.6, -s * 0.3, s * 0.5, -s * 0.85, s * 0.15, -s * 0.55); eyes(0, -s * 0.15, s * 0.25); g.fillStyle(0xe07b9b, 1).fillEllipse(0, s * 0.25, s * 0.45, s * 0.32); g.fillStyle(K, 1).fillCircle(-s * 0.1, s * 0.25, s * 0.05).fillCircle(s * 0.1, s * 0.25, s * 0.05); break;
    case "frog": g.fillStyle(PALETTE.greenLight, 1).fillEllipse(0, s * 0.15, s * 1.5, s * 1.0).fillCircle(-s * 0.4, -s * 0.4, s * 0.28).fillCircle(s * 0.4, -s * 0.4, s * 0.28); eyes(0, -s * 0.4, s * 0.4); g.lineStyle(4, K, 1).beginPath().arc(0, s * 0.1, s * 0.4, 0.3, Math.PI - 0.3).strokePath(); break;
    case "bug": g.fillStyle(PALETTE.red, 1).fillEllipse(0, s * 0.1, s * 1.2, s * 1.3); g.fillStyle(K, 1).fillCircle(0, -s * 0.6, s * 0.3).fillCircle(-s * 0.3, 0, s * 0.12).fillCircle(s * 0.3, s * 0.3, s * 0.12).fillCircle(s * 0.25, -s * 0.2, s * 0.1); g.lineStyle(3, K, 1).lineBetween(0, -s * 0.4, 0, s * 0.7); break;
    case "fan": g.fillStyle(PALETTE.blue, 1); for (let i = 0; i < 4; i += 1) { const a = (i * Math.PI) / 2; g.fillEllipse(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4, i % 2 ? s * 0.4 : s * 0.8, i % 2 ? s * 0.8 : s * 0.4); } g.fillStyle(PALETTE.gold, 1).fillCircle(0, 0, s * 0.2); break;
    case "hat": g.fillStyle(PALETTE.purple, 1).fillRoundedRect(-s * 0.45, -s * 0.8, s * 0.9, s * 0.9, 8).fillRoundedRect(-s * 0.9, 0, s * 1.8, s * 0.25, 8); g.fillStyle(PALETTE.gold, 1).fillRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.15); break;
    case "map": g.fillStyle(0xf3e3b5, 1).fillRoundedRect(-s * 0.8, -s * 0.6, s * 1.6, s * 1.2, 6); g.lineStyle(5, PALETTE.red, 1).beginPath().moveTo(-s * 0.6, s * 0.4).lineTo(-s * 0.2, -s * 0.2).lineTo(s * 0.2, s * 0.1).lineTo(s * 0.6, -s * 0.4).strokePath(); g.fillStyle(PALETTE.blue, 1).fillCircle(s * 0.6, -s * 0.4, s * 0.12); break;
    case "tent": g.fillStyle(PALETTE.orange, 1).fillTriangle(-s * 0.9, s * 0.6, 0, -s * 0.8, s * 0.9, s * 0.6); g.fillStyle(PALETTE.charcoal, 1).fillTriangle(-s * 0.3, s * 0.6, 0, -s * 0.1, s * 0.3, s * 0.6); break;
    case "bus": g.fillStyle(PALETTE.gold, 1).fillRoundedRect(-s * 0.9, -s * 0.5, s * 1.8, s * 0.95, 10); g.fillStyle(0xbfe6ff, 1); [-0.6, -0.2, 0.2, 0.6].forEach(x => g.fillRoundedRect(x * s - s * 0.14, -s * 0.38, s * 0.28, s * 0.3, 4)); g.fillStyle(K, 1).fillCircle(-s * 0.5, s * 0.5, s * 0.18).fillCircle(s * 0.5, s * 0.5, s * 0.18); break;
    case "car": case "van": g.fillStyle(word === "van" ? PALETTE.teal : PALETTE.red, 1).fillRoundedRect(-s * 0.9, -s * 0.1, s * 1.8, s * 0.55, 10).fillRoundedRect(-s * 0.45, -s * 0.55, s * (word === "van" ? 1.2 : 0.9), s * 0.5, 8); g.fillStyle(0xbfe6ff, 1).fillRoundedRect(-s * 0.35, -s * 0.47, s * 0.3, s * 0.3, 4); g.fillStyle(K, 1).fillCircle(-s * 0.5, s * 0.5, s * 0.2).fillCircle(s * 0.5, s * 0.5, s * 0.2); break;
    case "log": g.fillStyle(0x8a5a2b, 1).fillRoundedRect(-s * 0.9, -s * 0.3, s * 1.6, s * 0.6, 8); g.fillStyle(0xd9b382, 1).fillEllipse(s * 0.7, 0, s * 0.4, s * 0.6); g.fillStyle(0x8a5a2b, 1).fillEllipse(s * 0.7, 0, s * 0.2, s * 0.3); break;
    case "rug": case "mat": g.fillStyle(PALETTE.purple, 1).fillRoundedRect(-s * 0.9, -s * 0.5, s * 1.8, s * 1.0, 6); g.fillStyle(PALETTE.gold, 1).fillRoundedRect(-s * 0.7, -s * 0.3, s * 1.4, s * 0.6, 4); g.fillStyle(PALETTE.purple, 1).fillRoundedRect(-s * 0.5, -s * 0.1, s * 1.0, s * 0.2, 4); break;
    case "mug": case "cup": g.fillStyle(word === "mug" ? PALETTE.blue : PALETTE.teal, 1).fillRoundedRect(-s * 0.5, -s * 0.6, s * 1.0, s * 1.2, 10); g.lineStyle(10, word === "mug" ? PALETTE.blue : PALETTE.teal, 1).beginPath().arc(s * 0.55, 0, s * 0.3, -Math.PI / 2, Math.PI / 2).strokePath(); g.fillStyle(W, 0.4).fillRoundedRect(-s * 0.35, -s * 0.45, s * 0.2, s * 0.8, 6); break;
    case "cake": g.fillStyle(0xf4a7c0, 1).fillRoundedRect(-s * 0.8, -s * 0.1, s * 1.6, s * 0.8, 8); g.fillStyle(W, 1).fillRoundedRect(-s * 0.8, -s * 0.15, s * 1.6, s * 0.25, 8); g.fillStyle(PALETTE.gold, 1).fillRect(-s * 0.05, -s * 0.7, s * 0.1, s * 0.55); g.fillStyle(PALETTE.orange, 1).fillEllipse(0, -s * 0.78, s * 0.16, s * 0.26); break;
    case "bed": g.fillStyle(0x8a5a2b, 1).fillRect(-s * 0.9, -s * 0.5, s * 0.12, s * 1.0).fillRect(s * 0.78, -s * 0.2, s * 0.12, s * 0.7); g.fillStyle(PALETTE.blue, 1).fillRoundedRect(-s * 0.85, 0, s * 1.7, s * 0.4, 6); g.fillStyle(W, 1).fillRoundedRect(-s * 0.75, -s * 0.2, s * 0.5, s * 0.25, 6); break;
    case "top": g.fillStyle(PALETTE.red, 1).fillTriangle(-s * 0.7, -s * 0.2, s * 0.7, -s * 0.2, 0, s * 0.8); g.fillStyle(PALETTE.gold, 1).fillEllipse(0, -s * 0.2, s * 1.4, s * 0.4); g.fillStyle(K, 1).fillRect(-s * 0.05, -s * 0.8, s * 0.1, s * 0.6); break;
    case "mop": g.fillStyle(0x8a5a2b, 1).fillRect(-s * 0.05, -s * 0.9, s * 0.1, s * 1.1); g.fillStyle(0xdddddd, 1); for (let i = -3; i <= 3; i += 1) g.fillRoundedRect(i * s * 0.14 - s * 0.05, s * 0.1, s * 0.1, s * 0.7, 4); break;
    case "pan": g.fillStyle(PALETTE.asphalt, 1).fillCircle(-s * 0.15, 0, s * 0.65); g.fillStyle(0x666a70, 1).fillCircle(-s * 0.15, 0, s * 0.5); g.fillStyle(PALETTE.asphalt, 1).fillRoundedRect(s * 0.35, -s * 0.1, s * 0.6, s * 0.2, 4); break;
    case "jar": case "jam": g.fillStyle(0xdfe9f3, 0.9).fillRoundedRect(-s * 0.5, -s * 0.5, s * 1.0, s * 1.2, 10); g.fillStyle(PALETTE.purple, 1).fillRoundedRect(-s * 0.45, -s * 0.1, s * 0.9, s * 0.75, 8); g.fillStyle(PALETTE.gold, 1).fillRoundedRect(-s * 0.55, -s * 0.75, s * 1.1, s * 0.3, 6); break;
    case "pen": g.fillStyle(PALETTE.blue, 1).fillRoundedRect(-s * 0.15, -s * 0.9, s * 0.3, s * 1.4, 6); g.fillStyle(0xf3e3b5, 1).fillTriangle(-s * 0.15, s * 0.5, s * 0.15, s * 0.5, 0, s * 0.9); g.fillStyle(K, 1).fillTriangle(-s * 0.05, s * 0.78, s * 0.05, s * 0.78, 0, s * 0.9); break;
    case "egg": g.fillStyle(0xfff3d6, 1).fillEllipse(0, 0, s * 1.2, s * 1.6); g.fillStyle(PALETTE.teal, 1).fillCircle(-s * 0.2, -s * 0.2, s * 0.1).fillCircle(s * 0.25, s * 0.1, s * 0.12).fillCircle(-s * 0.1, s * 0.4, s * 0.08); break;
    case "bun": g.fillStyle(0xe0a860, 1).fillEllipse(0, 0, s * 1.5, s * 1.1); g.fillStyle(W, 1).fillCircle(-s * 0.3, -s * 0.2, s * 0.06).fillCircle(s * 0.1, -s * 0.3, s * 0.06).fillCircle(s * 0.35, 0, s * 0.06); break;
    case "bat": g.fillStyle(PALETTE.charcoal, 1).fillTriangle(-s * 0.9, -s * 0.3, -s * 0.1, 0, -s * 0.8, s * 0.4).fillTriangle(s * 0.9, -s * 0.3, s * 0.1, 0, s * 0.8, s * 0.4).fillEllipse(0, 0, s * 0.5, s * 0.7); eyes(0, -s * 0.1, s * 0.12); break;
    case "sled": g.fillStyle(PALETTE.red, 1).fillRoundedRect(-s * 0.8, -s * 0.3, s * 1.6, s * 0.4, 6); g.lineStyle(8, PALETTE.asphalt, 1).beginPath().moveTo(-s * 0.9, s * 0.5).lineTo(s * 0.7, s * 0.5).arc(s * 0.7, s * 0.2, s * 0.3, Math.PI / 2, -Math.PI / 2, true).strokePath(); break;
    case "shed": g.fillStyle(0x8a5a2b, 1).fillRect(-s * 0.7, -s * 0.2, s * 1.4, s * 0.9); g.fillStyle(PALETTE.red, 1).fillTriangle(-s * 0.9, -s * 0.2, 0, -s * 0.85, s * 0.9, -s * 0.2); g.fillStyle(PALETTE.charcoal, 1).fillRect(-s * 0.2, s * 0.1, s * 0.4, s * 0.6); break;
    case "snake": g.lineStyle(14, PALETTE.greenLight, 1).beginPath().moveTo(-s * 0.8, s * 0.4); for (let i = 0; i <= 20; i += 1) g.lineTo(-s * 0.8 + i * s * 0.08, Math.sin(i * 0.6) * s * 0.3); g.strokePath(); g.fillStyle(PALETTE.greenLight, 1).fillCircle(s * 0.85, Math.sin(20 * 0.6) * s * 0.3, s * 0.2); g.fillStyle(PALETTE.red, 1).fillRect(s * 1.0, Math.sin(12) * s * 0.3 - 2, s * 0.15, 4); break;
    case "rake": g.fillStyle(0x8a5a2b, 1).fillRect(-s * 0.05, -s * 0.9, s * 0.1, s * 1.2); g.fillStyle(PALETTE.asphalt, 1).fillRect(-s * 0.6, s * 0.3, s * 1.2, s * 0.12); for (let i = -4; i <= 4; i += 1) g.fillRect(i * s * 0.14 - s * 0.02, s * 0.4, s * 0.05, s * 0.4); break;
    case "lake": g.fillStyle(PALETTE.blue, 1).fillEllipse(0, s * 0.1, s * 1.7, s * 1.0); g.lineStyle(4, 0xbfe6ff, 1).beginPath().moveTo(-s * 0.5, s * 0.1).lineTo(-s * 0.3, 0).lineTo(-s * 0.1, s * 0.1).lineTo(s * 0.1, 0).lineTo(s * 0.3, s * 0.1).strokePath(); g.fillStyle(PALETTE.greenLight, 1).fillEllipse(0, s * 0.7, s * 1.9, s * 0.4); break;
    case "wig": g.fillStyle(PALETTE.gold, 1).fillCircle(0, -s * 0.2, s * 0.7); for (let i = -2; i <= 2; i += 1) g.fillRoundedRect(i * s * 0.3 - s * 0.12, 0, s * 0.24, s * 0.8, 10); break;
    case "dig": g.fillStyle(PALETTE.sand, 1).fillEllipse(0, s * 0.5, s * 1.8, s * 0.6); g.fillStyle(0x8a5a2b, 1).fillRect(-s * 0.05, -s * 0.9, s * 0.1, s * 1.0); g.fillStyle(PALETTE.asphalt, 1).fillRoundedRect(-s * 0.3, 0, s * 0.6, s * 0.5, 8); break;
    case "hug": case "man": case "run": case "fun": case "hop": case "jump": case "big": case "we": case "you": case "my": case "go": case "up": {
      // Sprout-like figure doing the action: arms up for hug/fun, mid-air for hop/jump
      const air = ["hop", "jump", "up"].includes(word) ? -s * 0.25 : 0;
      g.fillStyle(PALETTE.greenLight, 1).fillCircle(0, -s * 0.2 + air, s * 0.5);
      g.fillStyle(PALETTE.charcoal, 1).fillRoundedRect(-s * 0.3, -s * 0.5 + air, s * 0.6, s * 0.22, 8);
      eyes(0, -s * 0.4 + air, s * 0.18);
      g.lineStyle(10, PALETTE.greenDark, 1).lineBetween(-s * 0.4, s * 0.1 + air, -s * 0.8, ["hug", "fun", "up", "big"].includes(word) ? -s * 0.5 + air : s * 0.4 + air).lineBetween(s * 0.4, s * 0.1 + air, s * 0.8, ["hug", "fun", "up", "big"].includes(word) ? -s * 0.5 + air : s * 0.4 + air);
      g.lineBetween(-s * 0.2, s * 0.3 + air, -s * 0.35, s * 0.85).lineBetween(s * 0.2, s * 0.3 + air, s * 0.35, s * 0.85);
      if (word === "big") { g.fillStyle(PALETTE.gold, 1); star(s * 0.6, -s * 0.8, s * 0.2, PALETTE.gold); }
      break;
    }
    case "red": g.fillStyle(PALETTE.red, 1).fillRoundedRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4, 20); break;
    case "pop": g.fillStyle(PALETTE.orange, 1).fillCircle(0, -s * 0.1, s * 0.6); g.lineStyle(6, PALETTE.orange, 1); for (let i = 0; i < 6; i += 1) { const a = (i * Math.PI) / 3; g.lineBetween(Math.cos(a) * s * 0.72, -s * 0.1 + Math.sin(a) * s * 0.72, Math.cos(a) * s * 0.95, -s * 0.1 + Math.sin(a) * s * 0.95); } break;
    case "fog": g.fillStyle(0xd0d7de, 0.9).fillEllipse(-s * 0.3, -s * 0.2, s * 0.9, s * 0.6).fillEllipse(s * 0.3, -s * 0.1, s * 1.0, s * 0.7).fillEllipse(0, s * 0.3, s * 1.6, s * 0.6); break;
    case "the": case "and": case "see": default: {
      const colors = [PALETTE.blue, PALETTE.orange, PALETTE.teal, PALETTE.purple, PALETTE.greenLight];
      const color = colors[word.charCodeAt(0) % colors.length];
      g.fillStyle(color, 1).fillCircle(0, 0, s * 0.85);
      const letter = scene.add.text(0, 0, word.toUpperCase(), { fontFamily: '"Lilita One", sans-serif', fontSize: `${word.length > 2 ? s * 0.7 : s}px`, color: "#FFFFFF", stroke: "#111111", strokeThickness: 5 }).setOrigin(0.5);
      c.add([g, letter]);
      return c;
    }
  }
  c.add(g);
  return c;
}

/** Shapes for Block Builder and the park. */
export function drawShape(g: Phaser.GameObjects.Graphics, shape: string, x: number, y: number, size: number, color: number) {
  g.fillStyle(color, 1);
  const h = size / 2;
  switch (shape) {
    case "circle": g.fillCircle(x, y, h); break;
    case "square": g.fillRoundedRect(x - h, y - h, size, size, 8); break;
    case "triangle": g.fillTriangle(x - h, y + h * 0.9, x + h, y + h * 0.9, x, y - h); break;
    case "rectangle": g.fillRoundedRect(x - h * 1.3, y - h * 0.6, size * 1.3, size * 0.6, 8); break;
    case "star": g.beginPath(); for (let i = 0; i < 10; i += 1) { const r = i % 2 === 0 ? h : h * 0.45; const a = -Math.PI / 2 + (i * Math.PI) / 5; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); } g.closePath().fillPath(); break;
    case "heart": g.fillCircle(x - h * 0.45, y - h * 0.3, h * 0.5).fillCircle(x + h * 0.45, y - h * 0.3, h * 0.5).fillTriangle(x - h * 0.95, y - h * 0.1, x + h * 0.95, y - h * 0.1, x, y + h); break;
    default: g.fillCircle(x, y, h);
  }
}
