import { ExportSettings } from '../types/visualizer';

export class HardwareVideoExporter {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording = false;
  public recordStartTime = 0;

  public static getSupportedCodecs(): Array<{ id: 'vp9' | 'h264' | 'av1'; label: string; mimeType: string }> {
    const list: Array<{ id: 'vp9' | 'h264' | 'av1'; label: string; mimeType: string }> = [];

    // Check VP9 (supported broadly with VA-API / NVENC hardware acceleration)
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      list.push({ id: 'vp9', label: 'VP9 Hardware-Accelerated (WebM)', mimeType: 'video/webm;codecs=vp9,opus' });
    } else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      list.push({ id: 'vp9', label: 'VP9 Hardware-Accelerated (WebM)', mimeType: 'video/webm;codecs=vp9' });
    }

    // Check H.264 / AVC
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
      list.push({ id: 'h264', label: 'H.264 / AVC Hardware-Accelerated (WebM/MP4)', mimeType: 'video/webm;codecs=h264,opus' });
    } else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      list.push({ id: 'h264', label: 'H.264 / AVC (MP4)', mimeType: 'video/mp4;codecs=avc1' });
    }

    // Check AV1
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=av01')) {
      list.push({ id: 'av1', label: 'AV1 Next-Gen (WebM)', mimeType: 'video/webm;codecs=av01' });
    }

    // Default fallback
    if (list.length === 0) {
      list.push({ id: 'vp9', label: 'Default Browser Video Stream', mimeType: 'video/webm' });
    }

    return list;
  }

  public startRecording(
    canvas: HTMLCanvasElement,
    audioStream: MediaStream | null,
    settings: ExportSettings,
    onFinish: (blob: Blob, url: string) => void,
    onError: (err: any) => void
  ) {
    try {
      this.recordedChunks = [];
      const canvasStream = canvas.captureStream(settings.fps);

      // Merge audio track if requested
      let combinedStream = canvasStream;
      if (settings.includeAudio && audioStream && audioStream.getAudioTracks().length > 0) {
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioStream.getAudioTracks()
        ]);
      }

      const supported = HardwareVideoExporter.getSupportedCodecs();
      const chosen = supported.find(c => c.id === settings.codec) || supported[0];

      const options: MediaRecorderOptions = {
        mimeType: chosen.mimeType,
        videoBitsPerSecond: settings.bitrateMbps * 1000 * 1000
      };

      this.mediaRecorder = new MediaRecorder(combinedStream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        const blob = new Blob(this.recordedChunks, { type: chosen.mimeType });
        const url = URL.createObjectURL(blob);
        onFinish(blob, url);
      };

      this.mediaRecorder.start(250); // Emit chunk every 250ms
      this.isRecording = true;
      this.recordStartTime = performance.now();

      // Automatically stop after duration if configured
      if (settings.durationSeconds > 0) {
        setTimeout(() => {
          if (this.isRecording) {
            this.stopRecording();
          }
        }, settings.durationSeconds * 1000);
      }
    } catch (err) {
      this.isRecording = false;
      onError(err);
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
  }
}

export const hardwareVideoExporter = new HardwareVideoExporter();
