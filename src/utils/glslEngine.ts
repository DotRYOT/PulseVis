import { AudioAnalysisData, ShaderUniforms } from '../types/visualizer';

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FALLBACK_ERROR_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform float u_time;

void main() {
  vec2 grid = abs(fract(v_uv * 16.0) - 0.5);
  float line = min(grid.x, grid.y);
  float pattern = step(0.05, line);
  vec3 bg = mix(vec3(0.4, 0.05, 0.05), vec3(0.1, 0.02, 0.02), v_uv.y);
  vec3 gridLine = vec3(1.0, 0.2, 0.2);
  fragColor = vec4(mix(gridLine, bg, pattern), 1.0);
}
`;

export interface ShaderCompilationResult {
  success: boolean;
  error?: string;
  errorLine?: number;
}

export class GLSLVisualizerRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private positionBuffer: WebGLBuffer | null = null;

  // Textures for audio data
  private fftTexture: WebGLTexture | null = null;
  private waveTexture: WebGLTexture | null = null;

  // Uniform locations cache
  private uniformLocations: Map<string, WebGLUniformLocation | null> = new Map();

  private startTime = performance.now();
  public currentShaderSource = '';
  public lastCompileResult: ShaderCompilationResult = { success: true };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initGL();
  }

  private initGL() {
    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Allows canvas captureStream & video recording!
    });

    if (!gl) {
      console.error('WebGL2 not supported on this browser or platform');
      return;
    }
    this.gl = gl;

    // Set up full screen quad
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // Setup textures for 1D audio data
    this.fftTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fftTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.waveTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.waveTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  public compileShader(fragmentSource: string): ShaderCompilationResult {
    if (!this.gl) return { success: false, error: 'WebGL2 context unavailable' };
    const gl = this.gl;

    // Compile Vertex Shader
    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) return { success: false, error: 'Failed to create vertex shader' };
    gl.shaderSource(vs, VERTEX_SHADER_SOURCE);
    gl.compileShader(vs);

    // Compile Fragment Shader
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) return { success: false, error: 'Failed to create fragment shader' };
    gl.shaderSource(fs, fragmentSource);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(fs) || 'Unknown compilation error';
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      // Parse error line number e.g. "ERROR: 0:42: 'x' : undeclared identifier"
      let errorLine: number | undefined;
      const match = info.match(/ERROR:\s*\d+:(\d+)/);
      if (match && match[1]) {
        errorLine = parseInt(match[1], 10);
      }

      this.lastCompileResult = { success: false, error: info, errorLine };
      return this.lastCompileResult;
    }

    // Link Program
    const newProgram = gl.createProgram();
    if (!newProgram) return { success: false, error: 'Failed to create WebGL program' };
    gl.attachShader(newProgram, vs);
    gl.attachShader(newProgram, fs);
    gl.linkProgram(newProgram);

    if (!gl.getProgramParameter(newProgram, gl.LINK_STATUS)) {
      const linkInfo = gl.getProgramInfoLog(newProgram) || 'Program link failed';
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(newProgram);
      this.lastCompileResult = { success: false, error: linkInfo };
      return this.lastCompileResult;
    }

    // Free shaders once linked
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (this.program) {
      gl.deleteProgram(this.program);
    }
    this.program = newProgram;
    this.currentShaderSource = fragmentSource;
    this.uniformLocations.clear();

    // Re-bind position attribute to VAO
    gl.useProgram(this.program);
    const posAttrib = gl.getAttribLocation(this.program, 'a_position');
    if (posAttrib >= 0) {
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.enableVertexAttribArray(posAttrib);
      gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);
    }

    this.lastCompileResult = { success: true };
    return this.lastCompileResult;
  }

  private getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.gl || !this.program) return null;
    if (this.uniformLocations.has(name)) {
      return this.uniformLocations.get(name)!;
    }
    const loc = this.gl.getUniformLocation(this.program, name);
    this.uniformLocations.set(name, loc);
    return loc;
  }

  public render(
    audio: AudioAnalysisData,
    uniforms: ShaderUniforms,
    screenIndex: number = 0,
    totalScreens: number = 3,
    customSensitivity: number = 1.0,
    customZoom: number = 1.0
  ) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    const width = this.canvas.width;
    const height = this.canvas.height;
    gl.viewport(0, 0, width, height);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const elapsed = (performance.now() - this.startTime) / 1000.0;

    // Upload audio textures
    // 1. FFT texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fftTexture);
    const fftLen = audio.fftData.length || 512;
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      fftLen,
      1,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      audio.fftData
    );

    // 2. Wave texture
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.waveTexture);
    const waveLen = audio.waveData.length || 512;
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      waveLen,
      1,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      audio.waveData
    );

    // Pass textures to uniforms
    const uFftLoc = this.getUniformLocation('u_fft_texture');
    if (uFftLoc) gl.uniform1i(uFftLoc, 0);

    const uWaveLoc = this.getUniformLocation('u_wave_texture');
    if (uWaveLoc) gl.uniform1i(uWaveLoc, 1);

    // Standard timing and screen coordinates
    const uTimeLoc = this.getUniformLocation('u_time');
    if (uTimeLoc) gl.uniform1f(uTimeLoc, elapsed);

    const uResLoc = this.getUniformLocation('u_resolution');
    if (uResLoc) gl.uniform2f(uResLoc, width, height);

    // Audio reactive uniforms
    const sens = customSensitivity;
    const uBassLoc = this.getUniformLocation('u_bass');
    if (uBassLoc) gl.uniform1f(uBassLoc, Math.min(1.0, audio.bass * sens));

    const uSubLoc = this.getUniformLocation('u_sub');
    if (uSubLoc) gl.uniform1f(uSubLoc, Math.min(1.0, audio.subBass * sens));

    const uMidLoc = this.getUniformLocation('u_mid');
    if (uMidLoc) gl.uniform1f(uMidLoc, Math.min(1.0, audio.mid * sens));

    const uTrebleLoc = this.getUniformLocation('u_treble');
    if (uTrebleLoc) gl.uniform1f(uTrebleLoc, Math.min(1.0, audio.treble * sens));

    const uEnergyLoc = this.getUniformLocation('u_energy');
    if (uEnergyLoc) gl.uniform1f(uEnergyLoc, Math.min(1.0, audio.rms * sens));

    const uBeatLoc = this.getUniformLocation('u_beat');
    if (uBeatLoc) gl.uniform1f(uBeatLoc, audio.beatDetected ? 1.0 : 0.0);

    // Multi-Monitor specific parameters
    const uScreenIdxLoc = this.getUniformLocation('u_screen_idx');
    if (uScreenIdxLoc) gl.uniform1f(uScreenIdxLoc, screenIndex);

    const uTotalScreensLoc = this.getUniformLocation('u_total_screens');
    if (uTotalScreensLoc) gl.uniform1f(uTotalScreensLoc, totalScreens);

    // Preset uniforms
    const uSpeedLoc = this.getUniformLocation('u_speed');
    if (uSpeedLoc) gl.uniform1f(uSpeedLoc, uniforms.speed);

    const uIntensityLoc = this.getUniformLocation('u_intensity');
    if (uIntensityLoc) gl.uniform1f(uIntensityLoc, uniforms.intensity);

    const uBloomLoc = this.getUniformLocation('u_bloom');
    if (uBloomLoc) gl.uniform1f(uBloomLoc, uniforms.bloom);

    const uParam1 = this.getUniformLocation('u_param1');
    if (uParam1) gl.uniform1f(uParam1, uniforms.param1 * customZoom);

    const uParam2 = this.getUniformLocation('u_param2');
    if (uParam2) gl.uniform1f(uParam2, uniforms.param2);

    const uParam3 = this.getUniformLocation('u_param3');
    if (uParam3) gl.uniform1f(uParam3, uniforms.param3);

    const uParam4 = this.getUniformLocation('u_param4');
    if (uParam4) gl.uniform1f(uParam4, uniforms.param4);

    // Draw full screen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public destroy() {
    if (!this.gl) return;
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.fftTexture) gl.deleteTexture(this.fftTexture);
    if (this.waveTexture) gl.deleteTexture(this.waveTexture);
    this.program = null;
    this.gl = null;
  }
}
