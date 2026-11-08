import Phaser from "phaser";
import { getContext, type GameContext } from "../context";
import { Chip, RoundButton, bodyStyle, displayStyle, drawBackIcon } from "../ui/widgets";
import { HEX, PALETTE } from "../config";
import { capeSwipe } from "../systems/transitions";
import { hashPin, isValidPin } from "../systems/pin";
import { SKILL_LABELS, summarizeSkill } from "../systems/mastery";
import type { PlayTimerMinutes, Settings, SkillId, VoiceChoice } from "../types";

type Page = "pin" | "settings" | "skills";

/** Grown-up corner behind a four digit PIN: settings and the skills report. */
export class GrownUpScene extends Phaser.Scene {
  private ctx!: GameContext;
  private page: Page = "pin";
  private entry = "";
  private firstEntry: string | null = null;
  private pinLabel!: Phaser.GameObjects.Text;
  private dots!: Phaser.GameObjects.Text;
  private items: Phaser.GameObjects.GameObject[] = [];

  constructor() { super("GrownUp"); }

  create() {
    this.ctx = getContext(this);
    this.cameras.main.setBackgroundColor("#111111");
    this.scale.once(Phaser.Scale.Events.RESIZE, () => this.time.delayedCall(200, () => this.scene.restart()));
    this.ctx.voice.stop();
    this.ctx.caption = null;
    new RoundButton(this, 56, 56, drawBackIcon, () => capeSwipe(this, "Hub", {}, this.ctx.reduced));
    this.showPin();
  }

  private clear() { this.items.forEach(item => item.destroy()); this.items = []; }
  private keep<T extends Phaser.GameObjects.GameObject>(item: T): T { this.items.push(item); return item; }

  private showPin() {
    this.clear();
    this.page = "pin";
    const W = this.scale.width, H = this.scale.height;
    const hasPin = !!this.ctx.save.settings.pinHash;
    this.keep(this.add.text(W / 2, 60, "Grown-up corner", displayStyle(Math.min(44, W * 0.08), HEX.gold)).setOrigin(0.5));
    this.pinLabel = this.keep(this.add.text(W / 2, 120, hasPin ? "Enter the 4-digit PIN" : "Set a 4-digit PIN for grown-ups", { ...bodyStyle(22, HEX.cream), wordWrap: { width: W - 60 } }).setOrigin(0.5));
    this.dots = this.keep(this.add.text(W / 2, 180, "○ ○ ○ ○", displayStyle(40, HEX.white)).setOrigin(0.5));
    const keyW = Math.min(110, (W - 80) / 3), keyH = Math.min(84, (H - 320) / 4);
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];
    keys.forEach((key, index) => {
      const col = index % 3, row = Math.floor(index / 3);
      const x = W / 2 + (col - 1) * (keyW + 14), y = 250 + row * (keyH + 14) + keyH / 2;
      this.keep(new Chip(this, x, y, key, { width: keyW, height: keyH, fontSize: 36, onTap: () => this.pressKey(key) }));
    });
  }

  private pressKey(key: string) {
    this.ctx.audio.unlock();
    this.ctx.audio.play("tick");
    if (key === "⌫") this.entry = this.entry.slice(0, -1);
    else if (key === "✓") return this.submitPin();
    else if (this.entry.length < 4) this.entry += key;
    this.dots.setText([0, 1, 2, 3].map(i => (i < this.entry.length ? "●" : "○")).join(" "));
    if (this.entry.length === 4) this.time.delayedCall(150, () => this.submitPin());
  }

  private submitPin() {
    if (!isValidPin(this.entry)) { this.pinLabel.setText("Four digits, please."); return; }
    const stored = this.ctx.save.settings.pinHash;
    if (!stored) {
      if (this.firstEntry === null) { this.firstEntry = this.entry; this.entry = ""; this.dots.setText("○ ○ ○ ○"); this.pinLabel.setText("Type it once more to confirm."); return; }
      if (this.firstEntry !== this.entry) { this.firstEntry = null; this.entry = ""; this.dots.setText("○ ○ ○ ○"); this.pinLabel.setText("Those did not match. Set a 4-digit PIN."); this.ctx.audio.play("wrong"); return; }
      const pinHash = hashPin(this.entry);
      this.ctx.store.update(data => ({ ...data, settings: { ...data.settings, pinHash } }));
      this.ctx.audio.play("correct");
      return this.showSettings();
    }
    if (hashPin(this.entry) === stored) { this.ctx.audio.play("correct"); return this.showSettings(); }
    this.ctx.audio.play("wrong");
    this.entry = "";
    this.dots.setText("○ ○ ○ ○");
    this.pinLabel.setText("That is not the PIN. Try again.");
    this.cameras.main.shake(120, 0.004);
  }

  private setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    this.ctx.store.update(data => ({ ...data, settings: { ...data.settings, [key]: value } }));
    if (key === "playTimerMin") { this.ctx.timerEndsAt = null; this.ctx.timerDone = false; this.ctx.sessionStartedAt = Date.now(); this.ctx.store.update(d => d); }
    this.showSettings();
  }

  private showSettings() {
    this.clear();
    this.page = "settings";
    const W = this.scale.width, H = this.scale.height;
    const s = this.ctx.save.settings;
    this.keep(this.add.text(W / 2, 60, "Settings", displayStyle(Math.min(44, W * 0.08), HEX.gold)).setOrigin(0.5));
    const rowH = Math.min(82, (H - 240) / 8);
    const chipW = Math.min(W - 48, 560);
    const rows: { label: string; value: string; onTap: () => void }[] = [
      { label: "Voice", value: { mama: "Mama", myke: "Myke", robot: "Robot" }[s.voice], onTap: () => this.setSetting("voice", ({ mama: "myke", myke: "robot", robot: "mama" } as Record<VoiceChoice, VoiceChoice>)[s.voice]) },
      { label: "Sound", value: s.sound ? "On" : "Off", onTap: () => this.setSetting("sound", !s.sound) },
      { label: "Music", value: s.music ? "On" : "Off", onTap: () => this.setSetting("music", !s.music) },
      { label: "Play timer", value: s.playTimerMin ? `${s.playTimerMin} min` : "Off", onTap: () => this.setSetting("playTimerMin", ([0, 10, 15, 20, 30] as PlayTimerMinutes[])[([0, 10, 15, 20, 30].indexOf(s.playTimerMin) + 1) % 5]) },
      { label: "Starting level", value: s.difficulty === "auto" ? "Auto" : `Level ${s.difficulty}`, onTap: () => this.setSetting("difficulty", s.difficulty === "auto" ? 1 : s.difficulty === 3 ? "auto" : ((s.difficulty + 1) as 2 | 3)) },
      { label: "Less motion", value: s.reducedMotion === "on" ? "On" : "Follow device", onTap: () => this.setSetting("reducedMotion", s.reducedMotion === "on" ? "system" : "on") },
    ];
    rows.forEach((row, index) => {
      const y = 120 + index * (rowH + 10) + rowH / 2;
      const chip = this.keep(new Chip(this, W / 2, y, row.label, { width: chipW, height: rowH, fontSize: Math.min(28, rowH * 0.38), onTap: row.onTap }));
      chip.label.setOrigin(0, 0.5).setX(-chipW / 2 + 24);
      chip.add(this.add.text(chipW / 2 - 24, 0, row.value, displayStyle(Math.min(28, rowH * 0.38), HEX.gold)).setOrigin(1, 0.5));
    });
    const y2 = 120 + rows.length * (rowH + 10) + 30;
    const half = (chipW - 12) / 2;
    this.keep(new Chip(this, W / 2 - half / 2 - 6, y2, "Skills report", { width: half, height: 70, fontSize: 24, fill: PALETTE.blue, onTap: () => this.showSkills() }));
    this.keep(new Chip(this, W / 2 + half / 2 + 6, y2, "Record voices", { width: half, height: 70, fontSize: 24, fill: PALETTE.teal, onTap: () => this.ctx.host.openGrownUpTools("voice") }));
    this.keep(new Chip(this, W / 2 - half / 2 - 6, y2 + 84, "Hero photo", { width: half, height: 70, fontSize: 24, fill: PALETTE.purple, onTap: () => this.ctx.host.openGrownUpTools("photo") }));
    this.keep(new Chip(this, W / 2 + half / 2 + 6, y2 + 84, "Change PIN", { width: half, height: 70, fontSize: 24, onTap: () => { this.ctx.store.update(data => ({ ...data, settings: { ...data.settings, pinHash: undefined } })); this.entry = ""; this.firstEntry = null; this.showPin(); } }));
    this.keep(new Chip(this, W / 2, y2 + 168, "Leave the game", { width: chipW, height: 70, fontSize: 24, fill: PALETTE.red, onTap: () => { void this.ctx.store.flush(); this.ctx.host.exit(); } }));
  }

  private showSkills() {
    this.clear();
    this.page = "skills";
    const W = this.scale.width, H = this.scale.height;
    const save = this.ctx.save;
    this.keep(this.add.text(W / 2, 54, "Skills report", displayStyle(Math.min(40, W * 0.07), HEX.gold)).setOrigin(0.5));
    const minutes = Math.round(save.timePlayedMs / 60000);
    this.keep(this.add.text(W / 2, 96, `Time played: ${minutes} min · XP ${save.xp} · streak ${save.streak.count} days (best ${save.streak.best})`, { ...bodyStyle(17, HEX.cream), wordWrap: { width: W - 40 } }).setOrigin(0.5));
    const skills = Object.keys(SKILL_LABELS) as SkillId[];
    const rowH = Math.min(34, (H - 300) / skills.length);
    const barX = Math.min(W * 0.45, 260), barW = W - barX - 120;
    const working: string[] = [];
    skills.forEach((skill, index) => {
      const summary = summarizeSkill(save.mastery, skill);
      const y = 140 + index * rowH;
      this.keep(this.add.text(24, y, SKILL_LABELS[skill], bodyStyle(Math.min(17, rowH * 0.5), HEX.cream)).setOrigin(0, 0.5));
      const g = this.keep(this.add.graphics());
      g.fillStyle(0x2a2f36, 1).fillRoundedRect(barX, y - rowH * 0.25, barW, rowH * 0.5, 6);
      if (summary.seen) {
        const masteredW = barW * (summary.mastered / summary.seen), learningW = barW * (summary.learning / summary.seen);
        g.fillStyle(PALETTE.greenLight, 1).fillRoundedRect(barX, y - rowH * 0.25, Math.max(masteredW, 0), rowH * 0.5, 6);
        g.fillStyle(PALETTE.gold, 1).fillRect(barX + masteredW, y - rowH * 0.25, learningW, rowH * 0.5);
        g.fillStyle(PALETTE.orange, 1).fillRect(barX + masteredW + learningW, y - rowH * 0.25, barW * (summary.shaky / summary.seen), rowH * 0.5);
      }
      this.keep(this.add.text(W - 24, y, summary.seen ? `${summary.mastered}/${summary.seen} · ${Math.round(summary.accuracy * 100)}%` : "not yet", bodyStyle(Math.min(15, rowH * 0.45), HEX.gold)).setOrigin(1, 0.5));
      working.push(...summary.shakyItems.map(item => `${item}`));
    });
    const footY = 140 + skills.length * rowH + 16;
    this.keep(this.add.text(24, footY, "Green mastered · gold learning · orange needs practice", bodyStyle(14, "#9aa4ae")).setOrigin(0, 0.5));
    this.keep(this.add.text(24, footY + 30, working.length ? `Working on: ${working.slice(0, 12).join(", ")}` : "Working on: nothing shaky right now.", { ...bodyStyle(17, HEX.cream), wordWrap: { width: W - 48 } }).setOrigin(0, 0));
    this.keep(new Chip(this, W / 2, H - 60, "Back to settings", { width: Math.min(W - 48, 360), height: 68, fontSize: 24, onTap: () => this.showSettings() }));
  }
}
