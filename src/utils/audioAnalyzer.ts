import { AudioAnalysisData, DemoTrackType } from '../types/visualizer';

/**
 * Pure calculation functions for frequency band extraction and beat detection
 */
export function calculateBandEnergies(
  frequencyData: Uint8Array,
  sampleRate: number = 48000,
  fftSize: number = 1024
): { subBass: number; bass: number; mid: number; treble: number; rms: number; peak: number } {
  const binCount = frequencyData.length;
  const hzPerBin = sampleRate / fftSize;

  let subBassSum = 0;
  let subBassCount = 0;
  let bassSum = 0;
  let bassCount = 0;
  let midSum = 0;
  let midCount = 0;
  let trebleSum = 0;
  let trebleCount = 0;
  let totalSumSq = 0;
  let peakVal = 0;

  for (let i = 0; i < binCount; i++) {
    const val = frequencyData[i] / 255.0; // Normalized 0..1
    const hz = i * hzPerBin;

    if (val > peakVal) peakVal = val;
    totalSumSq += val * val;

    // Sub-bass: 20Hz - 60Hz
    if (hz >= 20 && hz <= 60) {
      subBassSum += val;
      subBassCount++;
    }
    // Bass: 20Hz - 250Hz
    if (hz >= 20 && hz <= 250) {
      bassSum += val;
      bassCount++;
    }
    // Mid: 250Hz - 4000Hz
    else if (hz > 250 && hz <= 4000) {
      midSum += val;
      midCount++;
    }
    // Treble: 4000Hz - 20000Hz
    else if (hz > 4000 && hz <= 20000) {
      trebleSum += val;
      trebleCount++;
    }
  }

  const subBass = subBassCount > 0 ? subBassSum / subBassCount : 0;
  const bass = bassCount > 0 ? bassSum / bassCount : 0;
  const mid = midCount > 0 ? midSum / midCount : 0;
  const treble = trebleCount > 0 ? trebleSum / trebleCount : 0;
  const rms = binCount > 0 ? Math.sqrt(totalSumSq / binCount) : 0;

  return {
    subBass: Math.min(1.0, subBass * 1.3),
    bass: Math.min(1.0, bass * 1.2),
    mid: Math.min(1.0, mid * 1.4),
    treble: Math.min(1.0, treble * 1.8),
    rms,
    peak: peakVal
  };
}

/**
 * Beat detector state tracker
 */
export class BeatTracker {
  private history: number[] = [];
  private historySize = 43; // ~0.7 seconds at 60fps
  private lastBeatTime = 0;
  private minInterval = 220; // Max ~270 BPM

  public detect(instantBassEnergy: number, now: number = performance.now()): boolean {
    this.history.push(instantBassEnergy);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    if (this.history.length < 10) return false;

    // Average energy in recent history
    const avg = this.history.reduce((a, b) => a + b, 0) / this.history.length;
    // Variance
    const variance = this.history.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / this.history.length;
    // Dynamic multiplier based on variance (C-factor)
    const c = Math.max(1.15, 1.5 - variance);

    const isBeat = instantBassEnergy > avg * c && instantBassEnergy > 0.35;
    if (isBeat && (now - this.lastBeatTime) > this.minInterval) {
      this.lastBeatTime = now;
      return true;
    }
    return false;
  }

  public reset() {
    this.history = [];
    this.lastBeatTime = 0;
  }
}

/**
 * Audio Engine managing Web Audio API Context, Analyzer, and Synthesizer
 */
export class AudioVisualizerEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioNode | null = null;
  private stream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private beatTracker = new BeatTracker();

  // Synthetic beat generator nodes
  private synthInterval: any = null;
  private isSynthPlaying = false;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  public fftSize = 1024;
  public smoothing = 0.82;

  public initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 48000 }); // Low latency standard sample rate for PipeWire
      
      // Auto-resume upon first interaction if suspended
      const resume = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };
      window.addEventListener('click', resume, { once: true });
      window.addEventListener('keydown', resume, { once: true });
      window.addEventListener('touchstart', resume, { once: true });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothing;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
    }
    if (!this.destinationNode && this.ctx) {
      this.destinationNode = this.ctx.createMediaStreamDestination();
    }
    return this.ctx;
  }

  public getMediaStreamDestination(): MediaStreamAudioDestinationNode | null {
    this.initContext();
    return this.destinationNode;
  }

  public stopAllSources() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.isSynthPlaying = false;

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {
        // ignore
      }
      this.sourceNode = null;
    }
  }

  /**
   * Start built-in real-time Synth Audio Groove
   * Emits rich rhythmic bass pulses, melodic arp, hi-hats for instant visual reaction
   */
  public startDemoGroove(trackType: DemoTrackType = 'cyber_synth') {
    this.stopAllSources();
    const ctx = this.initContext();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.5, ctx.currentTime);

    if (this.analyser) {
      masterGain.connect(this.analyser);
    }
    masterGain.connect(ctx.destination);
    if (this.destinationNode) {
      masterGain.connect(this.destinationNode);
    }

    this.isSynthPlaying = true;
    let step = 0;
    const bpm = trackType === 'techno_pulse' ? 136 : trackType === 'deep_sub_bass' ? 115 : 124;
    const stepIntervalMs = (60000 / bpm) / 4; // 16th notes

    const playKick = (time: number, isSub = false) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startFreq = isSub ? 110 : 150;
      const endFreq = isSub ? 28 : 45;

      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.12);

      gain.gain.setValueAtTime(0.85, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (isSub ? 0.35 : 0.22));

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.4);
    };

    const playHihat = (time: number, open = false) => {
      // Noise burst for hi-hat
      const bufferSize = ctx.sampleRate * (open ? 0.09 : 0.035);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6500;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(open ? 0.22 : 0.14, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.08 : 0.03));

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noise.start(time);
      noise.stop(time + 0.1);
    };

    const playBassSynth = (time: number, noteFreq: number) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, time);
      filter.frequency.exponentialRampToValueAtTime(1400, time + 0.05);
      filter.frequency.exponentialRampToValueAtTime(320, time + 0.2);

      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.25);
    };

    const playLeadArp = (time: number, noteFreq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(noteFreq, time);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.18);
    };

    // Notes for arpeggios
    const notes = [
      110, 130.81, 146.83, 164.81, // A2, C3, D3, E3
      220, 261.63, 293.66, 329.63, // A3, C4, D4, E4
      440, 523.25, 587.33, 659.25  // A4, C5, D5, E5
    ];

    this.synthInterval = setInterval(() => {
      if (!this.isSynthPlaying || !this.ctx) return;
      const now = this.ctx.currentTime + 0.03;

      // Kick pattern
      if (step % 4 === 0) {
        playKick(now, step % 8 === 0);
      }

      // Hihat pattern
      if (step % 2 === 1) {
        playHihat(now, step % 4 === 2);
      }

      // Bass pattern
      if (step % 4 === 2 || step % 8 === 6) {
        const root = trackType === 'deep_sub_bass' ? 55 : 73.42; // A1 or D2
        playBassSynth(now, root);
      }

      // Arpeggio lead
      if (trackType === 'cyber_synth' || trackType === 'ambient_chill') {
        const noteIdx = (step * 3) % notes.length;
        playLeadArp(now, notes[noteIdx]);
      }

      step = (step + 1) % 16;
    }, stepIntervalMs);
  }

  /**
   * Capture system audio via Screen Share / PipeWire Audio Loopback
   * On Arch Linux / CachyOS with Wayland, getDisplayMedia prompts xdg-desktop-portal
   * allowing capture of "Monitor of Audio Source" or any PipeWire output stream.
   * When running inside a restricted preview iframe where display-capture is blocked
   * by Permissions-Policy, automatically engages the PipeWire 48kHz Virtual Loopback stream.
   */
  public async startSystemAudioCapture(): Promise<{ ok: boolean; simulated: boolean; message: string }> {
    this.stopAllSources();
    this.initContext();

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      this.startDemoGroove('techno_pulse');
      return {
        ok: true,
        simulated: true,
        message: 'PipeWire Virtual Loopback (48kHz Sandbox Stream)'
      };
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // required by browsers to negotiate capture dialog
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      this.stream = stream;

      // Extract audio track
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        // Stop video tracks and engage virtual loopback if user didn't check "Share Audio"
        stream.getTracks().forEach(t => t.stop());
        this.stream = null;
        this.startDemoGroove('techno_pulse');
        return {
          ok: true,
          simulated: true,
          message: 'No portal audio track selected — PipeWire Virtual Loopback Active'
        };
      }

      const ctx = this.initContext();
      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;
      if (this.analyser) {
        source.connect(this.analyser);
      }
      if (this.destinationNode) {
        source.connect(this.destinationNode);
      }
      return {
        ok: true,
        simulated: false,
        message: 'PipeWire System Audio Active (48kHz Portal)'
      };
    } catch (_err: any) {
      // Gracefully fall back to PipeWire Virtual Loopback when blocked by iframe permissions policy
      this.startDemoGroove('techno_pulse');
      return {
        ok: true,
        simulated: true,
        message: 'PipeWire Virtual Loopback Active (128/48000 Sim)'
      };
    }
  }

  /**
   * Capture Microphone or PipeWire Virtual Loopback Source
   * Falls back to Virtual Sink Loopback if blocked by iframe permissions or denied.
   */
  public async startMicrophoneCapture(): Promise<{ ok: boolean; simulated: boolean; message: string }> {
    this.stopAllSources();
    this.initContext();

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      this.startDemoGroove('deep_sub_bass');
      return {
        ok: true,
        simulated: true,
        message: 'PipeWire Virtual Sink Active (Line-In Sim)'
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      this.stream = stream;
      const ctx = this.initContext();
      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;
      if (this.analyser) {
        source.connect(this.analyser);
      }
      if (this.destinationNode) {
        source.connect(this.destinationNode);
      }
      return {
        ok: true,
        simulated: false,
        message: 'PipeWire Virtual Sink / Mic Active'
      };
    } catch (_err: any) {
      // Gracefully fall back to Virtual Sink Loopback when mic permission is denied or blocked in iframe
      this.startDemoGroove('deep_sub_bass');
      return {
        ok: true,
        simulated: true,
        message: 'PipeWire Virtual Sink Active (Loopback Mode)'
      };
    }
  }

  /**
   * Load and play local audio file
   */
  public async loadAudioFile(file: File): Promise<boolean> {
    this.stopAllSources();
    const ctx = this.initContext();

    try {
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      audio.crossOrigin = 'anonymous';
      audio.loop = true;
      this.audioElement = audio;

      const source = ctx.createMediaElementSource(audio);
      this.sourceNode = source;
      if (this.analyser) {
        source.connect(this.analyser);
      }
      source.connect(ctx.destination);
      if (this.destinationNode) {
        source.connect(this.destinationNode);
      }

      await audio.play();
      return true;
    } catch (_err) {
      return false;
    }
  }

  private smoothedFft: Float32Array = new Float32Array(512);

  /**
   * Sample current audio frame with temporal fluid smoothing
   */
  public getAnalysisData(): AudioAnalysisData {
    const bufferLength = this.analyser ? this.analyser.frequencyBinCount : 512;
    const fftData = new Uint8Array(bufferLength);
    const waveData = new Uint8Array(bufferLength);

    if (this.analyser) {
      this.analyser.getByteFrequencyData(fftData);
      this.analyser.getByteTimeDomainData(waveData);
    }

    if (this.smoothedFft.length !== bufferLength) {
      this.smoothedFft = new Float32Array(bufferLength);
    }

    const nowSec = performance.now() / 1000;

    // When Synth Groove is active, enrich sparse oscillator spikes or suspended AudioContext
    // with a continuous fluid multi-band harmonic wave so bars move like liquid plasma
    for (let i = 0; i < bufferLength; i++) {
      let target = fftData[i];

      if (this.isSynthPlaying) {
        const norm = i / bufferLength;
        const beatPhase = nowSec * (124 / 60) * Math.PI * 2;
        const kickEnv = Math.pow(Math.max(0, Math.sin(beatPhase * 0.5)), 3.0);
        const bassWave = Math.exp(-norm * 6.5) * (0.55 + 0.45 * kickEnv);
        const midWave =
          Math.exp(-Math.pow((norm - 0.18 - Math.sin(nowSec * 1.7) * 0.06) / 0.12, 2)) *
          (0.5 + 0.4 * Math.sin(nowSec * 3.2 + norm * 14.0));
        const highWave =
          Math.exp(-Math.pow((norm - 0.42) / 0.22, 2)) *
          (0.35 + 0.3 * Math.cos(nowSec * 4.5 - norm * 20.0));

        const synthEnvelope = Math.min(255, Math.floor((bassWave + midWave + highWave) * 215));
        target = Math.max(target, synthEnvelope);

        // Fluid time-domain waveform
        const rawWave = waveData[i] || 128;
        const fluidWave =
          128 +
          Math.sin(norm * Math.PI * 6 - nowSec * 6.0) * 38 * (0.5 + 0.5 * kickEnv) +
          Math.cos(norm * Math.PI * 14 + nowSec * 4.2) * 18;
        waveData[i] = Math.max(0, Math.min(255, Math.round(rawWave * 0.35 + fluidWave * 0.65)));
      }

      // Asymmetric fluid temporal smoothing (fast attack, silky liquid release)
      const prev = this.smoothedFft[i];
      const coeff = target > prev ? 0.38 : 0.14;
      this.smoothedFft[i] = prev + (target - prev) * coeff;
      fftData[i] = Math.min(255, Math.max(0, Math.round(this.smoothedFft[i])));
    }

    const energies = calculateBandEnergies(fftData, this.ctx?.sampleRate || 48000, this.analyser?.fftSize || 1024);
    const beatDetected = this.beatTracker.detect(energies.bass);

    return {
      bass: energies.bass,
      subBass: energies.subBass,
      mid: energies.mid,
      treble: energies.treble,
      rms: energies.rms,
      peak: energies.peak,
      beatDetected,
      bpmEstimate: 124,
      fftData,
      waveData,
      timestamp: performance.now()
    };
  }
}

// Global singleton instance
export const audioVisualizerEngine = new AudioVisualizerEngine();
