import Phaser from "phaser";
import { getContext } from "../context";
import { makeParticleTextures } from "../systems/particles";
import { displayStyle } from "../ui/widgets";
import { HEX } from "../config";

/** Loads fonts and the hero photo, builds particle textures, hydrates the save, then opens the hub. */
export class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }

  async create() {
    const ctx = getContext(this);
    this.cameras.main.setBackgroundColor("#1F2A33");
    const W = this.scale.width, H = this.scale.height;
    const title = this.add.text(W / 2, H / 2 - 30, "Sprout's Garden", displayStyle(Math.min(64, W * 0.1), HEX.gold)).setOrigin(0.5).setAlpha(0);
    const sub = this.add.text(W / 2, H / 2 + 40, "Loading your hero…", { fontFamily: '"Nunito", sans-serif', fontSize: "22px", color: HEX.cream }).setOrigin(0.5);
    makeParticleTextures(this);
    await loadFonts();
    title.setStyle(displayStyle(Math.min(64, W * 0.1), HEX.gold)).setAlpha(1);
    sub.setFontFamily('"Nunito", sans-serif');
    const hydrate = ctx.store.hydrate();
    const face = ctx.host.getFacePhotoUrl().catch(() => null);
    await hydrate;
    const faceUrl = await face;
    if (faceUrl && ctx.save.hero.facePhoto) {
      await new Promise<void>(resolve => {
        this.load.image("hero-face", faceUrl);
        this.load.once(Phaser.Loader.Events.COMPLETE, () => { ctx.faceTextureKey = this.textures.exists("hero-face") ? "hero-face" : null; resolve(); });
        this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve());
        this.load.start();
      });
    }
    void ctx.voice.preload();
    ctx.touchStreak();
    this.scene.start("Hub", { fresh: true });
  }
}

async function loadFonts() {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const faces = [
    new FontFace("Lilita One", "url(/fonts/sprout/LilitaOne-Regular.ttf)", { weight: "400" }),
    new FontFace("Nunito", "url(/fonts/sprout/Nunito-800.ttf)", { weight: "800" }),
  ];
  await Promise.all(faces.map(async face => { try { document.fonts.add(await face.load()); } catch { /* fall back to system fonts */ } }));
}
