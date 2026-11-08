import type { SproutHost, VoiceChoice } from "../types";

/** Fixed clip keys a grown-up can record. Anything else is spoken by the device voice. */
export const VOICE_CLIPS: { key: string; text: string }[] = [
  { key: "great_job", text: "Great job, Super Kaleb!" },
  { key: "try_again", text: "Try again, hero!" },
  { key: "welcome", text: "Welcome back, Super Kaleb!" },
  { key: "new_record", text: "New record!" },
  { key: "level_up", text: "You leveled up!" },
  { key: "all_done", text: "All done for today, hero. Time to rest." },
];

export interface VoiceOptions {
  /** Called with the text being spoken so a caption can show. */
  onCaption?: (text: string) => void;
}

/**
 * Speaks prompts and praise. Recorded clips win when the chosen voice has one; otherwise the
 * Web Speech API speaks the text. Text always goes to the caption so Kaleb sees words too.
 */
export class VoiceSystem {
  voice: VoiceChoice = "mama";
  enabled = true;
  private clipUrls = new Map<string, string | null>();
  private current: HTMLAudioElement | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly host: SproutHost, private readonly options: VoiceOptions = {}) {
    if (typeof speechSynthesis !== "undefined") {
      const choose = () => {
        const voices = speechSynthesis.getVoices();
        this.preferredVoice = voices.find(v => /en-US/i.test(v.lang) && /Samantha|Google US English|Ava|Allison|Zoe/i.test(v.name))
          ?? voices.find(v => /^en/i.test(v.lang)) ?? null;
      };
      choose();
      speechSynthesis.addEventListener?.("voiceschanged", choose);
    }
  }

  /** Warms the clip URL cache for the current voice. Failures are silent. */
  async preload() {
    const voice = this.voice;
    if (voice === "robot") return;
    await Promise.all(VOICE_CLIPS.map(async clip => {
      const cacheKey = `${voice}:${clip.key}`;
      if (this.clipUrls.has(cacheKey)) return;
      try { this.clipUrls.set(cacheKey, await this.host.getVoiceClipUrl(voice, clip.key)); } catch { this.clipUrls.set(cacheKey, null); }
    }));
  }

  /** Forgets cached URLs, for when a grown-up records new clips. */
  invalidate() { this.clipUrls.clear(); }

  stop() {
    if (this.current) { this.current.pause(); this.current = null; }
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  /** Speaks a fixed clip by key, falling back to its text. */
  sayClip(key: string, nameOverride?: string) {
    const clip = VOICE_CLIPS.find(c => c.key === key);
    if (!clip) return;
    const text = nameOverride ? clip.text.replace("Kaleb", nameOverride) : clip.text;
    const url = this.voice === "robot" ? null : this.clipUrls.get(`${this.voice}:${key}`) ?? null;
    this.options.onCaption?.(text);
    if (!this.enabled) return;
    this.stop();
    if (url) {
      const audio = new Audio(url);
      audio.volume = 0.8;
      this.current = audio;
      audio.play().catch(() => this.speak(text));
      return;
    }
    this.speak(text);
  }

  /** Speaks free text (prompts, letters, numbers). */
  say(text: string, options: { rate?: number; pitch?: number; interrupt?: boolean } = {}) {
    this.options.onCaption?.(text);
    if (!this.enabled) return;
    if (options.interrupt !== false) this.stop();
    this.speak(text, options);
  }

  /** Spells letters slowly: "buh ... B". */
  sayLetter(letter: string, sound?: string) {
    this.say(sound ? `${sound}. ${letter.toUpperCase()}!` : letter.toUpperCase(), { rate: 0.85 });
  }

  private speak(text: string, options: { rate?: number; pitch?: number } = {}) {
    if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 0.95;
    utterance.pitch = options.pitch ?? 1.1;
    utterance.volume = 0.9;
    utterance.lang = "en-US";
    if (this.preferredVoice) utterance.voice = this.preferredVoice;
    speechSynthesis.speak(utterance);
  }
}
