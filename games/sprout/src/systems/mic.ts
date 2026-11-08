/**
 * Roar meter: reads microphone loudness only, never records or stores audio. Permission is
 * asked once; a refusal is remembered on this device so the game never nags.
 */
const ASKED_KEY = "sprout:mic-asked";

export class MicMeter {
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array | null = null;

  static previouslyDenied(storage: Pick<Storage, "getItem"> | null = typeof localStorage !== "undefined" ? localStorage : null) {
    try { return storage?.getItem(ASKED_KEY) === "denied"; } catch { return false; }
  }

  /** Resolves true when listening. Never throws. */
  async start(context: AudioContext | null): Promise<boolean> {
    if (!context || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || MicMeter.previouslyDenied()) return false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      try { localStorage.setItem(ASKED_KEY, "granted"); } catch { /* ignore */ }
      const source = context.createMediaStreamSource(this.stream);
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);
      this.data = new Uint8Array(this.analyser.fftSize);
      return true;
    } catch {
      try { localStorage.setItem(ASKED_KEY, "denied"); } catch { /* ignore */ }
      this.stop();
      return false;
    }
  }

  /** Loudness 0..1 right now. */
  level(): number {
    if (!this.analyser || !this.data) return 0;
    this.analyser.getByteTimeDomainData(this.data as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < this.data.length; i += 1) { const v = (this.data[i] - 128) / 128; sum += v * v; }
    return Math.min(1, Math.sqrt(sum / this.data.length) * 4);
  }

  stop() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.analyser = null;
    this.data = null;
  }
}
