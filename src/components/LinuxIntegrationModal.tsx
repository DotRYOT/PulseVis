import React, { useState } from 'react';
import { LINUX_INTEGRATION } from '../utils/pipewireGuide';
import { Terminal, Copy, Check, X, Shield, Cpu, ExternalLink, Sparkles } from 'lucide-react';

interface LinuxIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LinuxIntegrationModal: React.FC<LinuxIntegrationModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pipewire' | 'hyprland' | 'systemd' | 'script' | 'pkgbuild'>('pipewire');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">Arch Linux & CachyOS PipeWire / Wayland Hub</h2>
              <p className="text-xs text-slate-400">Ultra-low latency audio loopback and native multi-monitor window rules</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('pipewire')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'pipewire' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PipeWire Low-Latency
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hyprland')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'hyprland' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Wayland / Hyprland Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('systemd')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'systemd' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            systemd User Service
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'script' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CachyOS Launcher Script
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pkgbuild')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'pkgbuild' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AUR PKGBUILD
          </button>
        </div>

        {/* Content based on tab */}
        {activeTab === 'pipewire' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl space-y-1.5">
              <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                How PipeWire capture works on CachyOS:
              </span>
              <p className="text-slate-300 leading-relaxed">
                CachyOS uses customized kernel scheduling (BORE/EEVDF) and PipeWire with WirePlumber.
                In the app, clicking <strong>"PipeWire Capture"</strong> calls the modern WebRTC Screen/Audio capture portal.
                Select <em>"Monitor of Built-in Audio"</em> or any audio stream to route low-latency system sound directly into the WebGL visualizer.
              </p>
              <p className="text-slate-400">
                For a dedicated permanent virtual loopback node with 128 samples (~2.6ms buffer delay), run the command below:
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>Terminal Command:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(LINUX_INTEGRATION.pwLoopbackCmd, 'pwLoopback')}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                >
                  {copiedKey === 'pwLoopback' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pwLoopback' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto select-all">
                {LINUX_INTEGRATION.pwLoopbackCmd}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'hyprland' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300">
              When using 3 monitors on Hyprland or Sway Wayland compositors, you can pop out Monitor 2 and Monitor 3 into borderless fullscreen windows and pin them to specific display outputs (e.g. DP-1, DP-2, HDMI-A-1).
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>Add to ~/.config/hypr/hyprland.conf:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(LINUX_INTEGRATION.hyprlandRule, 'hyprland')}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                >
                  {copiedKey === 'hyprland' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'hyprland' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto select-all">
                {LINUX_INTEGRATION.hyprlandRule}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'systemd' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300">
              Enable an automatic user systemd service so your PipeWire low-latency loopback node starts automatically on login:
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>Save to ~/.config/systemd/user/cachypulse-audio.service:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(LINUX_INTEGRATION.systemdService, 'systemd')}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                >
                  {copiedKey === 'systemd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'systemd' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto select-all">
                {LINUX_INTEGRATION.systemdService}
              </pre>
            </div>
            <div className="font-mono text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded border border-slate-800">
              Run: <code>systemctl --user daemon-reload && systemctl --user enable --now cachypulse-audio.service</code>
            </div>
          </div>
        )}

        {activeTab === 'script' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300">
              GPU-accelerated desktop wrapper with Wayland EGL and Vulkan flags for maximum FPS (144Hz/240Hz):
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>cachyos-visualizer.sh:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(LINUX_INTEGRATION.cachyOSLauncherScript, 'script')}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                >
                  {copiedKey === 'script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'script' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto select-all max-h-56">
                {LINUX_INTEGRATION.cachyOSLauncherScript}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'pkgbuild' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300">
              Arch User Repository (AUR) PKGBUILD for packaging CachyPulse on CachyOS / Arch Linux:
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>PKGBUILD:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(LINUX_INTEGRATION.pkgbuild, 'pkgbuild')}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                >
                  {copiedKey === 'pkgbuild' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pkgbuild' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto select-all max-h-56">
                {LINUX_INTEGRATION.pkgbuild}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
