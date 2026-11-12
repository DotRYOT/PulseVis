import React, { useState, useEffect, useRef } from 'react';
import { ExportSettings } from '../types/visualizer';
import { hardwareVideoExporter, HardwareVideoExporter } from '../utils/videoExporter';
import { audioVisualizerEngine } from '../utils/audioAnalyzer';
import { Video, Film, Download, Play, Square, Cpu, Check, Copy, AlertCircle, X } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<ExportSettings>({
    resolutionPreset: '1080p',
    width: 1920,
    height: 1080,
    fps: 60,
    codec: 'vp9',
    bitrateMbps: 25,
    durationSeconds: 10,
    includeAudio: true,
    targetMonitor: 'all_panoramic'
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const timerRef = useRef<any>(null);

  const supportedCodecs = HardwareVideoExporter.getSupportedCodecs();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleStartRecording = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      setExportError('No active visualizer canvas found');
      return;
    }

    setExportError(null);
    setExportedUrl(null);
    setExportedBlob(null);
    setIsRecording(true);
    setRecordProgress(0);

    const audioDest = settings.includeAudio ? audioVisualizerEngine.getMediaStreamDestination() : null;
    const audioStream = audioDest ? audioDest.stream : null;

    const startTime = performance.now();
    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (settings.durationSeconds > 0) {
        setRecordProgress(Math.min(100, (elapsed / settings.durationSeconds) * 100));
      }
    }, 100);

    hardwareVideoExporter.startRecording(
      canvas,
      audioStream,
      settings,
      (blob, url) => {
        setIsRecording(false);
        clearInterval(timerRef.current);
        setRecordProgress(100);
        setExportedBlob(blob);
        setExportedUrl(url);
      },
      (err) => {
        setIsRecording(false);
        clearInterval(timerRef.current);
        setExportError(err.message || 'Recording failed');
      }
    );
  };

  const handleStopRecording = () => {
    hardwareVideoExporter.stopRecording();
  };

  const resolutionOptions = [
    { id: '1080p', label: '1080p Full HD (1920x1080)', w: 1920, h: 1080 },
    { id: '1440p', label: '1440p QHD (2560x1440)', w: 2560, h: 1440 },
    { id: '4k', label: '4K UHD (3840x2160)', w: 3840, h: 2160 },
    { id: 'triple_1080p', label: 'Triple 1080p Panoramic (5760x1080)', w: 5760, h: 1080 },
    { id: 'triple_1440p', label: 'Triple 1440p Panoramic (7680x1440)', w: 7680, h: 1440 },
  ];

  const handleResolutionPresetChange = (presetId: string) => {
    const opt = resolutionOptions.find(o => o.id === presetId);
    if (opt) {
      setSettings(prev => ({
        ...prev,
        resolutionPreset: presetId as any,
        width: opt.w,
        height: opt.h
      }));
    }
  };

  const archFfmpegCmd = `# CachyOS Hardware-Accelerated VA-API / NVENC Export Command
ffmpeg -f x11grab -video_size ${settings.width}x${settings.height} -framerate ${settings.fps} \\
  -i :0.0 -c:v ${settings.codec === 'h264' ? 'h264_vaapi' : 'vp9_vaapi'} -b:v ${settings.bitrateMbps}M \\
  -t ${settings.durationSeconds} "cachyos_visualizer_${settings.fps}fps.webm"`;

  const copyCommand = () => {
    navigator.clipboard.writeText(archFfmpegCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">Hardware-Accelerated Video Exporter</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {exportError && (
          <div className="bg-rose-950/80 border border-rose-700 p-3 rounded-lg text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Resolution Preset */}
          <div>
            <label htmlFor="export-res-select" className="text-slate-400 font-mono block mb-1">Canvas Resolution</label>
            <select
              id="export-res-select"
              value={settings.resolutionPreset}
              onChange={(e) => handleResolutionPresetChange(e.target.value)}
              disabled={isRecording}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {resolutionOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Framerate Selection */}
          <div>
            <label htmlFor="export-fps-select" className="text-slate-400 font-mono block mb-1">Target Framerate</label>
            <select
              id="export-fps-select"
              value={settings.fps}
              onChange={(e) => setSettings(s => ({ ...s, fps: parseInt(e.target.value, 10) as any }))}
              disabled={isRecording}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value={30}>30 FPS (Standard)</option>
              <option value={60}>60 FPS (Ultra Smooth 1080p/4K)</option>
              <option value={120}>120 FPS (High-Refresh Gaming / CachyOS)</option>
            </select>
          </div>

          {/* Codec */}
          <div>
            <label htmlFor="export-codec-select" className="text-slate-400 font-mono block mb-1">GPU Acceleration Codec</label>
            <select
              id="export-codec-select"
              value={settings.codec}
              onChange={(e) => setSettings(s => ({ ...s, codec: e.target.value as any }))}
              disabled={isRecording}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              {supportedCodecs.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Bitrate */}
          <div>
            <div className="flex justify-between text-slate-400 font-mono mb-1">
              <label htmlFor="export-bitrate-slider">Bitrate Quality</label>
              <span className="text-cyan-400">{settings.bitrateMbps} Mbps</span>
            </div>
            <input
              id="export-bitrate-slider"
              type="range"
              min="5"
              max="50"
              step="5"
              value={settings.bitrateMbps}
              onChange={(e) => setSettings(s => ({ ...s, bitrateMbps: parseInt(e.target.value, 10) }))}
              disabled={isRecording}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="export-duration-select" className="text-slate-400 font-mono block mb-1">Duration</label>
            <select
              id="export-duration-select"
              value={settings.durationSeconds}
              onChange={(e) => setSettings(s => ({ ...s, durationSeconds: parseInt(e.target.value, 10) }))}
              disabled={isRecording}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value={5}>5 Seconds Quick Loop</option>
              <option value={10}>10 Seconds Preview</option>
              <option value={30}>30 Seconds Video</option>
              <option value={60}>60 Seconds Full Track</option>
              <option value={0}>Manual Stop</option>
            </select>
          </div>

          {/* Audio Sync */}
          <div className="flex items-center pt-5">
            <label htmlFor="export-include-audio" className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                id="export-include-audio"
                type="checkbox"
                checked={settings.includeAudio}
                onChange={(e) => setSettings(s => ({ ...s, includeAudio: e.target.checked }))}
                disabled={isRecording}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
              />
              <span>Synchronize Live Audio Track into Output</span>
            </label>
          </div>
        </div>

        {/* Recording Controls & Progress */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-700'}`} />
              <span className="font-mono text-xs text-slate-200">
                {isRecording ? 'Capturing GPU WebGL Video Stream...' : 'Ready to Record'}
              </span>
            </div>

            {isRecording ? (
              <button
                type="button"
                onClick={handleStopRecording}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/40 transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Recording</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/40 transition"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Start Hardware Recording</span>
              </button>
            )}
          </div>

          {isRecording && (
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full transition-all duration-100"
                style={{ width: `${recordProgress}%` }}
              />
            </div>
          )}

          {/* Export Complete Download Link */}
          {exportedUrl && (
            <div className="mt-3 p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Video Render Complete ({((exportedBlob?.size || 0) / (1024 * 1024)).toFixed(1)} MB)</span>
              </div>
              <a
                href={exportedUrl}
                download={`cachypulse_${settings.resolutionPreset}_${settings.fps}fps.webm`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Video</span>
              </a>
            </div>
          )}
        </div>

        {/* Arch Linux / CachyOS Terminal Command Helper */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Native CachyOS / Arch Linux FFmpeg CLI Hardware Acceleration:</span>
            </span>
            <button
              type="button"
              onClick={copyCommand}
              className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300"
            >
              {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCmd ? 'Copied' : 'Copy Command'}</span>
            </button>
          </div>
          <pre className="font-mono text-[11px] text-slate-300 bg-black/60 p-2.5 rounded border border-slate-900 overflow-x-auto select-all">
            {archFfmpegCmd}
          </pre>
        </div>
      </div>
    </div>
  );
};
