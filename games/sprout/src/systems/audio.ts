import { VOLUME_CAP } from "../config";

/**
 * Every sound effect is synthesized in WebAudio, so the game ships no audio files and nothing
 * can ever be louder than VOLUME_CAP. Tones are short, rounded and never harsh.
 */
export type Sfx = "tap" | "pop" | "correct" | "wrong" | "stomp" | "roar" | "whoosh" | "fanfare" | "crash" | "hatch" | "sparkle" | "boost" | "jump" | "count" | "rankup" | "tick";

export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  enabled = true;
  musicEnabled = true;

  /** Must be called from a user gesture once so iOS lets audio play. */
  unlock() {
    if (this.context) { if (this.context.state === "suspended") void this.context.resume(); return; }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.context = new Ctor();
    this.master = this.context.createGain();
    this.master.gain.value = VOLUME_CAP;
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 6;
    this.master.connect(compressor).connect(this.context.destination);
    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = 0.12;
    this.musicGain.connect(this.master);
    if (this.musicEnabled) this.startMusic();
  }

  destroy() {
    this.stopMusic();
    void this.context?.close().catch(() => {});
    this.context = null;
  }

  private tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", gain = 0.5, slideTo?: number, dest?: AudioNode) {
    if (!this.context || !this.master) return;
    const osc = this.context.createOscillator();
    const env = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + duration);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env).connect(dest ?? this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noise(start: number, duration: number, gain = 0.3, lowpass = 1200) {
    if (!this.context || !this.master) return;
    const length = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    const env = this.context.createGain();
    env.gain.setValueAtTime(gain, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(env).connect(this.master);
    source.start(start);
  }

  play(name: Sfx) {
    if (!this.enabled || !this.context) return;
    if (this.context.state === "suspended") void this.context.resume();
    const t = this.context.currentTime;
    switch (name) {
      case "tap": this.tone(520, t, 0.07, "triangle", 0.35); break;
      case "tick": this.tone(880, t, 0.05, "sine", 0.2); break;
      case "pop": this.tone(300, t, 0.12, "sine", 0.5, 900); break;
      case "count": this.tone(660, t, 0.1, "triangle", 0.4, 880); break;
      case "correct": this.tone(523, t, 0.14, "triangle", 0.4); this.tone(784, t + 0.11, 0.22, "triangle", 0.4); break;
      case "wrong": this.tone(330, t, 0.18, "sine", 0.3, 240); break;
      case "stomp": this.tone(90, t, 0.25, "sine", 0.6, 40); this.noise(t, 0.18, 0.25, 500); break;
      case "roar": this.tone(140, t, 0.6, "sawtooth", 0.18, 90); this.noise(t, 0.5, 0.2, 900); break;
      case "whoosh": this.noise(t, 0.35, 0.22, 2500); break;
      case "crash": this.noise(t, 0.4, 0.35, 1400); this.tone(120, t, 0.3, "triangle", 0.3, 50); break;
      case "hatch": this.tone(400, t, 0.1, "triangle", 0.4); this.tone(600, t + 0.1, 0.1, "triangle", 0.4); this.tone(900, t + 0.2, 0.2, "triangle", 0.4); break;
      case "sparkle": [1200, 1500, 1800].forEach((f, i) => this.tone(f, t + i * 0.05, 0.12, "sine", 0.2)); break;
      case "boost": this.tone(200, t, 0.4, "sawtooth", 0.2, 800); break;
      case "jump": this.tone(300, t, 0.2, "triangle", 0.35, 600); break;
      case "fanfare": [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.12, 0.3, "triangle", 0.4)); this.tone(1046, t + 0.5, 0.6, "triangle", 0.35); break;
      case "rankup": [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, t + i * 0.1, 0.35, "triangle", 0.4)); break;
    }
  }

  /** Spoken-number style pitch run while counting: higher each number. */
  playCount(n: number) {
    if (!this.enabled || !this.context) return;
    const t = this.context.currentTime;
    this.tone(440 + Math.min(n, 20) * 30, t, 0.12, "triangle", 0.4);
  }

  /** A soft looping pad: two slow chords, very quiet. */
  startMusic() {
    if (!this.context || !this.musicGain || this.musicTimer !== null) return;
    const chords = [[262, 330, 392], [294, 349, 440], [220, 262, 330], [247, 294, 392]];
    const step = () => {
      if (!this.context || !this.musicGain || !this.musicEnabled) return;
      const t = this.context.currentTime;
      const chord = chords[this.musicStep % chords.length];
      chord.forEach((f, i) => this.tone(f / 2, t + i * 0.02, 1.9, "sine", 0.25, undefined, this.musicGain!));
      this.tone(chord[(this.musicStep * 2) % 3] * 2, t + 1, 0.4, "triangle", 0.12, undefined, this.musicGain);
      this.musicStep += 1;
    };
    step();
    this.musicTimer = window.setInterval(step, 2000);
  }

  stopMusic() {
    if (this.musicTimer !== null) { window.clearInterval(this.musicTimer); this.musicTimer = null; }
  }

  setMusic(on: boolean) {
    this.musicEnabled = on;
    if (on) this.startMusic(); else this.stopMusic();
  }

  /** Lets the roar meter borrow the audio context for a microphone analyser. */
  get audioContext() { return this.context; }
}
