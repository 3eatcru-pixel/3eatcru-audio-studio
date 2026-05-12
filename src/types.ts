export interface Track {
  id: string;
  name: string;
  type: 'instrumental' | 'vocal' | 'midi' | 'drum' | 'sampler' | 'synth';
  url: string | null;
  blob?: Blob;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  effects: AudioEffect[];
  color: string;
  startTime: number;
  notes?: MidiNote[];
  instrument?: string;
  eqHigh?: number;
  eqMid?: number;
  eqLow?: number;
  compThreshold?: number;
  sendB?: number;
  sendA?: number;
}

export interface MidiNote {
  id: string;
  pitch: string;
  time: number;
  duration: number;
  velocity: number;
}

export interface AudioEffect {
  id: string;
  name: string;
  type: string;
  category?: string;
  enabled: boolean;
  params: Record<string, number | string>;
}

export interface StudioState {
  isPlaying: boolean;
  isRecording: boolean;
  currentTime: number;
  duration: number;
  bpm: number;
  zoom: number;
  metronomeEnabled: boolean;
  tracks: Track[];
  selectedTrackId: string | null;
}

export type MasterPreset = 'Pop' | 'Trap' | 'Rock' | 'Sertanejo' | 'Lo-Fi' | 'Electronic';
