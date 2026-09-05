/**
 * SoundSystem.ts
 * Web Audio API based procedural synthesizer for Haan Sageori GTA.
 * Generates realistic car engine sounds, tire screeches, horns, sirens,
 * collision impacts, and 3 procedural synth radio stations with zero external dependencies!
 */

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Master Gain
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Vehicle Engine Audio
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;

  // Siren Audio
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
  private isSirenPlaying: boolean = false;

  // Radio System
  private currentRadioStation: number = 0; // 0: Off, 1: K-Wave, 2: Night Lo-Fi, 3: Eurobeat
  private radioInterval: number | null = null;
  private readonly stationNames = [
    '📻 RADIO OFF',
    '📻 HAAN K-WAVE FM (98.1)',
    '📻 GWANGMYEONG LO-FI CHILL',
    '📻 EUROBEAT TURBO RACING'
  ];

  constructor() {
    // AudioContext will be initialized on first user interaction (click/play)
  }

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.masterGain);

      this.initEngineAudio();
      this.isInitialized = true;

      // Start default radio station 1
      this.setRadioStation(1);
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Engine Sound Synthesis ---
  private initEngineAudio() {
    if (!this.ctx || !this.sfxGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 400;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 55;

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 110;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  public updateEngineSound(speedKmh: number, isDriving: boolean, isAccelerating: boolean) {
    if (!this.ctx || !this.engineGain || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    if (!isDriving) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }

    const normSpeed = Math.min(Math.abs(speedKmh) / 120, 1.0);
    const targetFreq = 45 + normSpeed * 130 + (isAccelerating ? 25 : 0);
    const targetGain = 0.15 + (isAccelerating ? 0.12 : 0.05);
    const targetCutoff = 350 + normSpeed * 1200 + (isAccelerating ? 400 : 0);

    this.engineOsc1.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, this.ctx.currentTime, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetCutoff, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
  }

  // --- Horn Sound (Korean dual-tone car horn) ---
  public playHorn() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(420, now); // F4 approx

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(520, now); // C5 approx

    hornGain.gain.setValueAtTime(0, now);
    hornGain.gain.linearRampToValueAtTime(0.2, now + 0.04);
    hornGain.gain.setValueAtTime(0.2, now + 0.35);
    hornGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(hornGain);
    osc2.connect(hornGain);
    hornGain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.46);
    osc2.stop(now + 0.46);
  }

  // --- Police Siren (Wail & Yelp) ---
  public setPoliceSiren(active: boolean) {
    if (!this.ctx || !this.sfxGain) return;

    if (active && !this.isSirenPlaying) {
      this.isSirenPlaying = true;
      const now = this.ctx.currentTime;

      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sawtooth';
      this.sirenOsc.frequency.setValueAtTime(750, now);

      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0.18, now);

      // LFO for modulation
      this.sirenLfo = this.ctx.createOscillator();
      this.sirenLfo.frequency.value = 0.5; // slow wail
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 350; // modulates between 400 and 1100 Hz

      this.sirenLfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc.frequency);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.sfxGain);

      this.sirenLfo.start();
      this.sirenOsc.start();
    } else if (!active && this.isSirenPlaying) {
      this.isSirenPlaying = false;
      if (this.sirenOsc) {
        try { this.sirenOsc.stop(); } catch {}
        this.sirenOsc.disconnect();
        this.sirenOsc = null;
      }
      if (this.sirenLfo) {
        try { this.sirenLfo.stop(); } catch {}
        this.sirenLfo.disconnect();
        this.sirenLfo = null;
      }
    }
  }

  // --- Tire Skid / Drift Sound ---
  public playTireSkid() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(3, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  // --- Collision Impact Sound ---
  public playCrash(intensity: number = 1.0) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const cl = Math.min(Math.max(intensity, 0.2), 2.0);

    // Low boom oscillator
    const boomOsc = this.ctx.createOscillator();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(140 * cl, now);
    boomOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    const boomGain = this.ctx.createGain();
    boomGain.gain.setValueAtTime(0.4 * cl, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    boomOsc.connect(boomGain);
    boomGain.connect(this.sfxGain);

    boomOsc.start(now);
    boomOsc.stop(now + 0.36);

    // Metal crunch noise
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3 * cl, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(now);
  }

  // --- Punch / Hit Sound ---
  public playPunch() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  // --- Cash Earned / Coin Chime ---
  public playCashSound() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.26);
    });
  }

  // --- Door Enter/Exit Car Sound ---
  public playCarDoor() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.19);
  }

  // --- Procedural Synth Radio ---
  public cycleRadioStation(): string {
    this.currentRadioStation = (this.currentRadioStation + 1) % this.stationNames.length;
    this.setRadioStation(this.currentRadioStation);
    return this.stationNames[this.currentRadioStation];
  }

  public getStationName(): string {
    return this.stationNames[this.currentRadioStation];
  }

  public setRadioStation(index: number) {
    this.currentRadioStation = index;

    if (this.radioInterval) {
      window.clearInterval(this.radioInterval);
      this.radioInterval = null;
    }

    if (!this.ctx || !this.musicGain || this.currentRadioStation === 0) {
      return;
    }

    let step = 0;
    // Different BPM and melodic scales per station
    let bpm = 124;
    let scale: number[] = [];

    if (this.currentRadioStation === 1) {
      // K-Wave Synthpop (A major pentatonic/catchy upbeat)
      bpm = 126;
      scale = [220, 246.94, 277.18, 329.63, 369.99, 440, 493.88, 554.37];
    } else if (this.currentRadioStation === 2) {
      // Gwangmyeong Lo-Fi Chill (D minor 7th mellow)
      bpm = 85;
      scale = [146.83, 174.61, 220.0, 261.63, 293.66, 349.23, 440.0];
    } else if (this.currentRadioStation === 3) {
      // Eurobeat Turbo Racing (Fast energetic bassline)
      bpm = 150;
      scale = [164.81, 196.0, 220.0, 246.94, 329.63, 392.0];
    }

    const intervalMs = (60 / bpm / 2) * 1000; // Eighth notes

    this.radioInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;

      // Bassline note
      const bassNote = scale[step % scale.length] * 0.5;
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();

      bassOsc.type = this.currentRadioStation === 3 ? 'sawtooth' : 'triangle';
      bassOsc.frequency.setValueAtTime(bassNote, now);

      bassGain.gain.setValueAtTime(0.12, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + (intervalMs / 1000) * 0.85);

      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);

      bassOsc.start(now);
      bassOsc.stop(now + (intervalMs / 1000) * 0.9);

      // Lead melody on alternate beats
      if (step % 2 === 0 && Math.random() > 0.25) {
        const leadNote = scale[Math.floor(Math.random() * scale.length)] * 1.5;
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();

        leadOsc.type = 'sine';
        leadOsc.frequency.setValueAtTime(leadNote, now);

        leadGain.gain.setValueAtTime(0.08, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + (intervalMs / 1000) * 1.5);

        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);

        leadOsc.start(now);
        leadOsc.stop(now + (intervalMs / 1000) * 1.6);
      }

      // Kick drum on quarters
      if (step % 2 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(120, now);
        kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.1);
        kickGain.gain.setValueAtTime(0.25, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.13);
      }

      step++;
    }, intervalMs);
  }
}

export const soundManager = new SoundSystem();
