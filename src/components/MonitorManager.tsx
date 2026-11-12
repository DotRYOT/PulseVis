import React from 'react';
import { MonitorConfig, VisualizerPreset, AudioAnalysisData } from '../types/visualizer';
import { VisualizerCanvas } from './VisualizerCanvas';
import { Monitor, Sliders, ExternalLink, Eye, RotateCw, ZoomIn, Palette, CheckSquare, Square } from 'lucide-react';

interface MonitorManagerProps {
  monitors: MonitorConfig[];
  setMonitors: React.Dispatch<React.SetStateAction<MonitorConfig[]>>;
  presets: VisualizerPreset[];
  audioData: AudioAnalysisData;
  activeLayoutMode: 'triple_panorama' | 'split_grid' | 'focused';
  setActiveLayoutMode: (mode: 'triple_panorama' | 'split_grid' | 'focused') => void;
  focusedMonitorId: number;
  setFocusedMonitorId: (id: number) => void;
  showBezel: boolean;
  setShowBezel: (show: boolean) => void;
  onPopoutMonitor: (id: number) => void;
}

export const MonitorManager: React.FC<MonitorManagerProps> = ({
  monitors,
  setMonitors,
  presets,
  audioData,
  activeLayoutMode,
  setActiveLayoutMode,
  focusedMonitorId,
  setFocusedMonitorId,
  showBezel,
  setShowBezel,
  onPopoutMonitor
}) => {
  const getPresetForMonitor = (presetId: string): VisualizerPreset => {
    return presets.find(p => p.id === presetId) || presets[0];
  };

  const updateMonitor = (id: number, updates: Partial<MonitorConfig>) => {
    setMonitors(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));
  };

  const activeMonitorCount = monitors.filter(m => m.enabled).length;

  return (
    <div className="space-y-4">
      {/* Top Bar: Layout Mode Selector & Bezel Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm text-slate-200">Monitor Array</span>
          <span className="text-xs font-mono text-cyan-400/80 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
            3 Displays Configured
          </span>
        </div>

        {/* Layout Mode Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveLayoutMode('triple_panorama')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeLayoutMode === 'triple_panorama'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Triple Panorama
          </button>
          <button
            type="button"
            onClick={() => setActiveLayoutMode('split_grid')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeLayoutMode === 'split_grid'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Individual Screens
          </button>
          <button
            type="button"
            onClick={() => setActiveLayoutMode('focused')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeLayoutMode === 'focused'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Single Monitor Focus
          </button>
        </div>

        {/* Bezel & Action controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBezel(!showBezel)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition ${
              showBezel
                ? 'bg-slate-800 border-slate-600 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle realistic physical monitor bezels"
          >
            {showBezel ? <CheckSquare className="w-3.5 h-3.5 text-cyan-400" /> : <Square className="w-3.5 h-3.5" />}
            <span>Monitor Bezels</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Presentation Area */}
      {activeLayoutMode === 'triple_panorama' && (
        <div className="relative">
          {/* Triple Monitor Panorama Frame */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-2.5 p-2.5 rounded-2xl bg-slate-950/90 border ${
              showBezel ? 'border-slate-700 shadow-2xl p-4 bg-slate-900/60' : 'border-slate-800'
            }`}
          >
            {monitors.map((mon) => {
              const preset = getPresetForMonitor(mon.assignedPresetId);
              return (
                <div
                  key={mon.id}
                  className={`flex flex-col ${showBezel ? 'bg-slate-950 p-2 rounded-xl border-4 border-slate-800 shadow-inner' : ''}`}
                >
                  <div className="flex items-center justify-between px-1 pb-1.5 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5 font-bold text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {mon.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {mon.resolution.width}x{mon.resolution.height}
                    </span>
                  </div>

                  <div className="h-64 sm:h-72 md:h-80 w-full">
                    {mon.enabled ? (
                      <VisualizerCanvas
                        preset={preset}
                        monitor={mon}
                        audioData={audioData}
                        totalScreens={3}
                        className="w-full h-full"
                        onPopoutRequest={() => onPopoutMonitor(mon.id)}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-950 rounded-lg border border-slate-900 flex flex-col items-center justify-center text-slate-600 text-xs">
                        <Monitor className="w-8 h-8 mb-1 text-slate-700" />
                        <span>Display Disabled</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
            <span>✨ Audio reactivity spans seamlessly across all 3 monitors with synchronized GLSL coordinates</span>
          </div>
        </div>
      )}

      {activeLayoutMode === 'split_grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {monitors.map((mon) => {
            const preset = getPresetForMonitor(mon.assignedPresetId);
            return (
              <div key={mon.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="font-semibold text-xs text-slate-200">{mon.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPopoutMonitor(mon.id)}
                    className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50 transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Popout</span>
                  </button>
                </div>

                <div className="h-60 w-full">
                  <VisualizerCanvas
                    preset={preset}
                    monitor={mon}
                    audioData={audioData}
                    totalScreens={1}
                    className="w-full h-full"
                    onPopoutRequest={() => onPopoutMonitor(mon.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeLayoutMode === 'focused' && (
        <div className="space-y-3">
          {/* Sub tabs for selecting focused monitor */}
          <div className="flex items-center gap-2">
            {monitors.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFocusedMonitorId(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
                  focusedMonitorId === m.id
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-200 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          {(() => {
            const targetMon = monitors.find(m => m.id === focusedMonitorId) || monitors[0];
            const preset = getPresetForMonitor(targetMon.assignedPresetId);
            return (
              <div className="h-[460px] w-full">
                <VisualizerCanvas
                  preset={preset}
                  monitor={targetMon}
                  audioData={audioData}
                  totalScreens={1}
                  className="w-full h-full"
                  onPopoutRequest={() => onPopoutMonitor(targetMon.id)}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Per-Monitor Inspector & Customization Deck */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Monitor Hardware & Shader Mapping Deck</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {monitors.map((mon) => (
            <div
              key={mon.id}
              className={`p-3 rounded-lg border text-xs space-y-2.5 transition ${
                mon.enabled ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              {/* Header with Enable Switch & Popout */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`mon-enable-${mon.id}`}
                    checked={mon.enabled}
                    onChange={(e) => updateMonitor(mon.id, { enabled: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor={`mon-enable-${mon.id}`} className="font-semibold text-slate-200 cursor-pointer">
                    {mon.name}
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => onPopoutMonitor(mon.id)}
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  title="Open borderless window for this monitor"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Popout</span>
                </button>
              </div>

              {/* Assigned Shader Preset */}
              <div>
                <label htmlFor={`mon-preset-${mon.id}`} className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                  Active Shader:
                </label>
                <select
                  id={`mon-preset-${mon.id}`}
                  value={mon.assignedPresetId}
                  onChange={(e) => updateMonitor(mon.id, { assignedPresetId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Shift & Zoom Controls */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                    <label htmlFor={`mon-hue-${mon.id}`}>Hue Shift</label>
                    <span>{mon.colorShift}°</span>
                  </div>
                  <input
                    id={`mon-hue-${mon.id}`}
                    type="range"
                    min="0"
                    max="360"
                    value={mon.colorShift}
                    onChange={(e) => updateMonitor(mon.id, { colorShift: parseInt(e.target.value, 10) })}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                    <label htmlFor={`mon-zoom-${mon.id}`}>Zoom</label>
                    <span>{mon.zoom.toFixed(1)}x</span>
                  </div>
                  <input
                    id={`mon-zoom-${mon.id}`}
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={mon.zoom}
                    onChange={(e) => updateMonitor(mon.id, { zoom: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>

              {/* Sensitivity & Flip */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <label htmlFor={`mon-sens-${mon.id}`} className="text-[10px] text-slate-400 font-mono">Sens:</label>
                  <input
                    id={`mon-sens-${mon.id}`}
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={mon.volumeSensitivity}
                    onChange={(e) => updateMonitor(mon.id, { volumeSensitivity: parseFloat(e.target.value) })}
                    className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => updateMonitor(mon.id, { mirror: !mon.mirror })}
                  className={`text-[10px] px-2 py-0.5 rounded border transition ${
                    mon.mirror ? 'bg-cyan-950 border-cyan-700 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Mirror
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
