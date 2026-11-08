/**
 * Standalone dev harness: `npm run sprout:dev` then open the LAN URL on the iPhone.
 * Saves stay in this browser; nothing touches Supabase.
 */
import { createSproutGame, type SproutHost } from "./src/index";

const REMOTE_KEY = "sprout:dev-remote";
const host: SproutHost = {
  loadSave: async () => JSON.parse(localStorage.getItem(REMOTE_KEY) ?? "null"),
  saveProgress: async data => { localStorage.setItem(REMOTE_KEY, JSON.stringify(data)); },
  logParentEvent: async event => { console.info("[parent event]", event); },
  getVoiceClipUrl: async () => null,
  getFacePhotoUrl: async () => null,
  openGrownUpTools: tab => { alert(`Grown-up tools (${tab}) open inside the Same Sky app.`); },
  exit: () => { location.reload(); },
};

const parent = document.getElementById("game")!;
const game = createSproutGame(parent, host);
(window as unknown as { sprout: typeof game }).sprout = game;
