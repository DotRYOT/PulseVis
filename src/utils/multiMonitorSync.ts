import { AudioAnalysisData, VisualizerPreset, MonitorConfig } from '../types/visualizer';

export interface MultiMonitorSyncMessage {
  type: 'AUDIO_FRAME' | 'CONFIG_UPDATE' | 'PRESET_CHANGE' | 'PING' | 'PONG';
  monitorId?: number;
  audio?: {
    bass: number;
    subBass: number;
    mid: number;
    treble: number;
    rms: number;
    beatDetected: boolean;
    fftArray: number[]; // Compressed representative bins
  };
  preset?: VisualizerPreset;
  monitorConfig?: MonitorConfig;
  timestamp: number;
}

export class MultiMonitorSyncChannel {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<(msg: MultiMonitorSyncMessage) => void> = [];

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('cachypulse_multiscreen');
      this.channel.onmessage = (event) => {
        this.listeners.forEach(fn => fn(event.data));
      };
    }
  }

  public subscribe(fn: (msg: MultiMonitorSyncMessage) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  public broadcast(msg: MultiMonitorSyncMessage) {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
  }

  public broadcastAudioFrame(audio: AudioAnalysisData) {
    if (!this.channel) return;
    // Subsample 64 bins for broadcast efficiency
    const sampledBins: number[] = [];
    const step = Math.max(1, Math.floor(audio.fftData.length / 64));
    for (let i = 0; i < audio.fftData.length && sampledBins.length < 64; i += step) {
      sampledBins.push(audio.fftData[i]);
    }

    this.channel.postMessage({
      type: 'AUDIO_FRAME',
      audio: {
        bass: audio.bass,
        subBass: audio.subBass,
        mid: audio.mid,
        treble: audio.treble,
        rms: audio.rms,
        beatDetected: audio.beatDetected,
        fftArray: sampledBins
      },
      timestamp: performance.now()
    });
  }

  public broadcastPresetChange(preset: VisualizerPreset, monitorId?: number) {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'PRESET_CHANGE',
      preset,
      monitorId,
      timestamp: performance.now()
    });
  }
}

export const multiMonitorSync = new MultiMonitorSyncChannel();
