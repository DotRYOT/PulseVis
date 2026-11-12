import React, { useRef, useState } from 'react';
import { AudioAnalysisData, AudioInputMode, DemoTrackType } from '../types/visualizer';
import { audioVisualizerEngine } from '../utils/audioAnalyzer';
import { Play, Pause, Radio, Mic, Music, Upload, Sliders, Volume2, Sparkles, Activity } from 'lucide-react';

interface AudioSourceControllerProps {
  audioData: AudioAnalysisData;
  inputMode: AudioInputMode;
  setInputMode: (mode: AudioInputMode) => void;
  demoTrack: DemoTrackType;
  setDemoTrack: (track: DemoTrackType) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  sensitivity: number;
  setSensitivity: (val: number) => void;
  onOpenLinuxModal: () => void;
}

export const AudioSourceController: React.FC<AudioSourceControllerProps> = ({
  audioData,
  inputMode,
  setInputMode,
  demoTrack,
  setDemoTrack,
  isPlaying,
  setIsPlaying,
  sensitivity,
  setSensitivity,
  onOpenLinuxModal
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [captureStatus, setCaptureStatus] = useState<string>('Ready');

  const handleStartDemo = (track: DemoTrackType = demoTrack) => {
    setInputMode('demo_synth');
    audioVisualizerEngine.startDemoGroove(track);
    setIsPlaying(true);
    setCaptureStatus(`Playing Synthetic Groove (${track})`);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioVisualizerEngine.stopAllSources();
      setIsPlaying(false);
      setCaptureStatus('Paused');
    } else {
      handleStartDemo();
    }
  };

  const handleSystemCapture = async () => {
    setCaptureStatus('Connecting to PipeWire Portal...');
    const res = await audioVisualizerEngine.startSystemAudioCapture();
    if (res.ok) {
      setInputMode('system_pipewire');
      setIsPlaying(true);
      setCaptureStatus(res.message);
    } else {
      setCaptureStatus(res.message);
    }
  };

  const handleMicCapture = async () => {
    setCaptureStatus('Connecting to PipeWire / Mic Input...');
    const res = await audioVisualizerEngine.startMicrophoneCapture();
    if (res.ok) {
      setInputMode('mic_line');
      setIsPlaying(true);
      setCaptureStatus(res.message);
    } else {
      setCaptureStatus(res.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoadedFileName(file.name);
      setCaptureStatus(`Playing: ${file.name}`);
      const ok = await audioVisualizerEngine.loadAudioFile(file);
      if (ok) {
        setInputMode('audio_file');
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Input Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          {/* Demo Synth Button */}
          <button
            type="button"
            onClick={() => handleStartDemo()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              inputMode === 'demo_synth' && isPlaying
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            aria-label="Built-in Groove Synth mode"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Synth Groove</span>
          </button>

          {/* PipeWire System Audio Button */}
          <button
            type="button"
            onClick={handleSystemCapture}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              inputMode === 'system_pipewire' && isPlaying
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            aria-label="Capture system audio via PipeWire"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-300" />
            <span>PipeWire Capture</span>
          </button>

          {/* Mic / Loopback input */}
          <button
            type="button"
            onClick={handleMicCapture}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              inputMode === 'mic_line' && isPlaying
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            aria-label="Microphone or line input"
          >
            <Mic className="w-3.5 h-3.5 text-purple-300" />
            <span>Mic / Line-In</span>
          </button>

          {/* Audio File Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              inputMode === 'audio_file' && isPlaying
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            aria-label="Upload audio file"
          >
            <Upload className="w-3.5 h-3.5 text-amber-300" />
            <span>Audio File</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Center: Track Selector (if Synth mode) or Status Banner */}
        <div className="flex items-center gap-2">
          {inputMode === 'demo_synth' ? (
            <div className="flex items-center gap-2">
              <label htmlFor="synth-track-select" className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Vibe:</label>
              <select
                id="synth-track-select"
                aria-label="Synth Vibe Track Selector"
                value={demoTrack}
                onChange={(e) => {
                  const t = e.target.value as DemoTrackType;
                  setDemoTrack(t);
                  if (isPlaying) {
                    handleStartDemo(t);
                  }
                }}
                className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
              >
                <option value="cyber_synth">Cyber Synthwave (124 BPM)</option>
                <option value="techno_pulse">Peak Techno (136 BPM)</option>
                <option value="deep_sub_bass">808 Sub-Bass Trap (115 BPM)</option>
                <option value="ambient_chill">Ambient Chillwave (110 BPM)</option>
              </select>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition"
                aria-label={isPlaying ? 'Pause synth generator' : 'Play synth generator'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/70 border border-slate-800/80 rounded text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300">{captureStatus}</span>
            </div>
          )}

          {/* CachyOS / Arch Linux Help Pill */}
          <button
            type="button"
            onClick={onOpenLinuxModal}
            className="text-[11px] font-mono px-2 py-1 rounded bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 hover:bg-cyan-900/50 hover:text-cyan-200 transition"
          >
            Arch/CachyOS PipeWire Guide
          </button>
        </div>

        {/* Right: Audio Sensitivity and Real-Time VU Spectrum Meters */}
        <div className="flex items-center gap-4">
          {/* Sensitivity Slider */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="gain-slider" className="text-[11px] text-slate-400 font-mono">Gain</label>
            <input
              id="gain-slider"
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              aria-label="Audio sensitivity gain"
            />
            <span className="text-[11px] font-mono text-cyan-400 w-7">{sensitivity.toFixed(1)}x</span>
          </div>

          {/* Reactive VU Spectrum Meters */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 px-2.5 py-1 rounded border border-slate-800 text-[10px] font-mono">
            {/* Beat light */}
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                audioData.beatDetected ? 'bg-rose-500 shadow-md shadow-rose-500/80 scale-110' : 'bg-slate-800'
              }`}
              title="Beat detection pulse"
            />

            {/* Sub/Bass meter */}
            <div className="flex flex-col items-center">
              <div className="w-2 h-7 bg-slate-800 rounded-sm overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full bg-cyan-400 transition-all duration-75"
                  style={{ height: `${Math.min(100, audioData.bass * 100 * sensitivity)}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-400 mt-0.5">BASS</span>
            </div>

            {/* Mid meter */}
            <div className="flex flex-col items-center">
              <div className="w-2 h-7 bg-slate-800 rounded-sm overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full bg-emerald-400 transition-all duration-75"
                  style={{ height: `${Math.min(100, audioData.mid * 100 * sensitivity)}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-400 mt-0.5">MID</span>
            </div>

            {/* Treble meter */}
            <div className="flex flex-col items-center">
              <div className="w-2 h-7 bg-slate-800 rounded-sm overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full bg-fuchsia-400 transition-all duration-75"
                  style={{ height: `${Math.min(100, audioData.treble * 100 * sensitivity)}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-400 mt-0.5">HIGH</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
