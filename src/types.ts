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
  id?: string;
  name?: string;
  driveFileId?: string;
  isPlaying: boolean;
  isRecording: boolean;
  currentTime: number;
  duration: number;
  bpm: number;
  zoom: number;
  metronomeEnabled: boolean;
  tracks: Track[];
  selectedTrackId: string | null;
  lyrics?: string;
  key: string;
  snap: '1/4' | '1/8' | '1/16' | '1/32';
}

export type MasterPreset = 'Pop' | 'Trap' | 'Rock' | 'Sertanejo' | 'Lo-Fi' | 'Electronic' | 'Rap' | 'Hip Hop' | 'None';
