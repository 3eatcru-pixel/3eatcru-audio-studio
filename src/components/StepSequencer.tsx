import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Trash2, Save, Download, Music, Grid, Zap, Layers, Volume2 } from 'lucide-react';
import { Track } from '../types';
import { cn, generateId } from '../lib/utils';

interface StepSequencerProps {
  track: Track;
  onUpdateNotes: (notes: any[]) => void;
  bpm: number;
}

const DRUM_KIT = [
  { id: 'kick', name: 'Kick', color: 'bg-red-500', note: 'C3' },
  { id: 'snare', name: 'Snare', color: 'bg-blue-500', note: 'D3' },
  { id: 'hihat', name: 'Hi-Hat', color: 'bg-yellow-500', note: 'F#3' },
  { id: 'clap', name: 'Clap', color: 'bg-green-500', note: 'D#3' },
  { id: 'rim', name: 'Rim', color: 'bg-stone-500', note: 'C#3' },
  { id: 'perch', name: '808', color: 'bg-purple-600', note: 'G3' },
];

const STEPS = 16;

export function StepSequencer({ track, onUpdateNotes, bpm }: StepSequencerProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Grid state: Row is DRUM_KIT index, Col is Step index
  const [grid, setGrid] = useState<boolean[][]>(() => {
    const initialGrid = DRUM_KIT.map(() => Array(STEPS).fill(false));
    // Try to populate from track.notes if they exist
    if (track.notes && track.notes.length > 0) {
      track.notes.forEach(note => {
        const kitIndex = DRUM_KIT.findIndex(k => k.note === note.pitch);
        const stepIndex = Math.round(note.time * 4); // Assuming 16th notes
        if (kitIndex !== -1 && stepIndex >= 0 && stepIndex < STEPS) {
          initialGrid[kitIndex][stepIndex] = true;
        }
      });
    }
    return initialGrid;
  });

  const toggleStep = (row: number, col: number) => {
    const newGrid = [...grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = !newGrid[row][col];
    setGrid(newGrid);
    syncToTrack(newGrid);
  };

  const syncToTrack = (currentGrid: boolean[][]) => {
    const newNotes: any[] = [];
    currentGrid.forEach((row, rowIndex) => {
      row.forEach((active, colIndex) => {
        if (active) {
          newNotes.push({
            id: generateId(),
            pitch: DRUM_KIT[rowIndex].note,
            time: colIndex * 0.25,
            duration: 0.2,
            velocity: 0.8
          });
        }
      });
    });
    onUpdateNotes(newNotes);
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      const stepTime = (60 / bpm) / 4 * 1000;
      interval = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % STEPS);
      }, stepTime);
    } else {
      setCurrentStep(-1);
    }
    return () => clearInterval(interval);
  }, [isPlaying, bpm]);

  return (
    <div className="flex flex-col h-full bg-studio-bg overflow-hidden border border-studio-border rounded-xl shadow-2xl">
      {/* Header */}
      <div className="h-12 border-b border-studio-border flex justify-between items-center px-4 bg-studio-panel/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
           <Grid size={16} className="text-studio-accent" />
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Step Sequencer</span>
              <span className="text-[7px] font-bold text-studio-muted uppercase tracking-tighter">16 Beats / 4 bars</span>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded border border-white/5">
              <div className={cn("w-1.5 h-1.5 rounded-full", isPlaying ? "bg-studio-record animate-pulse" : "bg-studio-muted")} />
              <span className="text-[9px] font-mono tabular-nums text-studio-text">
                {currentStep === -1 ? '00' : (currentStep + 1).toString().padStart(2, '0')}
              </span>
           </div>
           
           <div className="flex gap-1">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn(
                  "w-8 h-8 rounded flex items-center justify-center transition-all",
                  isPlaying ? "bg-studio-record text-white" : "bg-studio-accent text-white hover:brightness-110"
                )}
              >
                {isPlaying ? <Square size={14} fill="white" /> : <Play size={14} fill="white" />}
              </button>
              <button 
                onClick={() => {
                   const emptyGrid = DRUM_KIT.map(() => Array(STEPS).fill(false));
                   setGrid(emptyGrid);
                   syncToTrack(emptyGrid);
                }}
                className="w-8 h-8 rounded bg-white/5 hover:bg-studio-record/20 hover:text-studio-record transition-all flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
           </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 flex overflow-auto p-4 gap-4">
         {/* Kit Names */}
         <div className="flex flex-col pt-1 gap-2">
            {DRUM_KIT.map(item => (
              <div 
                key={item.id} 
                className="h-10 w-24 flex items-center gap-2 px-2 bg-studio-panel/30 rounded border border-studio-border/50 group hover:border-studio-accent/50 transition-all"
              >
                 <div className={cn("w-1.5 h-full rounded-full opacity-50 group-hover:opacity-100", item.color)} />
                 <span className="text-[9px] font-black uppercase tracking-tight truncate">{item.name}</span>
              </div>
            ))}
         </div>

         {/* Steps Grid */}
         <div className="flex-1 grid grid-rows-6 gap-2">
            {grid.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 h-10">
                 {row.map((active, colIndex) => (
                   <button
                     key={colIndex}
                     onClick={() => toggleStep(rowIndex, colIndex)}
                     className={cn(
                       "flex-1 rounded-sm transition-all border relative overflow-hidden group",
                       active ? DRUM_KIT[rowIndex].color : "bg-studio-panel/20 border-studio-border/30 hover:border-white/20",
                       currentStep === colIndex && "ring-1 ring-white/50 z-10",
                       colIndex % 4 === 0 && !active && "bg-studio-panel/40"
                     )}
                   >
                      {active && (
                        <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20" />
                      )}
                      {!active && currentStep === colIndex && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20" />
                      )}
                   </button>
                 ))}
              </div>
            ))}
         </div>
      </div>

      {/* Footer Info */}
      <div className="h-8 border-t border-studio-border bg-black/20 flex items-center px-4 justify-between">
         <div className="flex items-center gap-4 text-[7px] font-bold text-studio-muted uppercase tracking-widest">
            <div className="flex items-center gap-1"><Volume2 size={10} /> Velocity: 80%</div>
            <div className="flex items-center gap-1"><Music size={10} /> Swing: 0%</div>
         </div>
         <div className="text-[8px] font-mono text-studio-accent/60">SNAP: 1/16TH</div>
      </div>
    </div>
  );
}
