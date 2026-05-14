/**
 * Core Audio Engine for AURA.
 * Manages the Web Audio API graph and playback state.
 */
class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private trackNodes: Map<string, { 
    source: AudioBufferSourceNode | null, 
    gain: GainNode,
    analyser: AnalyserNode 
  }> = new Map();

  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordStream: MediaStream | null = null;

  init() {
    if (this.context) return;
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.context.createGain();
    
    this.masterAnalyser = this.context.createAnalyser();
    this.masterAnalyser.fftSize = 1024;

    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.context.destination);
  }

  async decodeAudio(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.context) this.init();
    return await this.context!.decodeAudioData(arrayBuffer);
  }

  setupTrack(trackId: string) {
    if (this.trackNodes.has(trackId)) return;
    if (!this.context || !this.masterGain) this.init();
    
    const gainNode = this.context!.createGain();
    const analyserNode = this.context!.createAnalyser();
    analyserNode.fftSize = 256;

    gainNode.connect(analyserNode);
    analyserNode.connect(this.masterGain!);
    
    this.trackNodes.set(trackId, { 
      source: null, 
      gain: gainNode, 
      analyser: analyserNode 
    });
  }

  async startRecording(trackId: string): Promise<void> {
    if (!this.context) this.init();
    
    try {
      this.recordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.context!.createMediaStreamSource(this.recordStream);
      
      // Conecta o input ao analyser da track para feedback visual no Mixer
      const nodes = this.trackNodes.get(trackId);
      if (nodes) {
        source.connect(nodes.gain);
      }

      this.recorder = new MediaRecorder(this.recordStream);
      this.recordedChunks = [];

      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.recorder.start();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      throw err;
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.recorder) return;
      this.recorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/wav' });
        this.recordStream?.getTracks().forEach(t => t.stop());
        resolve(blob);
      };
      this.recorder.stop();
    });
  }

  updateTrackVolume(trackId: string, volume: number) {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      nodes.gain.gain.setTargetAtTime(volume, this.context!.currentTime, 0.02);
    }
  }

  getTrackLevel(trackId?: string): number {
    const nodes = trackId ? this.trackNodes.get(trackId) : null;
    const analyser = trackId ? nodes?.analyser : this.masterAnalyser;

    if (!analyser) return 0;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] - 128) / 128;
      sum += v * v;
    }
    // RMS calculation
    const rms = Math.sqrt(sum / dataArray.length);
    // Simple scaling for visualization (boosted to be visible)
    return Math.min(rms * 5, 1);
  }

  async playBuffer(trackId: string, buffer: AudioBuffer, startTime: number = 0) {
    if (!this.context) this.init();
    if (this.context!.state === 'suspended') await this.context!.resume();

    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return;

    if (nodes.source) nodes.source.stop();
    
    const source = this.context!.createBufferSource();
    source.buffer = buffer;
    source.connect(nodes.gain);
    source.start(0, startTime);
    nodes.source = source;
  }

  getContext() { return this.context; }
}

export const audioEngine = new AudioEngine();