import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Volume2, Save, Play, Square } from 'lucide-react';
import { Track, MidiNote } from '../types';
import { cn, generateId } from '../lib/utils';

interface MidiEditorProps {
  track: Track;
  onUpdateNotes: (notes: MidiNote[]) => void;
}

const OCTAVES = 5;
const PITCHES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];
const NOTES = Array.from({ length: OCTAVES }).flatMap((_, i) => 
  PITCHES.map(p => `${p}${OCTAVES - i}`)
);

export function MidiEditor({ track, onUpdateNotes }: MidiEditorProps) {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const addNote = (pitch: string, time: number) => {
    const newNote: MidiNote = {
      id: generateId(),
      pitch,
      time,
      duration: 0.5,
      velocity: 0.8
    };
    onUpdateNotes([...(track.notes || []), newNote]);
  };

  const removeNote = (id: string) => {
    onUpdateNotes((track.notes || []).filter(n => n.id !== id));
  };

  return (
    <div className="flex h-full bg-studio-bg overflow-hidden border border-studio-border rounded-lg">
      {/* Piano Keys Sidebar */}
      <div className="w-16 border-r border-studio-border bg-studio-panel overflow-y-auto hide-scrollbar">
        {NOTES.map(note => (
          <div 
            key={note}
            className={cn(
              "h-8 border-b border-studio-border flex items-center justify-end pr-2 text-[10px] font-bold transition-colors",
              note.includes('#') ? "bg-studio-bg text-studio-muted" : "bg-white text-black active:bg-studio-accent"
            )}
          >
            {note}
          </div>
        ))}
      </div>

      {/* Piano Roll Grid */}
      <div 
        ref={gridRef}
        className="flex-1 overflow-auto relative bg-[linear-gradient(to_right,#2c2e33_1px,transparent_1px),linear-gradient(to_bottom,#2c2e33_1px,transparent_1px)] bg-[size:40px_32px]"
        onClick={(e) => {
          if (e.target === gridRef.current) {
            const rect = gridRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left + gridRef.current.scrollLeft;
            const y = e.clientY - rect.top + gridRef.current.scrollTop;
            const time = Math.floor(x / 40) * 0.25;
            const pitchIndex = Math.floor(y / 32);
            if (NOTES[pitchIndex]) {
              addNote(NOTES[pitchIndex], time);
            }
          }
        }}
      >
        {track.notes?.map(note => {
          const pitchIndex = NOTES.indexOf(note.pitch);
          return (
            <motion.div
              key={note.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "absolute h-7 rounded shadow-lg cursor-move flex items-center justify-end px-1 border border-white/20",
                isSelected(note.id, selectedNote) ? "bg-studio-accent z-10" : "bg-studio-accent/60"
              )}
              style={{
                left: `${note.time * 160}px`,
                top: `${pitchIndex * 32 + 1}px`,
                width: `${note.duration * 160}px`
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNote(note.id);
              }}
            >
              <button 
                onClick={() => removeNote(note.id)}
                className="text-white hover:text-studio-record transition-colors"
              >
                <Trash2 size={10} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function isSelected(noteId: string, selectedId: string | null) {
  return noteId === selectedId;
}
