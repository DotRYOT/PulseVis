import React, { useEffect, useRef, useState } from 'react';
import { AudioAnalysisData, VisualizerPreset, MonitorConfig } from '../types/visualizer';
import { GLSLVisualizerRenderer, FALLBACK_ERROR_SHADER } from '../utils/glslEngine';
import { Maximize2, Minimize2, AlertCircle, Cpu } from 'lucide-react';

interface VisualizerCanvasProps {
  preset: VisualizerPreset;
  monitor: MonitorConfig;
  audioData: AudioAnalysisData;
  totalScreens?: number;
  className?: string;
  showOverlayInfo?: boolean;
  onPopoutRequest?: () => void;
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  preset,
  monitor,
  audioData,
  totalScreens = 3,
  className = '',
  showOverlayInfo = true,
  onPopoutRequest
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GLSLVisualizerRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fps, setFps] = useState(60);
  const [compileError, setCompileError] = useState<string | null>(null);

  const fpsRef = useRef({ count: 0, lastTime: performance.now() });

  // Initialize or re-compile when preset fragmentShader changes
  useEffect(() => {
    if (!canvasRef.current) return;

    if (!rendererRef.current) {
      rendererRef.current = new GLSLVisualizerRenderer(canvasRef.current);
    }

    const renderer = rendererRef.current;
    const res = renderer.compileShader(preset.fragmentShader);

    if (!res.success) {
      console.warn('Shader compile failed, loading fallback:', res.error);
      renderer.compileShader(FALLBACK_ERROR_SHADER);
      setCompileError(res.error || 'Shader compilation error');
    } else {
      setCompileError(null);
    }

    return () => {
      // Don't tear down immediately on every render, cleanup on unmount
    };
  }, [preset.fragmentShader, preset.id]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, []);

  // Animation frame loop
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      if (canvasRef.current && rendererRef.current && monitor.enabled) {
        // Handle resolution resize
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.floor(rect.width * dpr);
        const targetH = Math.floor(rect.height * dpr);

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        rendererRef.current.render(
          audioData,
          preset.uniforms,
          monitor.screenIndexUniform,
          totalScreens,
          monitor.volumeSensitivity,
          monitor.zoom
        );

        // Calculate FPS
        fpsRef.current.count++;
        const now = performance.now();
        if (now - fpsRef.current.lastTime >= 1000) {
          setFps(Math.round((fpsRef.current.count * 1000) / (now - fpsRef.current.lastTime)));
          fpsRef.current.count = 0;
          fpsRef.current.lastTime = now;
        }
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [audioData, preset.uniforms, monitor, totalScreens]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen && !document.fullscreenElement) {
      if (typeof containerRef.current.requestFullscreen === 'function') {
        containerRef.current
          .requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(() => {
            // Fallback to in-window fullscreen overlay when disallowed by iframe policy
            setIsFullscreen(true);
          });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => setIsFullscreen(false));
      } else {
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen rounded-none' : `relative rounded-lg ${className}`
      } overflow-hidden bg-black border border-slate-800 shadow-2xl group`}
      data-testid={`visualizer-canvas-monitor-${monitor.id}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          transform: monitor.mirror ? 'scaleX(-1)' : 'none',
          filter: monitor.colorShift ? `hue-rotate(${monitor.colorShift}deg)` : 'none'
        }}
      />

      {/* Compile Error Warning Banner */}
      {compileError && (
        <div className="absolute top-3 left-3 right-3 bg-red-950/90 border border-red-600/70 rounded p-2.5 text-xs text-red-200 backdrop-blur z-20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="overflow-hidden">
            <div className="font-semibold text-red-300">GLSL Compilation Error (Showing Diagnostic Pattern)</div>
            <div className="font-mono text-[11px] truncate text-red-300/80 mt-0.5">{compileError}</div>
          </div>
        </div>
      )}

      {/* Monitor Header Overlay */}
      {showOverlayInfo && (
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between opacity-70 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded border border-slate-800/80 text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono font-bold text-slate-200">MONITOR {monitor.id}</span>
            <span className="text-slate-400 font-mono text-[10px]">({preset.name})</span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur px-2 py-1 rounded border border-slate-800/80 text-[10px] font-mono text-cyan-300">
              <Cpu className="w-3 h-3 text-emerald-400" />
              <span>{fps} FPS</span>
            </div>

            {onPopoutRequest && (
              <button
                type="button"
                onClick={onPopoutRequest}
                className="bg-slate-900/90 hover:bg-cyan-950/90 hover:text-cyan-300 text-slate-300 border border-slate-700/80 hover:border-cyan-500/60 p-1 rounded text-xs transition"
                title={`Popout Monitor ${monitor.id} to physical screen`}
                aria-label={`Popout Monitor ${monitor.id} to physical screen`}
              >
                Popout
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 p-1 rounded text-xs transition"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Sub-bass / Kick reaction pulse ring */}
      {audioData.beatDetected && (
        <div className="absolute inset-0 pointer-events-none border-2 border-cyan-400/40 rounded-lg animate-ping opacity-25" />
      )}
    </div>
  );
};
