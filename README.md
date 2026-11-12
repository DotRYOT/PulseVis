# CachyPulse — Triple-Monitor PipeWire & Wayland GPU Audio Visualizer

<div align="center">

![Platform](https://img.shields.io/badge/OS-Arch%20Linux%20%7C%20CachyOS-00c8ff?style=for-the-badge&logo=arch-linux&logoColor=white)
![Display](https://img.shields.io/badge/Compositor-Wayland%20(Hyprland%20%7C%20Sway%20%7C%20KDE)-10b981?style=for-the-badge&logo=wayland&logoColor=white)
![Audio](https://img.shields.io/badge/Audio-PipeWire%20Low--Latency%20(48kHz)-a855f7?style=for-the-badge&logo=linux&logoColor=white)
![Renderer](https://img.shields.io/badge/GPU-WebGL2%20%2F%20GLSL%20ES%203.0-f59e0b?style=for-the-badge&logo=opengl&logoColor=white)
![License](https://img.shields.io/badge/License-Apache%202.0-slate?style=for-the-badge)

**A GPU-accelerated, multi-monitor desktop audio visualizer engineered for Arch Linux & CachyOS.**  
Synchronizes seamlessly with any system audio output via **PipeWire**, spans across **3 monitors** on **Wayland**, features a live **GLSL ES 3.0 Shader Studio**, an intuitive **Preset Manager**, and **hardware-accelerated video export**.

</div>

---

## Table of Contents

- [Features](#features)
- [System Requirements (Arch Linux / CachyOS)](#system-requirements-arch-linux--cachyos)
- [Installation](#installation)
  - [1. Clone & Build from Source](#1-clone--build-from-source)
  - [2. Arch Linux / CachyOS AUR Package (`PKGBUILD`)](#2-arch-linux--cachyos-aur-package-pkgbuild)
  - [3. Native Wayland GPU Launcher Script](#3-native-wayland-gpu-launcher-script)
- [PipeWire Low-Latency Audio Setup](#pipewire-low-latency-audio-setup)
  - [Option A: Zero-Config Portal Capture](#option-a-zero-config-portal-capture)
  - [Option B: Dedicated `pw-loopback` Sink (~2.6ms Latency)](#option-b-dedicated-pw-loopback-sink-26ms-latency)
  - [Option C: Automatic `systemd` User Service](#option-c-automatic-systemd-user-service)
- [Wayland Triple-Monitor Configuration](#wayland-triple-monitor-configuration)
  - [Hyprland Window & Workspace Rules](#hyprland-window--workspace-rules)
  - [Sway Configuration](#sway-configuration)
- [Custom GLSL ES 3.0 Shader Studio](#custom-glsl-es-30-shader-studio)
  - [Available GPU Uniforms](#available-gpu-uniforms)
  - [Multi-Monitor Coordinate Spanning](#multi-monitor-coordinate-spanning)
- [Preset Manager & JSON Sharing](#preset-manager--json-sharing)
- [Hardware-Accelerated Video Export](#hardware-accelerated-video-export)
- [Development & Unit Tests](#development--unit-tests)
- [License](#license)

---

## Features

- **Triple-Monitor Panoramic & Independent Display Routing**
  - **Triple Panorama Mode**: Spans a single continuous GLSL coordinate space (`u_screen_idx = 0, 1, 2`) across all three monitors.
  - **Independent Screen Mode**: Assign a different shader, hue shift (`0°–360°`), zoom (`0.5x–2.0x`), sensitivity, and mirror setting to each physical display.
  - **Real-Time Multi-Window Sync**: Pop out secondary displays (`?popout=2`, `?popout=3`) synchronized at 60–120+ FPS via low-overhead `BroadcastChannel` telemetry.
- **Ultra-Low-Latency PipeWire Audio Engine**
  - Captures system audio directly via `xdg-desktop-portal` / PipeWire monitor sinks (`48kHz` sample rate), microphone/line-in virtual sinks, local audio files (`.flac`, `.wav`, `.mp3`, `.ogg`), or the built-in 4-mode procedural synth groove generator.
  - Real-time **Sub-Bass (20–60Hz)**, **Bass (20–250Hz)**, **Mid (250–4000Hz)**, and **Treble (4–20kHz)** FFT decomposition with dynamic variance-adaptive kick/beat detection and asymmetric fluid temporal smoothing.
- **Live GLSL ES 3.0 Shader Studio**
  - In-app fragment shader code editor with live compilation diagnostics, line-number error highlighting, fallback protection, and real-time uniform sliders.
- **6 Curated Factory Shaders + Custom Preset Library**
  - *Cyberpunk Raymarcher* (Volumetric plasma pillars, fluid wave ribbon, infinite 3D grid)
  - *Event Horizon Warp* (Relativistic gravitational lensing & Doppler accretion disk)
  - *808 Synthwave Sunset* (Outrun perspective grid, equalizer mountain ridge, laser sun)
  - *Bioluminescent Liquid Nebula* (Fluid metaball potential field & reactive turbulence)
  - *Quantum Lissajous Laser* (3D vector oscilloscope with CRT phosphor persistence)
  - *Quantum Spectrum Monoliths* (Matrix glyph rain with reflective 3D equalizer towers)
- **Hardware-Accelerated Video Exporter**
  - Record directly from the WebGL2 canvas with synchronized audio in **1080p**, **1440p**, **4K UHD**, or **Triple Panoramic (5760×1080 / 7680×1440)** at **30 / 60 / 120 FPS** using **VP9**, **H.264**, or **AV1**, plus auto-generated **FFmpeg VA-API / NVENC** CLI commands.

---

## System Requirements (Arch Linux / CachyOS)

Install the required system packages on **CachyOS** or **Arch Linux**:

```bash
sudo pacman -S --needed \
  pipewire pipewire-pulse pipewire-alsa wireplumber \
  wayland xdg-desktop-portal \
  mesa vulkan-icd-loader ffmpeg nodejs npm
```

### GPU Hardware Acceleration Drivers

- **AMD Radeon (RADV / VA-API)**:
  ```bash
  sudo pacman -S --needed vulkan-radeon libva-mesa-driver mesa-vdpau
  ```
- **NVIDIA (Proprietary / CachyOS Kernel Modules)**:
  ```bash
  sudo pacman -S --needed nvidia-utils libva-nvidia-driver
  ```
- **Intel Arc / Iris Xe**:
  ```bash
  sudo pacman -S --needed vulkan-intel intel-media-driver
  ```

---

## Installation

### 1. Clone & Build from Source

```bash
git clone https://github.com/DotRYOT/PulseVis.git
cd PulseVis

# Install dependencies
npm install

# Start the development server on port 3000
npm run dev

# Or build for production
npm run build
npm run preview -- --port 3000 --host 0.0.0.0
```

### 2. Arch Linux / CachyOS AUR Package (`PKGBUILD`)

To package and install `cachypulse-git` natively via `makepkg`:

```bash
mkdir -p build-aur && cd build-aur
cat << 'EOF' > PKGBUILD
pkgname=cachypulse-git
pkgver=1.0.0
pkgrel=1
pkgdesc="GPU-accelerated triple-monitor audio visualizer with PipeWire & Wayland integration"
arch=('x86_64')
url="https://github.com/cachyos/cachypulse"
license=('Apache-2.0')
depends=('pipewire' 'pipewire-pulse' 'wireplumber' 'wayland' 'mesa' 'vulkan-driver')
makedepends=('nodejs' 'npm')
optdepends=(
  'libva-mesa-driver: Hardware video decode/encode on AMD'
  'nvidia-utils: Hardware NVENC acceleration on NVIDIA'
  'hyprland: Tiling Wayland compositor'
)

build() {
  cd "$startdir/.."
  npm install
  npm run build
}

package() {
  install -d "$pkgdir/usr/share/cachypulse"
  cp -r "$startdir/../dist/"* "$pkgdir/usr/share/cachypulse/"
}
EOF

makepkg -si
```

### 3. Native Wayland GPU Launcher Script

Save the following script as `~/.local/bin/cachyos-visualizer.sh` and make it executable (`chmod +x ~/.local/bin/cachyos-visualizer.sh`) to launch the app with native Wayland Ozone, Vulkan, and zero-copy GPU rasterization flags:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking PipeWire and Wayland compositor on CachyOS..."
if ! pgrep -x "pipewire" >/dev/null; then
  systemctl --user start pipewire pipewire-pulse wireplumber
fi

GPU_FLAGS=""
if lspci | grep -qi "nvidia"; then
  echo "==> NVIDIA GPU detected. Enabling EGL Wayland & Vulkan flags..."
  GPU_FLAGS="--enable-features=VaapiVideoDecoder,Vulkan,WaylandWindowDecorations --use-gl=egl"
elif lspci | grep -qiE "amd|radeon"; then
  echo "==> AMD GPU detected with Mesa RADV/Vulkan..."
  GPU_FLAGS="--enable-features=VaapiVideoDecoder,Vulkan,WaylandWindowDecorations --ozone-platform-hint=wayland"
fi

exec chromium \
  $GPU_FLAGS \
  --ozone-platform=wayland \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  --ignore-gpu-blocklist \
  --app="http://localhost:3000" \
  "$@"
```

---

## PipeWire Low-Latency Audio Setup

### Option A: Zero-Config Portal Capture

1. Click **PipeWire Capture** in the top audio transport bar.
2. In the Wayland `xdg-desktop-portal` dialog, select **Monitor of Built-in Audio** (or any application stream) and enable **Share System Audio**.

### Option B: Dedicated `pw-loopback` Sink (~2.6ms Latency)

Create a dedicated `128/48000` (`~2.6ms` latency) virtual loopback node that routes your desktop audio directly into CachyPulse's **Mic / Line-In** input:

```bash
PIPEWIRE_LATENCY="128/48000" pw-loopback \
  --capture-props='{ media.class = Audio/Sink, node.description = "CachyPulse System Monitor" }' \
  --playback-props='{ media.class = Stream/Input/Audio, node.name = "cachypulse_in" }'
```

### Option C: Automatic `systemd` User Service

To start the low-latency PipeWire loopback automatically on login:

```bash
mkdir -p ~/.config/systemd/user

cat << 'EOF' > ~/.config/systemd/user/cachypulse-audio.service
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
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now cachypulse-audio.service
```

---

## Wayland Triple-Monitor Configuration

### Hyprland Window & Workspace Rules

Add the following rules to `~/.config/hypr/hyprland.conf` to remove borders/animations on visualizer windows and pin workspaces to your three physical monitors (check output names via `hyprctl monitors`):

```ini
# ~/.config/hypr/hyprland.conf
windowrulev2 = fullscreen, title:^(CachyPulse.*)$
windowrulev2 = noanim, title:^(CachyPulse - Monitor.*)$
windowrulev2 = noborder, title:^(CachyPulse - Monitor.*)$
windowrulev2 = noshadow, title:^(CachyPulse - Monitor.*)$

# Pin workspaces to physical outputs (replace with your hyprctl monitors names)
workspace = 1, monitor:DP-1, default:true
workspace = 2, monitor:DP-2
workspace = 3, monitor:HDMI-A-1
```

### Sway Configuration

Add to `~/.config/sway/config`:

```ini
for_window [title="^CachyPulse.*"] fullscreen enable, border none, inhibit_idle visible
```

---

## Custom GLSL ES 3.0 Shader Studio

Open the **GLSL Studio** tab to write or modify fragment shaders in real time. All shaders use `#version 300 es` and output `out vec4 fragColor;`.

### Available GPU Uniforms

| Uniform Declaration | Description | Range / Format |
| :--- | :--- | :--- |
| `uniform float u_time;` | Elapsed animation time in seconds (scaled by `u_speed`) | `0.0+` |
| `uniform vec2 u_resolution;` | Viewport canvas dimensions in physical pixels | `(width, height)` |
| `uniform float u_sub;` | Sub-Bass energy (`20Hz – 60Hz`) | `0.0 – 1.0` |
| `uniform float u_bass;` | Bass energy (`20Hz – 250Hz`) | `0.0 – 1.0` |
| `uniform float u_mid;` | Midrange energy (`250Hz – 4000Hz`) | `0.0 – 1.0` |
| `uniform float u_treble;` | High-frequency energy (`4000Hz – 20000Hz`) | `0.0 – 1.0` |
| `uniform float u_energy;` | Overall RMS signal energy | `0.0 – 1.0` |
| `uniform float u_beat;` | Instantaneous kick/beat trigger pulse | `1.0` on beat, else `0.0` |
| `uniform float u_screen_idx;` | Monitor index (`0.0` = Left, `1.0` = Center, `2.0` = Right) | `0.0, 1.0, 2.0` |
| `uniform float u_total_screens;` | Total active monitors in array | `1.0` or `3.0` |
| `uniform sampler2D u_fft_texture;` | 512-bin 1D normalized frequency spectrum (`R8`) | `texture(u_fft_texture, vec2(x, 0.5)).r` |
| `uniform sampler2D u_wave_texture;` | 512-sample 1D time-domain waveform (`R8`) | `texture(u_wave_texture, vec2(x, 0.5)).r` |
| `uniform float u_speed;` | User speed multiplier slider | `0.1 – 3.0` |
| `uniform float u_intensity;` | User audio reactivity multiplier | `0.2 – 3.0` |
| `uniform float u_bloom;` | User HDR glow/bloom multiplier | `0.5 – 3.5` |
| `uniform float u_param1..4;` | Custom per-preset shader parameters | Configurable |

### Multi-Monitor Coordinate Spanning

To make your custom shader span seamlessly across all 3 monitors in **Triple Panorama** mode, offset the normalized UV coordinate using `u_screen_idx`:

```glsl
vec2 getMultiScreenUV() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv.x += (u_screen_idx - 1.0) * 0.35; // Offset Left (-0.35), Center (0.0), Right (+0.35)
  return (uv - 0.5) * 2.0;
}
```

---

## Preset Manager & JSON Sharing

- **Apply to All or Per-Monitor**: In the **Preset Library** tab, click **Apply to All** to synchronize a shader across your entire desk, or click **M1**, **M2**, or **M3** on any preset card to route that shader to a specific monitor.
- **Export / Import JSON**: Back up or share your custom GLSL presets via **Export JSON** and **Import JSON**. Custom presets are automatically persisted in `localStorage`.

---

## Hardware-Accelerated Video Export

Click **Video Export** in the top navigation bar to record directly from the GPU canvas:

1. **In-Browser WebGL2 MediaRecorder**:
   - **Resolutions**: `1920×1080` (1080p), `2560×1440` (1440p), `3840×2160` (4K), `5760×1080` (Triple 1080p), `7680×1440` (Triple 1440p)
   - **Framerates**: `30 FPS`, `60 FPS`, `120 FPS`
   - **Codecs**: `VP9`, `H.264 / AVC`, `AV1` with synchronized audio stream multiplexing.
2. **Native FFmpeg VA-API & NVENC CLI**:
   - **AMD / Intel (VA-API)**:
     ```bash
     ffmpeg -vaapi_device /dev/dri/renderD128 -f rawvideo -s 1920x1080 -r 60 -pix_fmt yuv420p \
       -i visualizer_stream.raw -vf 'format=nv12,hwupload' -c:v h264_vaapi -b:v 25M output_vaapi_60fps.mp4
     ```
   - **NVIDIA (NVENC)**:
     ```bash
     ffmpeg -f rawvideo -vcodec rawvideo -s 1920x1080 -r 60 -pix_fmt rgba \
       -i visualizer_stream.raw -c:v h264_nvenc -preset p7 -cq 18 -b:v 25M output_nvenc_60fps.mp4
     ```

---

## Development & Unit Tests

```bash
# Run TypeScript typechecking
npm run lint

# Run unit tests (FFT frequency band integration, BeatTracker, and preset validation)
npx --yes tsx --test src/utils/audioAnalyzer.test.ts src/utils/presets.test.ts

# Build production bundle
npm run build
```

---

## License

Licensed under the **Apache License 2.0**.
