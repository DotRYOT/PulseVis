export interface LinuxIntegrationSnippets {
  pwLoopbackCmd: string;
  hyprlandRule: string;
  swayRule: string;
  systemdService: string;
  cachyOSLauncherScript: string;
  pkgbuild: string;
  ffmpegNvencCmd: string;
  ffmpegVaapiCmd: string;
}

export const LINUX_INTEGRATION: LinuxIntegrationSnippets = {
  pwLoopbackCmd: `# Set 128 buffer (~2.6ms ultra low latency) on CachyOS PipeWire
PIPEWIRE_LATENCY="128/48000" pw-loopback \\
  --capture-props='{ media.class = Audio/Sink, node.description = "CachyPulse System Monitor" }' \\
  --playback-props='{ media.class = Stream/Input/Audio, node.name = "cachypulse_in" }'`,

  hyprlandRule: `# ~/.config/hypr/hyprland.conf
# Triple-monitor Wayland layer rules & GPU pinning
windowrulev2 = fullscreen, title:^(CachyPulse.*)$
windowrulev2 = noanim, title:^(CachyPulse - Monitor.*)$
windowrulev2 = noborder, title:^(CachyPulse - Monitor.*)$
windowrulev2 = noshadow, title:^(CachyPulse - Monitor.*)$

# Pin visualizers to specific Wayland outputs
# Replace DP-1, DP-2, HDMI-A-1 with your 'hyprctl monitors' names
workspace = 1, monitor:DP-1, default:true
workspace = 2, monitor:DP-2
workspace = 3, monitor:HDMI-A-1`,

  swayRule: `# ~/.config/sway/config
for_window [title="^CachyPulse.*"] fullscreen enable, border none, inhibit_idle visible`,

  systemdService: `# ~/.config/systemd/user/cachypulse-audio.service
[Unit]
Description=CachyPulse PipeWire Low-Latency Audio Loopback for CachyOS
After=pipewire.service wireplumber.service

[Service]
Type=simple
Environment="PIPEWIRE_LATENCY=128/48000"
ExecStart=/usr/bin/pw-loopback -m "[FL FR]" --name "CachyPulse_Audio_Sink"
Restart=on-failure
RestartSec=2

[Install]
WantedBy=default.target`,

  cachyOSLauncherScript: `#!/usr/bin/env bash
# cachyos-visualizer.sh - GPU-accelerated launch script for CachyOS / Arch Linux
set -euo pipewire

echo "==> Checking PipeWire and Wayland compositor on CachyOS..."
if ! pgrep -x "pipewire" >/dev/null; then
  echo "Starting PipeWire..."
  systemctl --user start pipewire pipewire-pulse wireplumber
fi

# Detect GPU driver
GPU_FLAGS=""
if lspci | grep -qi "nvidia"; then
  echo "==> NVIDIA GPU detected. Enabling NVENC & EGL Wayland flags..."
  GPU_FLAGS="--enable-features=VaapiVideoDecoder,Vulkan,WaylandWindowDecorations --use-gl=egl"
elif lspci | grep -qiE "amd|radeon"; then
  echo "==> AMD GPU detected with Mesa RADV/Vulkan..."
  GPU_FLAGS="--enable-features=VaapiVideoDecoder,Vulkan,WaylandWindowDecorations --ozone-platform-hint=wayland"
fi

# Launch Chromium/Electron with low-latency PipeWire audio flag & GPU acceleration
exec chromium \\
  $GPU_FLAGS \\
  --ozone-platform=wayland \\
  --enable-gpu-rasterization \\
  --enable-zero-copy \\
  --ignore-gpu-blocklist \\
  --app="http://localhost:3000" \\
  "$@"`,

  pkgbuild: `# PKGBUILD for Arch Linux / CachyOS AUR
pkgname=cachypulse-git
pkgver=1.0.0
pkgrel=1
pkgdesc="GPU-accelerated triple-monitor audio visualizer with PipeWire & Wayland integration"
arch=('x86_64')
url="https://github.com/cachyos/cachypulse"
license=('Apache-2.0')
depends=('pipewire' 'pipewire-pulse' 'wireplumber' 'wayland' 'mesa' 'vulkan-driver')
optdepends=(
  'libva-mesa-driver: Hardware video decode/encode on AMD'
  'nvidia-utils: Hardware NVENC acceleration on NVIDIA'
  'hyprland: Tiling Wayland compositor'
)

build() {
  cd "$srcdir"
  npm run build
}

package() {
  install -d "$pkgdir/usr/share/cachypulse"
  cp -r dist/* "$pkgdir/usr/share/cachypulse/"
}`,

  ffmpegNvencCmd: `# Hardware-Accelerated NVENC Video Export (NVIDIA)
ffmpeg -f rawvideo -vcodec rawvideo -s 1920x1080 -r 60 -pix_fmt rgba \\
  -i visualizer_stream.raw -c:v h264_nvenc -preset p7 -cq 18 -b:v 25M \\
  -maxrate 35M -bufsize 50M output_nvenc_60fps.mp4`,

  ffmpegVaapiCmd: `# Hardware-Accelerated VA-API Video Export (AMD / Intel on CachyOS)
ffmpeg -vaapi_device /dev/dri/renderD128 -f rawvideo -s 1920x1080 -r 60 -pix_fmt yuv420p \\
  -i visualizer_stream.raw -vf 'format=nv12,hwupload' -c:v h264_vaapi -b:v 25M \\
  output_vaapi_60fps.mp4`
};
