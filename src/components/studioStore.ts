import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { Track, StudioState, MasterPreset, MidiNote } from '../types';
import { generateId } from '../lib/utils';

interface StudioStore extends StudioState {
  // Actions to modify the state
  updateStudioState: (updates: Partial<StudioState>) => void;
  addTrack: (type: 'instrumental' | 'vocal' | 'midi' | 'drum' | 'sampler' | 'synth', name?: string) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  setSelectedTrackId: (id: string | null) => void;
  togglePlayback: () => void;
  toggleRecording: () => void;
  setLyrics: (lyrics: string) => void;
  setBpm: (bpm: number) => void;
  setKey: (key: string) => void;
  setSnap: (snap: '1/4' | '1/8' | '1/16' | '1/32') => void;
  setZoom: (zoom: number) => void;
  setMasterPreset: (preset: MasterPreset) => void;
  resetState: () => void;
  // For undo/redo, we'll manage it externally for now or use a specific middleware
  // For simplicity, the undo/redo logic will remain in Studio.tsx for this step.
}

const initialStudioState: StudioState = {
  isPlaying: false,
  isRecording: false,
  currentTime: 0,
  duration: 0,
  metronomeEnabled: false,
  tracks: [
    {
      id: 'track-1',
      name: 'Instrumental Base',
      type: 'instrumental',
      url: null,
      volume: 0.8,
      pan: 0,
      muted: false,
      soloed: false,
      effects: [],
      color: '#3b82f6',
      startTime: 0,
      eqHigh: 0,
      eqMid: 0,
      eqLow: 0,
      compThreshold: 0,
      sendA: 0,
      sendB: 0
    },
    {
      id: 'track-vocal',
      name: 'Main Vocal',
      type: 'vocal',
      url: null,
      volume: 1.0,
      pan: 0,
      muted: false,
      soloed: false,
      effects: [
        {
          id: `vocal-tune-${Date.now()}`,
          name: 'Auto-Tune Pro',
          type: 'vocal-tune',
          category: 'Pitch',
          enabled: true,
          params: {
            retuneSpeed: 20,
            pitchAmount: 100
          }
        }
      ],
      color: '#f472b6',
      startTime: 0,
      eqHigh: 2,
      eqMid: -1,
      eqLow: -3,
      compThreshold: -15,
      sendA: 0.2,
      sendB: 0.1
    }
  ],
  selectedTrackId: 'track-1',
  zoom: 50,
  lyrics: '',
  bpm: 128,
  key: 'C Major',
  snap: '1/16'
};

export const useStudioStore = create<StudioStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialStudioState,
        updateStudioState: (updates) => set((state) => ({ ...state, ...updates })),
        addTrack: (type, name) => {
          const newTrack: Track = {
            id: generateId(),
            name: name || (
                  type === 'vocal' ? `Vocal ${get().tracks.filter(t => t.type === 'vocal').length + 1}` : 
                  type === 'midi' ? `Piano ${get().tracks.filter(t => t.type === 'midi').length + 1}` :
                  type === 'drum' ? `Drum Machine ${get().tracks.filter(t => t.type === 'drum').length + 1}` :
                  type === 'sampler' ? `Sampler ${get().tracks.filter(t => t.type === 'sampler').length + 1}` :
                  type === 'synth' ? `Analog Synth ${get().tracks.filter(t => t.type === 'synth').length + 1}` : 'New Track'),
            type: type,
            url: null,
            volume: 0.8,
            pan: 0,
            muted: false,
            soloed: false,
            effects: [],
            color: type === 'vocal' ? '#ef4444' : type === 'midi' ? '#a855f7' : type === 'drum' ? '#f59e0b' : type === 'sampler' ? '#ec4899' : type === 'synth' ? '#10b981' : '#3b82f6',
            startTime: 0,
            notes: (type === 'midi' || type === 'drum' || type === 'sampler' || type === 'synth') ? [] : undefined,
            instrument: type === 'midi' ? 'Piano' : type === 'drum' ? '808 Kit' : type === 'sampler' ? 'Sampler Pro' : type === 'synth' ? 'Lead Synth' : undefined,
            eqHigh: 0,
            eqMid: 0,
            eqLow: 0,
            compThreshold: 0,
            sendA: 0,
            sendB: 0
          };
          set((state) => ({
            tracks: [...state.tracks, newTrack],
            selectedTrackId: newTrack.id
          }));
        },
        removeTrack: (id) => set((state) => ({
          tracks: state.tracks.filter(t => t.id !== id),
          selectedTrackId: state.selectedTrackId === id ? (state.tracks[0]?.id || null) : state.selectedTrackId
        })),
        updateTrack: (id, updates) => set((state) => ({
          tracks: state.tracks.map(t => t.id === id ? { ...t, ...updates } : t)
        })),
        setSelectedTrackId: (id) => set({ selectedTrackId: id }),
        togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
        toggleRecording: () => set((state) => ({ isRecording: !state.isRecording })),
        setLyrics: (lyrics) => set({ lyrics }),
        setBpm: (bpm) => set({ bpm }),
        setKey: (key) => set({ key }),
        setSnap: (snap) => set({ snap }),
        setZoom: (zoom) => set({ zoom }),
        setMasterPreset: (preset) => set({ masterPreset: preset }),
        resetState: () => set(initialStudioState),
      }),
      {
        name: 'aura-studio-storage', // name of the item in localStorage
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(([key]) => !['isRecording', 'isPlaying', 'currentTime'].includes(key))
          ),
      }
    ),
    { name: 'AuraStudioStore' }
  )
);