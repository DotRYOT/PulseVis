import React, { useState, useEffect, useRef } from 'react';
import {
  MonitorConfig,
  VisualizerPreset,
  AudioAnalysisData,
  AudioInputMode,
  DemoTrackType
} from './types/visualizer';
import { loadAllPresets, FACTORY_PRESETS, saveCustomPreset } from './utils/presets';
import { audioVisualizerEngine } from './utils/audioAnalyzer';
import { multiMonitorSync } from './utils/multiMonitorSync';
import { AudioSourceController } from './components/AudioSourceController';
import { MonitorManager } from './components/MonitorManager';
import { ShaderEditor } from './components/ShaderEditor';
import { PresetDrawer } from './components/PresetDrawer';
import { ExportModal } from './components/ExportModal';
import { LinuxIntegrationModal } from './components/LinuxIntegrationModal';
import { MonitorPopoutView } from './components/MonitorPopoutView';
import {
  Monitor,
  Code2,
  Layers,
  Film,
  Terminal,
  Activity,
  Maximize2,
  ExternalLink,
  Sliders,
  Cpu
} from 'lucide-react';

export default function App() {
  // Check if opened as dedicated secondary monitor popout window
  const urlParams = new URLSearchParams(window.location.search);
  const popoutParam = urlParams.get('popout');
  const autostartParam = urlParams.get('autostart');

  if (popoutParam) {
    const monId = parseInt(popoutParam, 10) || 2;
    return <MonitorPopoutView monitorId={monId} />;
  }

  // Presets State
  const [presets, setPresets] = useState<VisualizerPreset[]>(() => loadAllPresets());
  const [activePresetId, setActivePresetId] = useState<string>(FACTORY_PRESETS[0].id);

  // Monitors State (3 Displays)
  const [monitors, setMonitors] = useState<MonitorConfig[]>([
    {
      id: 1,
      name: 'Monitor 1 (Left Display)',
      enabled: true,
      resolution: { width: 1920, height: 1080 },
      orientation: 'horizontal',
      assignedPresetId: FACTORY_PRESETS[0].id,
      volumeSensitivity: 1.0,
      colorShift: 0,
      zoom: 1.0,
      mirror: false,
      screenIndexUniform: 0
    },
    {
      id: 2,
      name: 'Monitor 2 (Center Main)',
      enabled: true,
      resolution: { width: 2560, height: 1440 },
      orientation: 'horizontal',
      assignedPresetId: FACTORY_PRESETS[0].id,
      volumeSensitivity: 1.2,
      colorShift: 0,
      zoom: 1.0,
      mirror: false,
      screenIndexUniform: 1
    },
    {
      id: 3,
      name: 'Monitor 3 (Right Display)',
      enabled: true,
      resolution: { width: 1920, height: 1080 },
      orientation: 'horizontal',
      assignedPresetId: FACTORY_PRESETS[0].id,
      volumeSensitivity: 1.0,
      colorShift: 0,
      zoom: 1.0,
      mirror: false,
      screenIndexUniform: 2
    }
  ]);

  // Audio State
  const [inputMode, setInputMode] = useState<AudioInputMode>('demo_synth');
  const [demoTrack, setDemoTrack] = useState<DemoTrackType>('cyber_synth');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<number>(1.1);

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

  // UI Navigation Tabs
  const [activeTab, setActiveTab] = useState<'canvas' | 'editor' | 'presets'>('canvas');
  const [activeLayoutMode, setActiveLayoutMode] = useState<'triple_panorama' | 'split_grid' | 'focused'>('triple_panorama');
  const [focusedMonitorId, setFocusedMonitorId] = useState<number>(2);
  const [showBezel, setShowBezel] = useState<boolean>(true);

  // Modals
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showLinuxModal, setShowLinuxModal] = useState<boolean>(false);

  // Autostart groove if query parameter present or on first load so user gets immediate visual reaction
  useEffect(() => {
    // Start synthetic groove
    audioVisualizerEngine.startDemoGroove(demoTrack);
    setIsPlaying(true);

    return () => {
      audioVisualizerEngine.stopAllSources();
    };
  }, []);

  // Main real-time audio sampling loop
  useEffect(() => {
    let animId: number;
    let lastBroadcast = 0;

    const tick = () => {
      const data = audioVisualizerEngine.getAnalysisData();
      setAudioData(data);

      // Broadcast audio frame to secondary monitors via BroadcastChannel at ~60fps
      const now = performance.now();
      if (now - lastBroadcast > 15) {
        multiMonitorSync.broadcastAudioFrame(data);
        lastBroadcast = now;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const activePreset = presets.find(p => p.id === activePresetId) || presets[0];

  const handleSelectPreset = (preset: VisualizerPreset, targetMonitorId?: number) => {
    if (targetMonitorId) {
      setMonitors(prev => prev.map(m => m.id === targetMonitorId ? { ...m, assignedPresetId: preset.id } : m));
      multiMonitorSync.broadcastPresetChange(preset, targetMonitorId);
    } else {
      setActivePresetId(preset.id);
      setMonitors(prev => prev.map(m => ({ ...m, assignedPresetId: preset.id })));
      multiMonitorSync.broadcastPresetChange(preset);
    }
  };

  const handleUpdateActivePreset = (updated: VisualizerPreset) => {
    setPresets(prev => prev.map(p => p.id === updated.id ? updated : p));
    multiMonitorSync.broadcastPresetChange(updated);
  };

  const handleSaveAsNewPreset = (newPreset: VisualizerPreset) => {
    const updatedList = saveCustomPreset(newPreset);
    setPresets(updatedList);
    setActivePresetId(newPreset.id);
    setMonitors(prev => prev.map(m => ({ ...m, assignedPresetId: newPreset.id })));
    multiMonitorSync.broadcastPresetChange(newPreset);
  };

  const handlePopoutMonitor = (monitorId: number) => {
    setActiveTab('canvas');
    setActiveLayoutMode('focused');
    setFocusedMonitorId(monitorId);
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col selection:bg-cyan-900 selection:text-cyan-200">
      {/* Top Application Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Activity className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-sm tracking-wide text-white">CACHYPULSE</h1>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                    CachyOS / Wayland
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">GPU Triple-Monitor PipeWire Audio Visualizer</p>
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'canvas'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Triple Displays</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'editor'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>GLSL Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'presets'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Preset Library</span>
            </button>
          </nav>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {/* Popout Screens Quick Launcher */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-[11px] text-slate-400">Popout:</span>
              <button
                type="button"
                onClick={() => handlePopoutMonitor(2)}
                className="hover:text-cyan-300 text-slate-300 px-1 py-0.5 rounded hover:bg-slate-800 flex items-center gap-0.5"
                title="Launch Monitor 2 Popout Window"
              >
                M2 <ExternalLink className="w-2.5 h-2.5" />
              </button>
              <span className="text-slate-700">|</span>
              <button
                type="button"
                onClick={() => handlePopoutMonitor(3)}
                className="hover:text-cyan-300 text-slate-300 px-1 py-0.5 rounded hover:bg-slate-800 flex items-center gap-0.5"
                title="Launch Monitor 3 Popout Window"
              >
                M3 <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Hardware Export Button */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-cyan-300 hover:text-cyan-200 border border-slate-700/80 text-xs font-medium shadow transition"
              title="Record and Export Hardware-Accelerated Video"
            >
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              <span>Video Export</span>
            </button>

            {/* Linux Setup Hub Button */}
            <button
              type="button"
              onClick={() => setShowLinuxModal(true)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
              title="Arch Linux & CachyOS PipeWire / Wayland Setup Hub"
              aria-label="Arch Linux and CachyOS setup instructions"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full p-4 flex-1 flex flex-col gap-4">
        {/* Audio Input Transport & VU Meter Bar */}
        <AudioSourceController
          audioData={audioData}
          inputMode={inputMode}
          setInputMode={setInputMode}
          demoTrack={demoTrack}
          setDemoTrack={setDemoTrack}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          sensitivity={sensitivity}
          setSensitivity={setSensitivity}
          onOpenLinuxModal={() => setShowLinuxModal(true)}
        />

        {/* View Content */}
        {activeTab === 'canvas' && (
          <MonitorManager
            monitors={monitors}
            setMonitors={setMonitors}
            presets={presets}
            audioData={audioData}
            activeLayoutMode={activeLayoutMode}
            setActiveLayoutMode={setActiveLayoutMode}
            focusedMonitorId={focusedMonitorId}
            setFocusedMonitorId={setFocusedMonitorId}
            showBezel={showBezel}
            setShowBezel={setShowBezel}
            onPopoutMonitor={handlePopoutMonitor}
          />
        )}

        {activeTab === 'editor' && (
          <ShaderEditor
            activePreset={activePreset}
            onUpdatePreset={handleUpdateActivePreset}
            onSaveAsNew={handleSaveAsNewPreset}
          />
        )}

        {activeTab === 'presets' && (
          <PresetDrawer
            presets={presets}
            setPresets={setPresets}
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            monitors={monitors}
          />
        )}
      </main>

      {/* Modals */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      <LinuxIntegrationModal
        isOpen={showLinuxModal}
        onClose={() => setShowLinuxModal(false)}
      />
    </div>
  );
}
