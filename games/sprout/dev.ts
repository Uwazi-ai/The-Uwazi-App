/**
 * Standalone dev harness: `npm run sprout:dev` then open the LAN URL on the iPhone.
 * Saves stay in this browser; nothing touches Supabase.
 */
import { createSproutGame, type SproutHost } from "./src/index";

const REMOTE_KEY = "sprout:dev-remote";
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } };

/** A small in-page note, since the harness has no app around it. */
function toast(text: string) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111;color:#FFC531;font:800 16px Nunito,sans-serif;padding:12px 18px;border:3px solid #FFC531;border-radius:16px;z-index:9999;max-width:90vw;text-align:center";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

const host: SproutHost = {
  loadSave: async () => JSON.parse(read(REMOTE_KEY) ?? "null"),
  saveProgress: async data => { write(REMOTE_KEY, JSON.stringify(data)); },
  logParentEvent: async event => { console.info("[parent event]", event); },
  getVoiceClipUrl: async () => null,
  getFacePhotoUrl: async () => null,
  openGrownUpTools: tab => { toast(tab === "voice" ? "Voice recording lives inside the Same Sky app." : "The hero photo is added inside the Same Sky app."); },
  exit: () => { location.reload(); },
};

async function boot() {
  // Make sure the display fonts are measured correctly on the first frame.
  if ("fonts" in document) await Promise.all(['400 24px "Lilita One"', "800 24px Nunito"].map(f => document.fonts.load(f).catch(() => []))).catch(() => undefined);
  const parent = document.getElementById("game")!;
  const game = createSproutGame(parent, host);
  (window as unknown as { sprout: typeof game }).sprout = game;
}
void boot();
