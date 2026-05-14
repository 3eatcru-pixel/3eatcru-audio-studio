import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Volume2, Save, Play, Square, Keyboard } from 'lucide-react';
import { Track, MidiNote } from '../types';
import { cn, generateId } from '../lib/utils';

interface MidiEditorProps {
  track: Track;
  snap: '1/4' | '1/8' | '1/16' | '1/32';
  bpm: number;
  onUpdateNotes: (notes: any[]) => void;
  scale?: string;
  rootKey?: string;
}

const SCALES: Record<string, number[]> = {
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Minor': [0, 2, 3, 5, 7, 8, 10],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Blues': [0, 3, 5, 6, 7, 10],
};

const KEY_OFFSETS: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};

const OCTAVES = 6;
const PITCHES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];
const NOTES = Array.from({ length: OCTAVES }).flatMap((_, i) => 
  PITCHES.map(p => `${p}${OCTAVES - i}`)
);

export function MidiEditor({ track, snap, bpm, onUpdateNotes, scale = 'Major', rootKey = 'C' }: MidiEditorProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const isInScale = (noteName: string) => {
    const key = noteName.replace(/\d/, '');
    const notePos = KEY_OFFSETS[key] ?? 0;
    const rootPos = KEY_OFFSETS[rootKey] ?? 0;
    const relativePos = (notePos - rootPos + 12) % 12;
    return SCALES[scale]?.includes(relativePos) ?? true;
  };

  const getFrequency = (pitch: string) => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = parseInt(pitch.slice(-1));
    const key = pitch.slice(0, -1);
    const n = notes.indexOf(key);
    return 440 * Math.pow(2, (n - 9 + (octave - 4) * 12) / 12);
  };

  const previewNote = (pitch: string) => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.setValueAtTime(getFrequency(pitch), ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const getSnapValue = () => {
    switch (snap) {
      case '1/4': return 1/1;
      case '1/8': return 1/2;
      case '1/16': return 1/4;
      case '1/32': return 1/8;
      default: return 1/4;
    }
  };

  const addNote = (pitch: string, time: number) => {
    const snapVal = getSnapValue();
    const snappedTime = Math.floor(time / snapVal) * snapVal;
    
    const newNote: MidiNote = {
      id: generateId(),
      pitch,
      time: snappedTime,
      duration: snapVal,
      velocity: 0.8
    };
    onUpdateNotes([...(track.notes || []), newNote]);
    setSelectedNoteId(newNote.id);
    previewNote(pitch);
  };

  const removeNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNotes((track.notes || []).filter(n => n.id !== id));
    if (selectedNoteId === id) setSelectedNoteId(null);
  };

  const selectedNote = track.notes?.find(n => n.id === selectedNoteId);

  return (
    <div className="flex flex-col h-full bg-studio-bg overflow-hidden border border-studio-border rounded-lg shadow-inner">
      {/* Piano Roll Header Controls */}
      <div className="h-10 border-b border-studio-border flex justify-between items-center px-4 bg-studio-panel/50">
         <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
               <Keyboard size={14} className="text-studio-accent" />
               <span className="text-[10px] font-black uppercase tracking-widest">{track.name}</span>
            </div>
            <div className="h-4 w-px bg-studio-border" />
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-bold text-studio-muted uppercase">Selection:</span>
               <span className="text-[9px] font-mono text-studio-accent">{selectedNote ? `${selectedNote.pitch} at ${selectedNote.time.toFixed(2)}` : 'None'}</span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            {selectedNote && (
               <motion.button 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={(e) => removeNote(selectedNote.id, e as any)}
                className="text-[9px] font-bold text-studio-record hover:brightness-110 flex items-center gap-1 uppercase"
              >
                <Trash2 size={12} /> Delete Note
              </motion.button>
            )}
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Piano Keys Sidebar */}
        <div className="w-20 border-r border-studio-border bg-studio-panel overflow-y-auto scrollbar-none flex flex-col pt-4 pb-12">
          {NOTES.map((note, pitchIndex) => (
            <div 
              key={note}
              onClick={() => previewNote(note)}
              className={cn(
                "h-6 shrink-0 border-b border-studio-border flex items-center justify-between px-2 text-[10px] font-bold transition-all select-none hover:brightness-110 cursor-pointer",
                note.includes('#') ? "bg-studio-bg text-studio-muted" : "bg-white text-black active:bg-studio-accent",
                !isInScale(note) && "opacity-20 grayscale brightness-50"
              )}
            >
              <span className="opacity-50">{note.replace(/\d/, '')}</span>
              <span>{note.match(/\d/)}</span>
            </div>
          ))}
        </div>

        {/* Piano Roll Grid */}
        <div 
          ref={gridRef}
          className="flex-1 overflow-auto relative cursor-crosshair bg-studio-bg group"
          style={{
            backgroundImage: `
              linear-gradient(to right, #2c2e33 1px, transparent 1px), 
              linear-gradient(to bottom, #2c2e33 1px, transparent 1px)
            `,
            backgroundSize: `40px 24px`,
            height: `${NOTES.length * 24}px`
          }}
          onClick={(e) => {
            if (e.target === gridRef.current) {
              const rect = gridRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left + gridRef.current.scrollLeft;
              const y = e.clientY - rect.top + gridRef.current.scrollTop;
              const time = x / 160; 
              const pitchIndex = Math.floor(y / 24);
              if (NOTES[pitchIndex]) {
                addNote(NOTES[pitchIndex], time);
              }
            } else {
                setSelectedNoteId(null);
            }
          }}
        >
          {/* Scale Guidance Background Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {NOTES.map((note, i) => !isInScale(note) && (
              <div 
                key={i} 
                className="absolute w-full bg-black/10" 
                style={{ top: i * 24, height: 24 }} 
              />
            ))}
          </div>
          {/* Velocity/Duration visual guide lines every beat */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
             {Array.from({ length: 100 }).map((_, i) => (
               <div key={i} className="absolute top-0 bottom-0 border-l border-white" style={{ left: `${i * 160}px` }} />
             ))}
          </div>

          {track.notes?.map(note => {
            const pitchIndex = NOTES.indexOf(note.pitch);
            const isNoteSelected = selectedNoteId === note.id;
            
            return (
              <motion.div
                key={note.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "absolute h-5 my-[2px] rounded-sm transition-all shadow-md group/note flex items-center px-1 border border-white/20 select-none",
                  isNoteSelected ? "bg-studio-accent z-20 shadow-studio-accent/30" : "bg-studio-accent/60 hover:bg-studio-accent/80"
                )}
                style={{
                  left: `${note.time * 160}px`,
                  top: `${pitchIndex * 24}px`,
                  width: `${note.duration * 160}px`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNoteId(note.id);
                }}
                onMouseDown={(e) => {
                   // Implement Move logic later
                }}
              >
                <div className="text-[7px] font-black text-white/50 pointer-events-none truncate uppercase">{note.pitch}</div>
                {isNoteSelected && (
                  <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/20 hover:bg-white/40" 
                    onMouseDown={(e) => {
                       e.stopPropagation();
                       const startX = e.clientX;
                       const startDur = note.duration;
                       const handleMove = (me: MouseEvent) => {
                          const delta = (me.clientX - startX) / 160;
                          const newDur = Math.max(0.05, startDur + delta);
                          onUpdateNotes(track.notes!.map(n => n.id === note.id ? { ...n, duration: newDur } : n));
                       };
                       const handleUp = () => {
                          document.removeEventListener('mousemove', handleMove);
                          document.removeEventListener('mouseup', handleUp);
                       };
                       document.addEventListener('mousemove', handleMove);
                       document.addEventListener('mouseup', handleUp);
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function isSelected(noteId: string, selectedId: string | null) {
  return noteId === selectedId;
}
