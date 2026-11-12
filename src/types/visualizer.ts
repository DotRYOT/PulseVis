export interface MonitorConfig {
  id: number; // 1, 2, 3
  name: string;
  enabled: boolean;
  resolution: { width: number; height: number };
  orientation: 'horizontal' | 'vertical';
  assignedPresetId: string;
  volumeSensitivity: number; // 0.5 to 3.0
  colorShift: number; // hue offset
  zoom: number; // 0.5 to 2.0
  mirror: boolean;
  screenIndexUniform: number; // 0, 1, 2 for shader coordinates
}

export interface AudioAnalysisData {
  bass: number; // 0.0 - 1.0 (20-250Hz)
  subBass: number; // 0.0 - 1.0 (20-60Hz)
  mid: number; // 0.0 - 1.0 (250-4000Hz)
  treble: number; // 0.0 - 1.0 (4000-20000Hz)
  rms: number; // Root mean square energy
  peak: number; // Instantaneous peak
  beatDetected: boolean;
  bpmEstimate: number;
  fftData: Uint8Array;
  waveData: Uint8Array;
  timestamp: number;
}

export interface ShaderUniforms {
  speed: number;
  intensity: number;
  bloom: number;
  particleDensity: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  colorScheme: 'cyan-magenta' | 'amber-fire' | 'emerald-matrix' | 'monochrome' | 'aurora-violet';
}

export interface VisualizerPreset {
  id: string;
  name: string;
  description: string;
  category: 'cyberpunk' | 'ambient' | 'retro' | 'liquid' | 'geometric' | 'custom';
  author: string;
  fragmentShader: string;
  uniforms: ShaderUniforms;
  isFactory?: boolean;
}

export interface ExportSettings {
  resolutionPreset: '1080p' | '1440p' | '4k' | 'triple_1080p' | 'triple_1440p';
  width: number;
  height: number;
  fps: 30 | 60 | 120;
  codec: 'vp9' | 'h264' | 'av1';
  bitrateMbps: number;
  durationSeconds: number;
  includeAudio: boolean;
  targetMonitor: 'all_panoramic' | 'monitor_1' | 'monitor_2' | 'monitor_3';
}

export type AudioInputMode = 'demo_synth' | 'system_pipewire' | 'mic_line' | 'audio_file';

export type DemoTrackType = 'cyber_synth' | 'techno_pulse' | 'deep_sub_bass' | 'ambient_chill' | 'frequency_sweep';
