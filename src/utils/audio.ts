/**
 * Web Audio Ambient Engine for Gate 7 Soundstage
 * Synthesizes warm vinyl crackle, gentle sub-bass & cozy lo-fi harmonic tones
 */

class SoundstageAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private noiseNode: AudioNode | null = null;
  private chordInterval: any = null;
  private masterGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(volumePercent: number) {
    if (this.masterGain && this.ctx) {
      const vol = Math.max(0, Math.min(1, (volumePercent / 100) * 0.25));
      this.masterGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.1);
    }
  }

  public start() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;
      if (this.isPlaying) return;
      this.isPlaying = true;

      // 1. Vinyl Crackle & Tape Hiss generator
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Pink-ish gentle crackle
        const r = Math.random() * 2 - 1;
        output[i] = r * (Math.random() > 0.99 ? 0.05 : 0.008);
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      whiteNoise.start();
      this.noiseNode = whiteNoise;

      // 2. Harmonic chords loop (warm Rhodes piano style frequencies)
      // Chords: Dmaj7 -> Bm7 -> Gmaj7 -> A7
      const chords = [
        [146.83, 220.0, 277.18, 329.63], // D3, A3, C#4, E4
        [123.47, 185.0, 220.0, 277.18],  // B2, F#3, A3, C#4
        [98.0, 146.83, 196.0, 246.94],   // G2, D3, G3, B3
        [110.0, 164.81, 220.0, 277.18],  // A2, E3, A3, C#4
      ];

      let chordIndex = 0;
      const playChord = () => {
        if (!this.isPlaying || !this.ctx || !this.masterGain) return;
        const notes = chords[chordIndex % chords.length];
        chordIndex++;

        notes.forEach((freq) => {
          if (!this.ctx || !this.masterGain) return;
          const osc = this.ctx.createOscillator();
          const oscGain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

          const now = this.ctx.currentTime;
          oscGain.gain.setValueAtTime(0, now);
          oscGain.gain.linearRampToValueAtTime(0.045, now + 0.6);
          oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

          osc.connect(oscGain);
          oscGain.connect(this.masterGain);

          osc.start(now);
          osc.stop(now + 4.0);
        });
      };

      playChord();
      this.chordInterval = setInterval(playChord, 4000);
    } catch (e) {
      console.warn('Audio autoplay prevented or unavailable:', e);
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop();
        this.noiseNode.disconnect();
      } catch (e) {}
      this.noiseNode = null;
    }
    if (this.chordInterval) {
      clearInterval(this.chordInterval);
      this.chordInterval = null;
    }
  }
}

export const audioEngine = new SoundstageAudioEngine();
