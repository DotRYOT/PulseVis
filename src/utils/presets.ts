import { VisualizerPreset } from '../types/visualizer';

export const FACTORY_PRESETS: VisualizerPreset[] = [
  {
    id: 'cyber_monolith',
    name: 'Cyberpunk Raymarcher',
    description: 'Neon geometric monolith with audio-reactive volumetric grid and chromatic aberration',
    category: 'cyberpunk',
    author: 'CachyPulse Team',
    isFactory: true,
    uniforms: {
      speed: 1.2,
      intensity: 1.4,
      bloom: 1.5,
      particleDensity: 1.0,
      param1: 0.8, // Grid scale
      param2: 1.0, // Fog density
      param3: 0.5, // Aberration
      param4: 1.2, // Tower height
      colorScheme: 'cyan-magenta'
    },
    fragmentShader: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_sub;
uniform float u_mid;
uniform float u_treble;
uniform float u_energy;
uniform float u_beat;
uniform float u_screen_idx;
uniform float u_total_screens;

uniform float u_speed;
uniform float u_intensity;
uniform float u_bloom;
uniform float u_param1; // Grid scale
uniform float u_param2; // Fog
uniform float u_param3; // Aberration
uniform float u_param4; // Reactivity

uniform sampler2D u_fft_texture;
uniform sampler2D u_wave_texture;

// Screen offset for multi-monitor panoramic span
vec2 getMultiScreenUV() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy);
  // Pan coordinate across triple monitors if active
  float screenOffset = (u_screen_idx - 1.0) * 0.35;
  uv.x += screenOffset;
  return (uv - 0.5) * 2.0;
}

void main() {
  vec2 p = getMultiScreenUV();
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time * u_speed * 0.8;
  
  // Camera & Ray direction
  vec3 ro = vec3(0.0, 1.2 + sin(t * 0.5) * 0.2, -4.5 + t * 2.0);
  vec3 rd = normalize(vec3(p.x, p.y - 0.2, 1.4));

  // Beat kick camera shake
  if (u_beat > 0.5) {
    ro.y += (u_bass * 0.15);
  }

  // Sample smoothed audio spectrum with multi-tap neighborhood interpolation
  float normSpecX = clamp(abs(p.x) * 0.38, 0.0, 0.95);
  float fftCenter = texture(u_fft_texture, vec2(normSpecX, 0.5)).r;
  float fftLeft   = texture(u_fft_texture, vec2(max(0.0, normSpecX - 0.035), 0.5)).r;
  float fftRight  = texture(u_fft_texture, vec2(min(1.0, normSpecX + 0.035), 0.5)).r;
  float fftVal    = fftCenter * 0.5 + (fftLeft + fftRight) * 0.25;

  // Background neon cyber horizon with warm/magenta atmospheric glow
  vec3 col = vec3(0.03, 0.04, 0.09) * (1.0 - length(p) * 0.45);
  float horizonGlow = exp(-abs(p.y + 0.08) * 5.5) * (0.35 + u_bass * 0.45);
  col += mix(vec3(0.95, 0.15, 0.65), vec3(0.0, 0.85, 1.0), 0.5 + 0.5 * sin(p.x * 1.2 + t * 0.4)) * horizonGlow;

  // 3D Grid Plane (infinite perspective with thicker, fluidly undulating lines)
  if (rd.y < 0.0) {
    float dist = -(ro.y) / rd.y;
    vec3 hit = ro + rd * dist;
    
    // Fluid audio undulation on grid
    float wave = texture(u_wave_texture, vec2(fract(hit.z * 0.04 + t * 0.05), 0.5)).r - 0.5;
    vec2 warpedXZ = hit.xz * u_param1;
    warpedXZ.x += sin(hit.z * 0.35 - t * 1.8) * 0.14 * (0.3 + u_bass);
    warpedXZ.y += wave * u_bass * 0.85;

    vec2 grid = abs(fract(warpedXZ) - 0.5) / fwidth(warpedXZ);
    float line = min(grid.x, grid.y);
    // Thicker core line + soft neon bloom halo around each grid line
    float c = smoothstep(2.2, 0.25, line) + exp(-line * 0.35) * 0.45;

    // Color gradient: cyan to magenta neon
    vec3 gridCol = mix(vec3(0.0, 0.85, 1.0), vec3(1.0, 0.15, 0.75), sin(hit.z * 0.1 + t) * 0.5 + 0.5);
    gridCol *= (1.0 + u_bass * 2.2 * u_intensity);

    // Fog fade into distance
    float fog = exp(-dist * 0.075 * u_param2);
    col = mix(col, gridCol, clamp(c, 0.0, 1.0) * fog);
  }

  // Thick, Fluid Audio-Reactive Plasma Pillars & Continuous Wave Ribbon
  if (abs(p.x) < 1.55 && p.y > -0.45) {
    // Fluid lateral S-curve sway along pillar height so vertical bars flow organically
    float fluidSway = sin(p.y * 4.2 - t * 2.6 + p.x * 2.5) * 0.032 * (0.4 + u_bass * 0.8 + u_mid * 0.5);
    float fx = p.x + fluidSway;

    // 7.5 thick columns per unit width instead of 12 razor-thin needles
    float colDensity = 6.5;
    float colCoord = fx * colDensity;
    float colId = floor(colCoord);
    float cellX = fract(colCoord) - 0.5; // -0.5 to 0.5 across column cell

    // Smoothly sample FFT & wave per column with continuous fluid wave blend
    float colNormX = clamp(abs((colId + 0.5) / colDensity) * 0.42, 0.0, 0.92);
    float cFft0 = texture(u_fft_texture, vec2(colNormX, 0.5)).r;
    float cFft1 = texture(u_fft_texture, vec2(clamp(colNormX + 0.04, 0.0, 1.0), 0.5)).r;
    float cFft  = mix(cFft0, cFft1, 0.5);

    // Organic fluid height modulation combining FFT energy and traveling sine waves
    float travelingWave = sin(colId * 0.65 - t * 2.8) * 0.09 + cos(colId * 1.15 + t * 1.9) * 0.06;
    float envelopeTaper = smoothstep(1.55, 0.12, abs(p.x));
    float pillarHeight = -0.08 + (0.18 + cFft * 0.52 * u_param4 + travelingWave) * (1.0 + u_sub * 0.35 + u_bass * 0.25) * envelopeTaper;

    // Thick rounded bar profile: plush solid core (width ~0.48 of cell) + soft volumetric glow aura
    float distX = abs(cellX);
    float thickCore = smoothstep(0.27, 0.07, distX);
    float softAura  = exp(-distX * 5.2) * 0.42;
    float barProfile = clamp(thickCore + softAura, 0.0, 1.05);

    // Smooth vertical capsule top and base reflection fade
    float baseFade = smoothstep(-0.34, -0.05, p.y);
    float topCap   = smoothstep(pillarHeight + 0.10, pillarHeight - 0.06, p.y);
    float verticalMask = baseFade * topCap;

    // Glowing rounded plasma tip at the crest of each thick bar
    float tipGlow = exp(-abs(p.y - pillarHeight) * 18.0) * smoothstep(0.32, 0.0, distX) * 0.85;

    float yRatio = clamp((p.y + 0.12) / max(0.22, pillarHeight + 0.12), 0.0, 1.0);
    vec3 bottomCol = mix(vec3(0.0, 0.92, 0.88), vec3(0.15, 0.55, 1.0), 0.5 + 0.5 * sin(colId * 0.4 + t));
    vec3 topCol    = mix(vec3(1.0, 0.15, 0.72), vec3(1.0, 0.72, 0.2), clamp(u_bass * 0.7 + yRatio * 0.45, 0.0, 1.0));
    vec3 pillarCol = mix(bottomCol, topCol, yRatio);
    // Warm luminous core inside the center of each thick bar without blowing out to white
    pillarCol = mix(pillarCol, vec3(0.82, 0.96, 1.0), thickCore * 0.28);

    float reflScale = p.y < -0.06 ? 0.28 : 1.0;
    col += pillarCol * (barProfile * verticalMask + tipGlow) * reflScale * (0.72 + u_energy * 0.85) * u_bloom;
  }

  // Continuous Fluid Audio Wave Ribbon weaving across the pillars
  float ribbonWave = (texture(u_wave_texture, vec2(clamp(p.x * 0.25 + 0.5, 0.0, 1.0), 0.5)).r - 0.5) * 0.35 * (0.5 + u_bass);
  float ribbonY = 0.06 + sin(p.x * 3.2 - t * 2.2) * 0.07 + ribbonWave;
  float ribbonDist = abs(p.y - ribbonY);
  float ribbonBeam = smoothstep(0.028, 0.004, ribbonDist) + exp(-ribbonDist * 26.0) * 0.35;
  col += mix(vec3(0.0, 1.0, 0.9), vec3(1.0, 0.25, 0.8), 0.5 + 0.5 * sin(p.x * 2.0 + t)) * ribbonBeam * 0.42 * u_bloom;

  // High-frequency cyber particles
  float sparkle = fract(sin(dot(p.xy + vec2(t * 0.01), vec2(12.9898, 78.233))) * 43758.5453);
  if (sparkle > 0.985) {
    col += vec3(0.6, 0.9, 1.0) * u_treble * 3.0;
  }

  // Chromatic Aberration on intense bass
  if (u_param3 > 0.05 && u_bass > 0.4) {
    float shift = (u_bass - 0.4) * 0.025 * u_param3;
    col.r += texture(u_fft_texture, vec2(abs(p.x + shift), 0.5)).r * 0.4;
    col.b += texture(u_fft_texture, vec2(abs(p.x - shift), 0.5)).r * 0.4;
  }

  // Vignette
  col *= 1.0 - smoothstep(0.85, 1.85, length(p));

  fragColor = vec4(col, 1.0);
}
`
  },
  {
    id: 'black_hole_warp',
    name: 'Event Horizon Warp',
    description: 'Relativistic black hole with gravitational light bending and audio-reactive accretion disk',
    category: 'ambient',
    author: 'CachyPulse Team',
    isFactory: true,
    uniforms: {
      speed: 1.0,
      intensity: 1.5,
      bloom: 1.8,
      particleDensity: 1.2,
      param1: 0.35, // Event horizon radius
      param2: 1.4,  // Accretion disk brightness
      param3: 2.2,  // Gravitational lensing strength
      param4: 0.8,  // Starfield density
      colorScheme: 'amber-fire'
    },
    fragmentShader: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_sub;
uniform float u_mid;
uniform float u_treble;
uniform float u_energy;
uniform float u_beat;
uniform float u_screen_idx;

uniform float u_speed;
uniform float u_intensity;
uniform float u_bloom;
uniform float u_param1; // Horizon size
uniform float u_param2; // Disk brightness
uniform float u_param3; // Lensing
uniform float u_param4; // Stars

uniform sampler2D u_fft_texture;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  
  // Multi-monitor shift
  uv.x += (u_screen_idx - 1.0) * 0.45;

  float r = length(uv);
  float theta = atan(uv.y, uv.x);
  float t = u_time * u_speed;

  // Audio-reactive gravitational horizon pulsation
  float horizon = u_param1 * (1.0 + u_sub * 0.35);

  // Relativistic gravitational light bending deflection
  vec2 lensedUV = uv;
  if (r > horizon) {
    float deflection = (horizon * u_param3) / (r - horizon * 0.8);
    lensedUV = uv * (1.0 - deflection * 0.15);
  }

  float lr = length(lensedUV);
  float ltheta = atan(lensedUV.y, lensedUV.x);

  vec3 col = vec3(0.01, 0.01, 0.03);

  // Accretion disk swirling around black hole
  if (lr > horizon && lr < 1.4) {
    float diskDist = abs(lensedUV.y * 3.0 + sin(lensedUV.x * 2.0 + t) * 0.1);
    float spiral = sin(ltheta * 4.0 - t * 3.0 + 1.0 / (lr + 0.01) * 2.0);
    
    // FFT sampling based on radius
    float fft = texture(u_fft_texture, vec2(lr * 0.6, 0.5)).r;

    float diskGlow = exp(-diskDist * 4.0) * exp(-abs(lr - 0.6) * 3.0);
    diskGlow *= (1.0 + spiral * 0.4 + fft * 2.5 * u_intensity);

    // Relativistic Doppler beaming (approaching side is brighter blue-shifted)
    float doppler = 1.0 - lensedUV.x * 0.7;
    vec3 diskCol = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.85, 0.3), doppler);
    diskCol = mix(diskCol, vec3(0.4, 0.8, 1.0), u_treble * 1.5);

    col += diskCol * diskGlow * u_param2 * u_bloom;
  }

  // Photon Ring (thin bright halo right on the edge of the shadow)
  float photonRing = exp(-abs(lr - horizon * 1.05) * 55.0);
  col += vec3(1.0, 0.9, 0.7) * photonRing * (1.5 + u_bass * 4.0);

  // Black Hole Shadow (Pure singularity)
  if (r < horizon) {
    col = vec3(0.0);
  }

  // Deep space relativistic starfield
  vec2 starCoord = fract(lensedUV * 12.0) - 0.5;
  float star = smoothstep(0.08, 0.0, length(starCoord));
  float starTwinkle = fract(sin(dot(floor(lensedUV * 12.0), vec2(12.9898, 4.1414))) * 43758.5453);
  if (starTwinkle > 0.85 && r > horizon) {
    col += vec3(0.8, 0.9, 1.0) * star * (0.5 + u_mid) * u_param4;
  }

  fragColor = vec4(col, 1.0);
}
`
  },
  {
    id: 'outrun_sunset',
    name: '808 Synthwave Sunset',
    description: 'Retro 80s wireframe perspective horizon, equalizer mountain ridges, and glowing neon sun',
    category: 'retro',
    author: 'CachyPulse Team',
    isFactory: true,
    uniforms: {
      speed: 1.1,
      intensity: 1.3,
      bloom: 1.6,
      particleDensity: 0.9,
      param1: 0.45, // Sun radius
      param2: 1.0,  // Mountains roughness
      param3: 1.0,  // Grid speed
      param4: 1.2,  // Horizon height
      colorScheme: 'cyan-magenta'
    },
    fragmentShader: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_sub;
uniform float u_mid;
uniform float u_treble;
uniform float u_energy;
uniform float u_beat;
uniform float u_screen_idx;

uniform float u_speed;
uniform float u_intensity;
uniform float u_bloom;
uniform float u_param1;
uniform float u_param2;
uniform float u_param3;
uniform float u_param4;

uniform sampler2D u_fft_texture;
uniform sampler2D u_wave_texture;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  uv.x += (u_screen_idx - 1.0) * 0.4;
  float t = u_time * u_speed;

  vec3 col = vec3(0.04, 0.02, 0.1);

  // Gradient sunset sky
  float skyY = uv.y + 0.1;
  if (skyY > 0.0) {
    vec3 topSky = vec3(0.08, 0.02, 0.22);
    vec3 botSky = vec3(0.9, 0.1, 0.45);
    col = mix(botSky, topSky, pow(skyY, 0.6));
    
    // Retro Neon Sun with horizontal laser blinds
    vec2 sunPos = uv - vec2(0.0, 0.18);
    float sunDist = length(sunPos);
    float sunR = u_param1 * (1.0 + u_bass * 0.2);

    if (sunDist < sunR) {
      // Sun gradient: yellow top to hot pink bottom
      vec3 sunCol = mix(vec3(1.0, 0.1, 0.6), vec3(1.0, 0.9, 0.1), (sunPos.y / sunR + 1.0) * 0.5);
      
      // Horizontal laser blinds
      float blinds = fract(sunPos.y * 18.0 - t * 0.3);
      if (sunPos.y < 0.0 && blinds < 0.35 * (1.0 - sunPos.y / sunR)) {
        sunCol *= 0.0;
      }
      col = mix(col, sunCol, smoothstep(sunR, sunR - 0.02, sunDist));
    }
  }

  // Audio Equalizer Mountain silhouette on horizon
  float horizY = -0.05;
  if (uv.y > horizY - 0.05 && uv.y < 0.3) {
    float mX = abs(uv.x * 2.5);
    float fftM = texture(u_fft_texture, vec2(mX * 0.3, 0.5)).r;
    float mountainH = horizY + (sin(uv.x * 12.0) * 0.06 + cos(uv.x * 26.0) * 0.03 + fftM * 0.25 * u_param2);
    if (uv.y < mountainH) {
      col = mix(col, vec3(0.06, 0.01, 0.15), 0.95);
      // Glowing neon edge on mountain crest
      float crest = smoothstep(0.015, 0.0, abs(uv.y - mountainH));
      col += vec3(0.0, 0.9, 1.0) * crest * (1.0 + u_treble * 2.0);
    }
  }

  // Outrun Synth Grid floor (3D perspective)
  if (uv.y < horizY) {
    float depth = 0.25 / (horizY - uv.y);
    vec2 floorCoord = vec2(uv.x * depth, depth + t * 4.0 * u_param3);

    vec2 gridLines = abs(fract(floorCoord - 0.5) - 0.5) / fwidth(floorCoord);
    float line = min(gridLines.x, gridLines.y);
    float gridVal = 1.0 - min(line, 1.0);

    vec3 neonFloor = mix(vec3(1.0, 0.0, 0.6), vec3(0.0, 0.8, 1.0), sin(floorCoord.y * 0.2) * 0.5 + 0.5);
    neonFloor *= (1.0 + u_bass * 2.5 * u_intensity);

    float fog = clamp(1.0 - (depth * 0.08), 0.0, 1.0);
    col = mix(col, neonFloor, gridVal * fog * u_bloom);
  }

  fragColor = vec4(col, 1.0);
}
`
  },
  {
    id: 'liquid_nebula',
    name: 'Bioluminescent Liquid Nebula',
    description: 'Dynamic fluid metaball simulation with reactive audio turbulence and glowing filaments',
    category: 'liquid',
    author: 'CachyPulse Team',
    isFactory: true,
    uniforms: {
      speed: 0.9,
      intensity: 1.6,
      bloom: 1.7,
      particleDensity: 1.1,
      param1: 1.2, // Metaball count / complexity
      param2: 1.4, // Fluid turbulence
      param3: 0.8, // Color shift rate
      param4: 1.5, // Sub-bass impact
      colorScheme: 'aurora-violet'
    },
    fragmentShader: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_sub;
uniform float u_mid;
uniform float u_treble;
uniform float u_energy;
uniform float u_beat;
uniform float u_screen_idx;

uniform float u_speed;
uniform float u_intensity;
uniform float u_bloom;
uniform float u_param1;
uniform float u_param2;
uniform float u_param3;
uniform float u_param4;

uniform sampler2D u_fft_texture;
uniform sampler2D u_wave_texture;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  uv.x += (u_screen_idx - 1.0) * 0.5;

  float t = u_time * u_speed * 0.7;

  // Fluid turbulence warping
  for (float i = 1.0; i < 4.0; i++) {
    float wave = texture(u_wave_texture, vec2(i * 0.25, 0.5)).r - 0.5;
    uv.x += (0.15 / i) * sin(i * 3.0 * uv.y + t + wave * u_bass * u_param4);
    uv.y += (0.15 / i) * cos(i * 3.0 * uv.x + t * 0.8 + u_mid * 2.0);
  }

  // Metaballs potential field
  float field = 0.0;
  for (int j = 0; j < 6; j++) {
    float angle = float(j) * 1.047 + t * 0.4;
    float radius = 0.4 + sin(t * 0.6 + float(j)) * 0.2 + u_sub * 0.25;
    vec2 pos = vec2(cos(angle), sin(angle)) * radius;
    float dist = length(uv - pos);
    field += 0.05 / (dist * dist + 0.005);
  }

  // Audio frequency modulation
  float fftSample = texture(u_fft_texture, vec2(abs(uv.x) * 0.5, 0.5)).r;
  field *= (1.0 + fftSample * 2.0 * u_intensity);

  // Bioluminescent Color Palette
  vec3 col1 = vec3(0.0, 0.95, 0.85); // Emerald cyan
  vec3 col2 = vec3(0.65, 0.1, 0.95); // Deep violet
  vec3 col3 = vec3(1.0, 0.2, 0.6);  // Electric pink

  vec3 finalColor = mix(col1, col2, sin(field * 0.4 + t) * 0.5 + 0.5);
  finalColor = mix(finalColor, col3, sin(uv.y * 3.0 + t * 0.5) * 0.5 + 0.5);

  // Filament glow
  float glow = smoothstep(1.5, 6.0, field) * u_bloom;
  finalColor *= glow;

  // Add high frequency sparkle
  float sparkle = sin(uv.x * 50.0 + t) * sin(uv.y * 50.0 + t);
  if (sparkle > 0.95) {
    finalColor += vec3(1.0) * u_treble * 3.0;
  }

  fragColor = vec4(finalColor, 1.0);
}
`
  },
  {
    id: 'lissajous_laser',
    name: 'Quantum Lissajous Laser',
    description: '3D oscilloscope vector scan with harmonic beam curves and high-voltage phosphor glow',
    category: 'geometric',
    author: 'CachyPulse Team',
    isFactory: true,
    uniforms: {
      speed: 1.3,
      intensity: 1.8,
      bloom: 2.0,
      particleDensity: 0.8,
      param1: 3.0, // Frequency ratio X
      param2: 4.0, // Frequency ratio Y
      param3: 1.2, // Phase velocity
      param4: 1.0, // Glow decay
      colorScheme: 'emerald-matrix'
    },
    fragmentShader: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_sub;
uniform float u_mid;
uniform float u_treble;
uniform float u_energy;
uniform float u_beat;
uniform float u_screen_idx;

uniform float u_speed;
uniform float u_intensity;
uniform float u_bloom;
uniform float u_param1;
uniform float u_param2;
uniform float u_param3;
uniform float u_param4;

uniform sampler2D u_fft_texture;
uniform sampler2D u_wave_texture;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  uv.x += (u_screen_idx - 1.0) * 0.4;
  float t = u_time * u_speed;

  vec3 col = vec3(0.005, 0.015, 0.02);

  float minDist = 100.0;
  float samples = 120.0;

  // Sample Lissajous curve parametric trajectory
  float a = u_param1 + floor(u_mid * 3.0);
  float b = u_param2 + floor(u_bass * 2.0);
  float delta = t * u_param3 + (u_sub * 2.0);

  for (float i = 0.0; i < 1.0; i += 1.0 / 120.0) {
    float theta = i * 6.28318;
    
    // Waveform modulation
    float wave = (texture(u_wave_texture, vec2(i, 0.5)).r - 0.5) * u_bass * 0.4;
    
    vec2 p = vec2(
      sin(a * theta + delta),
      sin(b * theta)
    ) * (0.65 + wave);

    // 3D perspective rotation
    float pz = cos(theta * 2.0 + t);
    p /= (1.0 + pz * 0.25);

    float d = length(uv - p);
    if (d < minDist) {
      minDist = d;
    }
  }

  // Laser phosphor glow
  float beam = 0.006 / (minDist + 0.002);
  vec3 laserCol = mix(vec3(0.0, 1.0, 0.4), vec3(0.2, 0.8, 1.0), u_energy);
  laserCol = mix(laserCol, vec3(1.0, 1.0, 1.0), u_treble * 0.8);

  col += laserCol * beam * u_intensity * u_bloom;

  // CRT phosphor persistence scanlines
  float scanline = sin(gl_FragCoord.y * 1.5) * 0.08;
  col -= scanline;

  fragColor = vec4(col, 1.0);
}
`
  },
  {
    id: 'matrix_frequency',
    name: 'Quantum Spectrum Monoliths',
    description: 'Cascading matrix data rain with 3D audio-reactive equalizer columns and neon floor reflection',
    category: 'cyberpunk',
    author: 'CachyPulse Team',
    isFactory: true,
    uniforms: {
      speed: 1.0,
      intensity: 1.4,
      bloom: 1.5,
      particleDensity: 1.2,
      param1: 24.0, // Column density
      param2: 1.5,  // Column height gain
      param3: 1.0,  // Rain speed
      param4: 0.8,  // Floor reflectivity
      colorScheme: 'emerald-matrix'
    },
    fragmentShader: `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_sub;
uniform float u_mid;
uniform float u_treble;
uniform float u_energy;
uniform float u_beat;
uniform float u_screen_idx;

uniform float u_speed;
uniform float u_intensity;
uniform float u_bloom;
uniform float u_param1;
uniform float u_param2;
uniform float u_param3;
uniform float u_param4;

uniform sampler2D u_fft_texture;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  uv.x += (u_screen_idx - 1.0) * 0.45;
  float t = u_time * u_speed;

  vec3 col = vec3(0.01, 0.03, 0.02);

  // Equalizer spectrum columns
  float numCols = u_param1;
  float colWidth = 1.0 / numCols;
  float colIdx = floor((uv.x + 0.8) / colWidth);
  float normCol = colIdx / numCols;

  if (normCol >= 0.0 && normCol <= 1.0) {
    float fft = texture(u_fft_texture, vec2(normCol * 0.7, 0.5)).r;
    float colHeight = (0.05 + fft * 0.8 * u_param2) * (1.0 + (normCol < 0.2 ? u_bass : u_mid));
    
    float localX = fract((uv.x + 0.8) / colWidth) - 0.5;

    // Tower volume
    if (abs(localX) < 0.38 && uv.y > -0.35 && uv.y < -0.35 + colHeight) {
      float yNorm = (uv.y + 0.35) / colHeight;
      vec3 towerColor = mix(vec3(0.0, 0.8, 0.3), vec3(0.1, 1.0, 0.9), yNorm);
      if (yNorm > 0.85) {
        towerColor = vec3(1.0, 0.9, 0.2); // Peak cap indicator
      }
      col = towerColor * (1.2 + u_energy * 1.5) * u_bloom;
    }

    // Floor reflections
    if (uv.y < -0.35 && uv.y > -0.35 - (colHeight * 0.4)) {
      float reflY = -0.35 - (uv.y + 0.35);
      float yNorm = reflY / colHeight;
      vec3 reflColor = mix(vec3(0.0, 0.5, 0.2), vec3(0.0, 0.8, 0.5), yNorm) * 0.35;
      col += reflColor * u_param4;
    }
  }

  // Digital Rain / Matrix Glyphs stream
  vec2 rainUV = uv * 30.0;
  rainUV.y += t * 15.0 * u_param3;
  float charNoise = fract(sin(dot(floor(rainUV), vec2(12.9898, 78.233))) * 43758.5453);
  if (charNoise > 0.88 && uv.y > 0.1) {
    float charBright = fract(rainUV.y) * u_treble * 2.5;
    col += vec3(0.2, 1.0, 0.4) * charBright;
  }

  fragColor = vec4(col, 1.0);
}
`
  }
];

const PRESET_STORAGE_KEY = 'cachypulse_custom_presets_v1';

export function loadAllPresets(): VisualizerPreset[] {
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    if (stored) {
      const parsed: VisualizerPreset[] = JSON.parse(stored);
      // Combine factory and custom presets
      const customList = parsed.filter(p => !p.isFactory);
      return [...FACTORY_PRESETS, ...customList];
    }
  } catch (e) {
    console.error('Error loading stored presets:', e);
  }
  return [...FACTORY_PRESETS];
}

export function saveCustomPreset(preset: VisualizerPreset): VisualizerPreset[] {
  const current = loadAllPresets();
  const existingIdx = current.findIndex(p => p.id === preset.id);

  let updated: VisualizerPreset[];
  const toSave = { ...preset, isFactory: false };

  if (existingIdx >= 0 && !current[existingIdx].isFactory) {
    updated = [...current];
    updated[existingIdx] = toSave;
  } else {
    // If id conflicts with factory or new, give unique id
    if (existingIdx >= 0) {
      toSave.id = `${preset.id}_copy_${Date.now()}`;
      toSave.name = `${preset.name} (Custom)`;
    }
    updated = [...current, toSave];
  }

  try {
    const customOnly = updated.filter(p => !p.isFactory);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(customOnly));
  } catch (e) {
    console.error('Failed to save preset to localStorage:', e);
  }

  return updated;
}

export function deleteCustomPreset(id: string): VisualizerPreset[] {
  const current = loadAllPresets();
  const updated = current.filter(p => p.id !== id || p.isFactory);

  try {
    const customOnly = updated.filter(p => !p.isFactory);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(customOnly));
  } catch (e) {
    console.error('Failed to delete preset from localStorage:', e);
  }

  return updated;
}

export function exportPresetsToJson(presets: VisualizerPreset[]): string {
  return JSON.stringify(presets, null, 2);
}

export function validateAndImportPresets(jsonString: string): VisualizerPreset[] {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) {
    throw new Error('Preset file must contain a JSON array of presets');
  }

  for (const item of parsed) {
    if (!item.id || !item.name || !item.fragmentShader) {
      throw new Error('Invalid preset structure: missing id, name, or fragmentShader');
    }
  }

  // Save imported presets
  for (const item of parsed) {
    saveCustomPreset({
      ...item,
      id: `imported_${item.id}_${Date.now()}`,
      isFactory: false
    });
  }

  return loadAllPresets();
}
