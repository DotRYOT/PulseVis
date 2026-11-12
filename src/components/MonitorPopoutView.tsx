import React, { useEffect, useState } from 'react';
import { VisualizerPreset, MonitorConfig, AudioAnalysisData } from '../types/visualizer';
import { FACTORY_PRESETS, loadAllPresets } from '../utils/presets';
import { multiMonitorSync, MultiMonitorSyncMessage } from '../utils/multiMonitorSync';
import { VisualizerCanvas } from './VisualizerCanvas';
import { Maximize2, Monitor, ArrowLeft } from 'lucide-react';

interface MonitorPopoutViewProps {
  monitorId: number;
}

export const MonitorPopoutView: React.FC<MonitorPopoutViewProps> = ({ monitorId }) => {
  const presets = loadAllPresets();
  const [activePreset, setActivePreset] = useState<VisualizerPreset>(
    presets[(monitorId - 1) % presets.length] || presets[0]
  );

  const [monitorConfig, setMonitorConfig] = useState<MonitorConfig>({
    id: monitorId,
    name: `Monitor ${monitorId} (Popout Display)`,
    enabled: true,
    resolution: { width: 1920, height: 1080 },
    orientation: 'horizontal',
    assignedPresetId: activePreset.id,
    volumeSensitivity: 1.0,
    colorShift: 0,
    zoom: 1.0,
    mirror: false,
    screenIndexUniform: monitorId - 1
  });

  const [audioData, setAudioData] = useState<AudioAnalysisData>({
    bass: 0,
    subBass: 0,
    mid: 0,
    treble: 0,
    rms: 0,
    peak: 0,
    beatDetected: false,
    bpmEstimate: 124,
    fftData: new Uint8Array(512),
    waveData: new Uint8Array(512),
    timestamp: performance.now()
  });

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Listen for broadcast sync from master window
    const unsubscribe = multiMonitorSync.subscribe((msg: MultiMonitorSyncMessage) => {
      setConnected(true);

      if (msg.type === 'AUDIO_FRAME' && msg.audio) {
        // Expand 64 bins back to full length
        const expandedFft = new Uint8Array(512);
        const sourceBins = msg.audio.fftArray || [];
        const step = 512 / Math.max(1, sourceBins.length);

        for (let i = 0; i < 512; i++) {
          const srcIdx = Math.min(sourceBins.length - 1, Math.floor(i / step));
          expandedFft[i] = sourceBins[srcIdx] || 0;
        }

        setAudioData(prev => ({
          ...prev,
          bass: msg.audio!.bass,
          subBass: msg.audio!.subBass,
          mid: msg.audio!.mid,
          treble: msg.audio!.treble,
          rms: msg.audio!.rms,
          beatDetected: msg.audio!.beatDetected,
          fftData: expandedFft,
          timestamp: msg.timestamp
        }));
      }

      if (msg.type === 'PRESET_CHANGE' && msg.preset) {
        if (!msg.monitorId || msg.monitorId === monitorId) {
          setActivePreset(msg.preset);
        }
      }
    });

    return () => unsubscribe();
  }, [monitorId]);

  const requestFullscreen = () => {
    if (!document.fullscreenElement && typeof document.documentElement.requestFullscreen === 'function') {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex flex-col select-none">
      {/* Visualizer Fullscreen Canvas */}
      <div className="flex-1 w-full h-full relative">
        <VisualizerCanvas
          preset={activePreset}
          monitor={monitorConfig}
          audioData={audioData}
          totalScreens={3}
          showOverlayInfo={false}
          className="w-full h-full rounded-none border-none"
        />

        {/* Minimal Float HUD Controls */}
        <div className="absolute top-3 left-3 flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity z-30">
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-200 font-bold">CACHYPULSE — MONITOR {monitorId}</span>
            <span className="text-slate-400">({activePreset.name})</span>
          </div>

          <button
            type="button"
            onClick={requestFullscreen}
            className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 backdrop-blur"
            title="Toggle fullscreen on this monitor"
            aria-label="Toggle fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <a
            href="/"
            className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 backdrop-blur flex items-center gap-1 text-xs"
            title="Return to Master Control Deck"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Master Deck</span>
          </a>
        </div>
      </div>
    </div>
  );
};
