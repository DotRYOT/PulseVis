import React, { useState, useRef } from 'react';
import { VisualizerPreset, MonitorConfig } from '../types/visualizer';
import {
  exportPresetsToJson,
  validateAndImportPresets,
  deleteCustomPreset,
  saveCustomPreset
} from '../utils/presets';
import {
  Layers,
  Search,
  Download,
  Upload,
  Copy,
  Trash2,
  Check,
  Sparkles,
  Radio,
  SlidersHorizontal,
  Monitor
} from 'lucide-react';

interface PresetDrawerProps {
  presets: VisualizerPreset[];
  setPresets: React.Dispatch<React.SetStateAction<VisualizerPreset[]>>;
  activePresetId: string;
  onSelectPreset: (preset: VisualizerPreset, targetMonitorId?: number) => void;
  monitors: MonitorConfig[];
}

export const PresetDrawer: React.FC<PresetDrawerProps> = ({
  presets,
  setPresets,
  activePresetId,
  onSelectPreset,
  monitors
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = ['all', 'cyberpunk', 'ambient', 'retro', 'liquid', 'geometric', 'custom'];

  const filteredPresets = presets.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleExport = () => {
    const json = exportPresetsToJson(presets);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cachypulse_presets_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const updated = validateAndImportPresets(text);
        setPresets(updated);
        setImportError(null);
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse preset file');
      }
    };
    reader.readAsText(file);
  };

  const handleDuplicate = (preset: VisualizerPreset) => {
    const copy: VisualizerPreset = {
      ...preset,
      id: `${preset.id}_copy_${Date.now()}`,
      name: `${preset.name} (Copy)`,
      isFactory: false
    };
    const updated = saveCustomPreset(copy);
    setPresets(updated);
    onSelectPreset(copy);
  };

  const handleDelete = (id: string) => {
    const updated = deleteCustomPreset(id);
    setPresets(updated);
    if (activePresetId === id && updated.length > 0) {
      onSelectPreset(updated[0]);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Top Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-sm text-slate-200">Visualizer Preset Manager</h2>
          <span className="text-xs font-mono text-slate-400">({presets.length} presets available)</span>
        </div>

        {/* Import & Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 transition"
            title="Export all presets to JSON file"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 transition"
            title="Import custom presets JSON file"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>

      {importError && (
        <div className="bg-red-950/80 border border-red-700 p-2.5 rounded text-xs text-red-200">
          Import Error: {importError}
        </div>
      )}

      {/* Search and Category Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono uppercase transition ${
                selectedCategory === cat
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
        {filteredPresets.map((preset) => {
          const isActive = preset.id === activePresetId;

          return (
            <div
              key={preset.id}
              className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition relative group ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500/80 shadow-lg shadow-cyan-950/50'
                  : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <h3 className="font-semibold text-xs text-slate-100">{preset.name}</h3>
                  </div>

                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {preset.category}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {preset.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-xs">
                {/* Apply to All Screens */}
                <button
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium text-[11px] transition ${
                    isActive
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-900 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 border border-slate-800'
                  }`}
                >
                  {isActive && <Check className="w-3 h-3" />}
                  <span>{isActive ? 'Active on All' : 'Apply to All'}</span>
                </button>

                {/* Sub-menu: Route to Specific Monitor */}
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-800">
                    {monitors.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectPreset(preset, m.id)}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-slate-800 transition ${
                          m.assignedPresetId === preset.id ? 'bg-cyan-900 text-cyan-200 font-bold' : 'text-slate-400'
                        }`}
                        title={`Assign exclusively to Monitor ${m.id}`}
                      >
                        M{m.id}
                      </button>
                    ))}
                  </div>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => handleDuplicate(preset)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    title="Duplicate preset"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete (custom only) */}
                  {!preset.isFactory && (
                    <button
                      type="button"
                      onClick={() => handleDelete(preset.id)}
                      className="p-1 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-950/50"
                      title="Delete custom preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
