import React, { useState, useEffect } from 'react';
import { VisualizerPreset, ShaderUniforms } from '../types/visualizer';
import { GLSLVisualizerRenderer } from '../utils/glslEngine';
import { Code, Play, Save, RotateCcw, HelpCircle, CheckCircle2, AlertTriangle, Sliders, Sparkles } from 'lucide-react';

interface ShaderEditorProps {
  activePreset: VisualizerPreset;
  onUpdatePreset: (updated: VisualizerPreset) => void;
  onSaveAsNew: (preset: VisualizerPreset) => void;
}

export const ShaderEditor: React.FC<ShaderEditorProps> = ({
  activePreset,
  onUpdatePreset,
  onSaveAsNew
}) => {
  const [shaderCode, setShaderCode] = useState(activePreset.fragmentShader);
  const [uniforms, setUniforms] = useState<ShaderUniforms>(activePreset.uniforms);
  const [compileStatus, setCompileStatus] = useState<{ success: boolean; message: string; errorLine?: number }>({
    success: true,
    message: 'Shader ready (GLSL ES 3.0)'
  });
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState(`${activePreset.name} (Mod)`);
  const [newPresetCategory, setNewPresetCategory] = useState<VisualizerPreset['category']>('custom');

  useEffect(() => {
    setShaderCode(activePreset.fragmentShader);
    setUniforms(activePreset.uniforms);
  }, [activePreset.id]);

  // Test compilation using headless temporary canvas
  const validateShader = (code: string) => {
    try {
      const testCanvas = document.createElement('canvas');
      const testRenderer = new GLSLVisualizerRenderer(testCanvas);
      const res = testRenderer.compileShader(code);
      testRenderer.destroy();

      if (res.success) {
        setCompileStatus({ success: true, message: 'Valid GLSL ES 3.0 Shader' });
      } else {
        setCompileStatus({
          success: false,
          message: res.error || 'Syntax error',
          errorLine: res.errorLine
        });
      }
      return res.success;
    } catch (e: any) {
      setCompileStatus({ success: false, message: e.message || 'Validation failed' });
      return false;
    }
  };

  const handleApplyLive = () => {
    const isValid = validateShader(shaderCode);
    if (isValid) {
      onUpdatePreset({
        ...activePreset,
        fragmentShader: shaderCode,
        uniforms
      });
    }
  };

  const handleUniformChange = (key: keyof ShaderUniforms, value: any) => {
    const updated = { ...uniforms, [key]: value };
    setUniforms(updated);
    onUpdatePreset({
      ...activePreset,
      uniforms: updated
    });
  };

  const handleSaveModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAsNew({
      id: `custom_${Date.now()}`,
      name: newPresetName,
      description: 'Custom user-authored shader effect',
      category: newPresetCategory,
      author: 'User',
      fragmentShader: shaderCode,
      uniforms,
      isFactory: false
    });
    setShowSaveModal(false);
  };

  const lineCount = shaderCode.split('\n').length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-sm text-slate-200">GLSL Shader Studio</h2>
          <span className="text-xs font-mono text-slate-400">({activePreset.name})</span>
        </div>

        {/* Live Compilation Status Pill */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border ${
              compileStatus.success
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/80 border-rose-700 text-rose-300'
            }`}
          >
            {compileStatus.success ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="truncate max-w-[280px]">{compileStatus.message}</span>
            {compileStatus.errorLine && (
              <span className="font-bold underline ml-1">Line {compileStatus.errorLine}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCheatsheet(!showCheatsheet)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 px-2 py-1 bg-slate-950 rounded border border-slate-800 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Uniforms Reference</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApplyLive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-600/30 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Apply Live</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>Save Preset</span>
          </button>
        </div>
      </div>

      {/* Uniforms Reference Drawer */}
      {showCheatsheet && (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
          <div className="font-bold text-cyan-400">Available GPU GLSL Uniforms:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
            <div><code className="text-pink-400">uniform float u_time;</code> <span className="text-slate-400">- Seconds elapsed</span></div>
            <div><code className="text-pink-400">uniform vec2 u_resolution;</code> <span className="text-slate-400">- Canvas dimensions (px)</span></div>
            <div><code className="text-pink-400">uniform float u_bass;</code> <span className="text-slate-400">- Bass energy (0.0 to 1.0)</span></div>
            <div><code className="text-pink-400">uniform float u_sub;</code> <span className="text-slate-400">- Sub-bass 20-60Hz (0.0 to 1.0)</span></div>
            <div><code className="text-pink-400">uniform float u_mid;</code> <span className="text-slate-400">- Mid frequencies (0.0 to 1.0)</span></div>
            <div><code className="text-pink-400">uniform float u_treble;</code> <span className="text-slate-400">- High frequencies (0.0 to 1.0)</span></div>
            <div><code className="text-pink-400">uniform float u_energy;</code> <span className="text-slate-400">- Total RMS energy</span></div>
            <div><code className="text-pink-400">uniform float u_beat;</code> <span className="text-slate-400">- 1.0 on kick drum pulse, else 0.0</span></div>
            <div><code className="text-pink-400">uniform float u_screen_idx;</code> <span className="text-slate-400">- 0 (Left), 1 (Center), 2 (Right)</span></div>
            <div><code className="text-pink-400">uniform float u_total_screens;</code> <span className="text-slate-400">- Total monitor count (3.0)</span></div>
            <div><code className="text-pink-400">uniform sampler2D u_fft_texture;</code> <span className="text-slate-400">- 512 1D audio frequency spectrum</span></div>
            <div><code className="text-pink-400">uniform sampler2D u_wave_texture;</code> <span className="text-slate-400">- 512 1D audio time waveform</span></div>
          </div>
        </div>
      )}

      {/* Editor & Parameter Controls Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3 cols: Code Editor with line numbers */}
        <div className="lg:col-span-3 flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
          {/* Line Numbers Bar */}
          <div className="w-12 py-3 bg-slate-900/60 text-slate-400 select-none text-right pr-3 border-r border-slate-800/80 leading-5">
            {Array.from({ length: Math.min(lineCount, 300) }, (_, i) => (
              <div
                key={i + 1}
                className={compileStatus.errorLine === i + 1 ? 'text-red-400 font-bold bg-red-950/80' : ''}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Textarea */}
          <textarea
            value={shaderCode}
            onChange={(e) => {
              setShaderCode(e.target.value);
              validateShader(e.target.value);
            }}
            spellCheck={false}
            className="w-full h-80 p-3 bg-transparent text-slate-200 resize-y focus:outline-none focus:ring-0 leading-5 font-mono selection:bg-cyan-800/60"
            placeholder="Write GLSL ES 3.0 Fragment Shader..."
            aria-label="GLSL Fragment Shader Code Editor"
          />
        </div>

        {/* Right col: Parameter Sliders */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300 pb-1 border-b border-slate-800">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Uniforms Tuning</span>
          </div>

          {/* Speed */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
              <label htmlFor="shader-speed">Speed (u_speed)</label>
              <span className="text-cyan-300">{uniforms.speed.toFixed(1)}x</span>
            </div>
            <input
              id="shader-speed"
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={uniforms.speed}
              onChange={(e) => handleUniformChange('speed', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Intensity */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
              <label htmlFor="shader-intensity">Intensity (u_intensity)</label>
              <span className="text-cyan-300">{uniforms.intensity.toFixed(1)}</span>
            </div>
            <input
              id="shader-intensity"
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={uniforms.intensity}
              onChange={(e) => handleUniformChange('intensity', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Bloom */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
              <label htmlFor="shader-bloom">Bloom Glow (u_bloom)</label>
              <span className="text-cyan-300">{uniforms.bloom.toFixed(1)}</span>
            </div>
            <input
              id="shader-bloom"
              type="range"
              min="0.5"
              max="3.5"
              step="0.1"
              value={uniforms.bloom}
              onChange={(e) => handleUniformChange('bloom', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Param 1 */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
              <label htmlFor="shader-param1">Scale / Factor (u_param1)</label>
              <span className="text-cyan-300">{uniforms.param1.toFixed(2)}</span>
            </div>
            <input
              id="shader-param1"
              type="range"
              min="0.1"
              max="5.0"
              step="0.05"
              value={uniforms.param1}
              onChange={(e) => handleUniformChange('param1', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Param 2 */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
              <label htmlFor="shader-param2">Density / Gain (u_param2)</label>
              <span className="text-cyan-300">{uniforms.param2.toFixed(2)}</span>
            </div>
            <input
              id="shader-param2"
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={uniforms.param2}
              onChange={(e) => handleUniformChange('param2', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={() => {
              setShaderCode(activePreset.fragmentShader);
              setUniforms(activePreset.uniforms);
              validateShader(activePreset.fragmentShader);
            }}
            className="w-full mt-2 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Preset Original</span>
          </button>
        </div>
      </div>

      {/* Save Preset Dialog Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Save className="w-4 h-4 text-cyan-400" />
              <span>Save as Custom Preset</span>
            </h3>

            <form onSubmit={handleSaveModalSubmit} className="space-y-3">
              <div>
                <label htmlFor="new-preset-name" className="text-xs text-slate-400 block mb-1">Preset Name</label>
                <input
                  id="new-preset-name"
                  type="text"
                  required
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label htmlFor="new-preset-cat" className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  id="new-preset-cat"
                  value={newPresetCategory}
                  onChange={(e) => setNewPresetCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="custom">Custom</option>
                  <option value="cyberpunk">Cyberpunk</option>
                  <option value="ambient">Ambient</option>
                  <option value="retro">Retro</option>
                  <option value="liquid">Liquid</option>
                  <option value="geometric">Geometric</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-600/30"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
