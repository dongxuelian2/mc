export class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();

  private getContext() {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  resume() {
    const ctx = this.getContext();
    return ctx.resume?.();
  }

  async load(url: string) {
    if (this.buffers.has(url)) return;
    const ctx = this.getContext();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load audio: ${url}`);
    const arr = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arr);
    this.buffers.set(url, buffer);
  }

  tryPlay(url: string, options?: { volume?: number; playbackRate?: number }) {
    void this.load(url)
      .then(() => {
        this.play(url, options);
      })
      .catch(() => {
        // ignore missing/blocked assets
      });
  }

  playAnyLoadedOrFallback(urls: readonly string[], fallback: () => void, options?: { volume?: number; playbackRate?: number }) {
    const loaded = urls.filter((u) => this.buffers.has(u));
    if (loaded.length > 0) {
      const url = loaded[Math.floor(Math.random() * loaded.length)];
      this.play(url, options);
      return;
    }
    fallback();
    const first = urls[0];
    if (first) void this.load(first).catch(() => {});
  }

  play(url: string, options?: { volume?: number; playbackRate?: number }) {
    const ctx = this.getContext();
    const buffer = this.buffers.get(url);
    if (!buffer) throw new Error(`Audio not loaded: ${url}`);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options?.playbackRate ?? 1;

    const gain = ctx.createGain();
    gain.gain.value = options?.volume ?? 0.6;

    source.connect(gain).connect(ctx.destination);
    source.start();
  }

  playBreakFallback() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 + Math.random() * 60, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.25);
  }
}
