import { Track, AudioEffect } from '../types';

export class AudioEngine {
  private context: AudioContext;
  private masterGain: GainNode;
  private trackNodes: Map<string, {
    source: AudioBufferSourceNode | MediaElementAudioSourceNode;
    gain: GainNode;
    pan: StereoPannerNode;
    effects: AudioNode[];
  }> = new Map();

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
  }

  async loadAudio(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.context.decodeAudioData(arrayBuffer);
  }

  createTrackStream(stream: MediaStream): MediaStreamAudioSourceNode {
    return this.context.createMediaStreamSource(stream);
  }

  resume() {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  get currentTime() {
    return this.context.currentTime;
  }

  // Simplified effect creation
  createEffect(effect: AudioEffect): AudioNode {
    switch (effect.type) {
      case 'reverb':
        const reverb = this.context.createConvolver();
        // In a real app, load an impulse response
        return reverb;
      case 'eq':
        return this.context.createBiquadFilter();
      case 'compressor':
        return this.context.createDynamicsCompressor();
      default:
        return this.context.createGain();
    }
  }
}

export const audioEngine = new AudioEngine();
