import Phaser from "phaser";
import { getContext, type GameContext } from "../context";
import { GAMES, gameById } from "../games";
import { RoundButton, bodyStyle, displayStyle, drawBackIcon } from "../ui/widgets";
import { HEX, PALETTE } from "../config";
import { capeSwipe } from "../systems/transitions";
import { totalStars } from "../systems/rewards";

/** Trophy room: every three-star trophy, personal bests and the best streak. */
export class TrophyScene extends Phaser.Scene {
  private ctx!: GameContext;
  constructor() { super("Trophies"); }

  create() {
    this.ctx = getContext(this);
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor("#1F2A33");
    this.scale.once(Phaser.Scale.Events.RESIZE, () => this.time.delayedCall(200, () => this.scene.restart()));
    this.add.text(W / 2, 54, "Trophy Room", displayStyle(Math.min(50, W * 0.08), HEX.gold)).setOrigin(0.5);
    const save = this.ctx.save;
    this.add.text(W / 2, 104, `★ ${totalStars(save)} stars   ·   🔥 best streak ${save.streak.best} days`, bodyStyle(22, HEX.cream)).setOrigin(0.5);
    new RoundButton(this, 56, 56, drawBackIcon, () => capeSwipe(this, "Hub", {}, this.ctx.reduced));
    this.ctx.voice.say(save.trophies.length ? `You have ${save.trophies.length} trophies, hero!` : "Earn three stars on a level to win a trophy!");

    const cols = Math.max(2, Math.floor((W - 40) / 190));
    const shelfRows = Math.ceil(Math.max(1, save.trophies.length) / cols);
    const shelf = this.add.graphics();
    for (let row = 0; row < shelfRows; row += 1) shelf.fillStyle(0x8a5a2b, 1).fillRect(20, 230 + row * 180, W - 40, 14);
    save.trophies.forEach((trophy, index) => {
      const col = index % cols, row = Math.floor(index / cols);
      const x = 20 + (W - 40) / cols * (col + 0.5), y = 200 + row * 180;
      const c = this.add.container(x, y).setScale(0);
      const g = this.add.graphics();
      const color = gameById(trophy.gameId).color;
      g.fillStyle(PALETTE.gold, 1).fillRoundedRect(-30, -40, 60, 48, 10).fillRect(-8, 6, 16, 18).fillRoundedRect(-26, 22, 52, 10, 3);
      g.lineStyle(6, PALETTE.gold, 1).beginPath().arc(-33, -22, 12, Math.PI / 2, Math.PI * 1.5).strokePath().beginPath().arc(33, -22, 12, -Math.PI / 2, Math.PI / 2).strokePath();
      g.fillStyle(color, 1).fillCircle(0, -16, 12);
      c.add([g, this.add.text(0, 52, trophy.title, { ...displayStyle(18, HEX.white), wordWrap: { width: 170 } }).setOrigin(0.5, 0)]);
      this.tweens.add({ targets: c, scale: 1, duration: 300, delay: index * 60, ease: "Back.easeOut" });
    });

    // personal bests
    const bestsY = 200 + Math.ceil(Math.max(1, save.trophies.length) / cols) * 180 + 10;
    this.add.text(W / 2, bestsY, "Personal bests", displayStyle(30, HEX.gold)).setOrigin(0.5);
    GAMES.forEach((game, index) => {
      const levels = save.games[game.id] ?? {};
      const best = Object.values(levels).reduce((m, l) => Math.max(m, l.bestScore), 0);
      const plays = Object.values(levels).reduce((s, l) => s + l.plays, 0);
      this.add.text(40, bestsY + 40 + index * 32, game.title, bodyStyle(20, HEX.cream)).setOrigin(0, 0.5);
      this.add.text(W - 40, bestsY + 40 + index * 32, plays ? `${best}% · ${plays} plays` : "not yet", bodyStyle(20, HEX.gold)).setOrigin(1, 0.5);
    });
  }
}
