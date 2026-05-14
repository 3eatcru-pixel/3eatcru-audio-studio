import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Mic, Clock, Zap, Hash, Bell, Cpu, HardDrive, Activity } from 'lucide-react';
import { cn, formatTime } from '../lib/utils';
import { motion } from 'motion/react';
import { useStudioStore } from '../store/studioStore';

interface TransportBarProps {
  onTogglePlay: () => void;
  onToggleRecord: () => void;
  onUpdateState: (updates: Partial<useStudioStore>) => void; // Update type to reflect Zustand store
}

export function TransportBar({ state, onTogglePlay, onToggleRecord, onUpdateState }: TransportBarProps) {
  const [cpu, setCpu] = useState(12);
  const { currentTime, duration, metronomeEnabled, isPlaying, isRecording, bpm } = useStudioStore();

  // This useEffect is for the CPU simulation, which can remain local
  // The metronome click logic is now in Studio.tsx, which uses Zustand's state
  useEffect(() => {
    const interval = setInterval(() => {
      setCpu(10 + Math.floor(Math.random() * 8));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="h-20 border-top border-studio-border bg-studio-panel/90 backdrop-blur-md flex items-center px-8 justify-between gap-8 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] z-50">
      {/* Time & Project Info */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-studio-muted leading-tight mb-1">Timecode</span>
            <div className="flex items-baseline gap-1 bg-black/40 px-3 py-1.5 rounded border border-white/5 shadow-inner">
              <span className="text-3xl font-mono font-black tracking-tighter text-studio-text tabular-nums leading-none"> 
                {formatTime(currentTime).split('.')[0]}
              </span>
              <span className="text-sm font-mono font-bold text-studio-accent tabular-nums leading-none">
                .{formatTime(currentTime).split('.')[1]}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-studio-muted leading-tight mb-1">Position</span>
            <div className="bg-black/40 px-3 py-1.5 rounded border border-white/5 flex items-baseline gap-1 shadow-inner min-w-[64px]">
              <span className="text-xl font-mono font-bold tracking-tighter text-studio-text tabular-nums leading-none"> 
                {Math.floor(currentTime / (240 / bpm) + 1).toString().padStart(3, '0')}
              </span>
              <span className="text-xs font-mono font-bold text-studio-accent/60 uppercase">Bar</span>
            </div>
          </div>
        </div>

        <div className="h-10 w-px bg-studio-border/50" />

        <div className="flex flex-col gap-2">
           <div className="flex items-center gap-3"> 
              <Cpu size={12} className="text-studio-muted" />
              <div className="w-24 h-1.5 bg-studio-bg rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  className="h-full bg-studio-accent shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  animate={{ width: `${cpu}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-studio-muted w-8">{cpu}%</span>
           </div>
           <div className="flex items-center gap-3">
              <HardDrive size={12} className="text-studio-muted" />
              <div className="w-24 h-1.5 bg-studio-bg rounded-full overflow-hidden border border-white/5">
                 <div className="w-[42%] h-full bg-green-500/60" />
              </div>
              <span className="text-[9px] font-mono text-studio-muted w-8">42%</span>
           </div>
        </div>
      </div>

      {/* Main Controls Overlay */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
        <div className="flex items-center bg-gradient-to-b from-studio-panel to-[#1a1c20] rounded-2xl p-2 gap-2 border border-white/10 shadow-2xl">
          <button 
            onClick={() => onUpdateState({ isPlaying: false, currentTime: 0 })}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-white/5 text-studio-muted transition-all active:scale-95 group"
            title="Stop"
          >
            <Square size={20} fill="currentColor" className="group-hover:text-studio-text" />
          </button>

          <button 
            onClick={onTogglePlay}
            className={cn(
              "w-16 h-14 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg", 
              isPlaying 
                ? "bg-studio-accent text-white shadow-studio-accent/40" 
                : "bg-studio-text text-studio-bg hover:scale-105"
            )}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
          </button>
          
          <button 
            onClick={onToggleRecord}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-95 group",
              state.isRecording 
                ? "bg-studio-record text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] recording-glow"
                : "bg-white/5 text-studio-record hover:bg-studio-record/20"
            )}
            title="Record"
          > 
            <Mic size={20} fill={isRecording ? "currentColor" : "none"} className={isRecording ? "animate-pulse" : ""} />
          </button>
        </div>
      </div>

      {/* Settings & Metronome */}
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-studio-muted">Tempo / Sign</span>
          <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded border border-white/5 shadow-inner"> 
            <span className="text-lg font-mono font-black text-studio-text tabular-nums">{bpm}</span>
            <div className="flex flex-col text-[8px] font-bold text-studio-muted leading-none">
               <span>/4</span>
               <span>BPM</span>
            </div>
          </div>
        </div>
 
        <div className="flex gap-2">
          <button 
            onClick={() => onUpdateState({ metronomeEnabled: !metronomeEnabled })}
            className={cn(
              "w-12 h-12 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all group relative overflow-hidden",
              state.metronomeEnabled 
                ? "border-studio-accent bg-studio-accent/20 text-studio-accent shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                : "border-white/5 bg-white/5 text-studio-muted hover:border-white/20 hover:text-studio-text"
            )}
          > 
            {metronomeEnabled && isPlaying && (
              <motion.div 
                key={Math.floor(currentTime * (bpm / 60))}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 2 }}
                className="absolute inset-0 bg-studio-accent/20" 
              />
            )}
            <Bell size={16} className={state.metronomeEnabled && state.isPlaying ? "animate-shake" : "group-hover:animate-shake"} />
            <span className="text-[7px] font-black uppercase tracking-widest leading-none">Click</span>
            {state.metronomeEnabled && (
               <div className={cn(
                 "absolute top-1 right-1 w-1.5 h-1.5 rounded-full",
                 Math.floor(currentTime * (bpm / 60)) % 4 === 0 ? "bg-studio-record" : "bg-studio-accent"
               )} />
            )}
          </button>
          
          <button 
            className="w-12 h-12 rounded-xl border border-white/5 bg-white/5 text-studio-muted hover:border-white/20 hover:text-studio-text transition-all flex flex-col items-center justify-center gap-1 group"
          >
            <Activity size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-[7px] font-black uppercase tracking-widest">Sync</span>
          </button>

          <div className="flex flex-col gap-1 px-4 border-l border-white/5">
             <div className="flex justify-between items-center w-32">
                <span className="text-[7px] font-black uppercase text-studio-muted tracking-tighter">Master L</span>
                <span className="text-[6px] font-mono text-studio-muted">RMS: -14</span>
             </div>
             <div className="w-32 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 flex gap-[1px]">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 h-full",
                      state.isPlaying ? (i < 18 ? "bg-studio-accent/40" : i < 22 ? "bg-yellow-500/40" : "bg-studio-record/40") : "bg-white/5"
                    )} 
                  />
                ))}
             </div>
             <div className="w-32 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 flex gap-[1px]">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 h-full",
                      state.isPlaying ? (i < 16 ? "bg-studio-accent/40" : i < 20 ? "bg-yellow-500/40" : "bg-studio-record/40") : "bg-white/5"
                    )} 
                  />
                ))}
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
