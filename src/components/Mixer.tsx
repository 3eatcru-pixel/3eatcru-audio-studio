import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Volume2, VolumeX, Mic, Music, Keyboard, Zap, Shield, ChevronUp } from 'lucide-react';
import { Track } from '../types';
import { cn } from '../lib/utils';

interface MixerProps {
  tracks: Track[];
  selectedId: string | null;
  onUpdateTrack: (id: string, updates: Partial<Track>) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

function VUMeter({ volume, isActive }: { volume: number, isActive: boolean }) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!isActive) { setLevel(0); return; }
    const interval = setInterval(() => {
      // Shimmering level simulation
      setLevel(volume * (0.7 + Math.random() * 0.3));
    }, 100);
    return () => clearInterval(interval);
  }, [isActive, volume]);

  return (
    <div className="w-1.5 h-full bg-studio-panel rounded-full overflow-hidden flex flex-col justify-end gap-0.5 p-0.5">
      {Array.from({ length: 20 }).map((_, i) => {
        const threshold = (20 - i) / 20;
        const lit = level >= threshold;
        return (
          <div 
            key={i} 
            className={cn(
              "w-full h-1 rounded-sm transition-all duration-75",
              lit 
                ? (i < 4 ? "bg-studio-record shadow-[0_0_5px_rgba(239,68,68,0.5)]" : i < 10 ? "bg-yellow-500" : "bg-green-500")
                : "bg-studio-border/20"
            )} 
          />
        );
      })}
    </div>
  );
}

function Knob({ label, value, min = -15, max = 15, onChange, onInteractionStart, onInteractionEnd, color = "studio-accent" }: { 
  label: string, 
  value: number, 
  min?: number, 
  max?: number, 
  onChange: (val: number) => void,
  onInteractionStart?: () => void,
  onInteractionEnd?: () => void,
  color?: string
}) {
  const percent = ((value - min) / (max - min)) * 100;
  const rotation = (percent / 100) * 270 - 135;

  return (
    <div className="flex flex-col items-center gap-1 group">
      <div 
        className="w-7 h-7 rounded-full border border-studio-border bg-studio-bg flex items-center justify-center relative cursor-ns-resize"
        onMouseDown={(e) => {
          if (onInteractionStart) onInteractionStart();
          const startY = e.clientY;
          const startVal = value;
          const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = (startY - moveEvent.clientY) * 0.1;
            const newVal = Math.max(min, Math.min(max, startVal + delta));
            onChange(newVal);
          };
          const handleMouseUp = () => {
            if (onInteractionEnd) onInteractionEnd();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <div 
          className={cn("absolute w-0.5 h-2.5 top-0.5 origin-bottom transition-all", `bg-${color}`)}
          style={{ transform: `rotate(${rotation}deg)` }}
        />
        <div className="w-1.5 h-1.5 rounded-full bg-studio-border" />
      </div>
      <span className="text-[7px] font-bold uppercase text-studio-muted">{label}</span>
      <span className="text-[6px] font-mono text-studio-accent">{Math.round(value * 10) / 10}</span>
    </div>
  );
}

function VisualEQ({ hi, mid, low }: { hi: number, mid: number, low: number }) {
  // Normalize values -15 to 15 -> 0 to 1
  const h = (hi + 15) / 30;
  const m = (mid + 15) / 30;
  const l = (low + 15) / 30;

  return (
    <div className="w-full h-8 bg-black/40 rounded border border-white/5 relative overflow-hidden flex items-end">
       <svg viewBox="0 0 100 40" className="w-full h-full preserve-3d" preserveAspectRatio="none">
          <motion.path 
            d={`M 0 40 Q 25 ${40 - l * 40} 50 ${40 - m * 40} T 100 ${40 - h * 40} L 100 40 L 0 40 Z`}
            fill="url(#eq-gradient)"
            animate={{ d: `M 0 40 Q 25 ${40 - l * 40} 50 ${40 - m * 40} T 100 ${40 - h * 40} L 100 40 L 0 40 Z` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
          <defs>
            <linearGradient id="eq-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-studio-accent)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-studio-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
       </svg>
       <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20">
          <div className="w-px h-full bg-white/20" />
          <div className="w-px h-full bg-white/20" />
          <div className="w-px h-full bg-white/20" />
       </div>
    </div>
  );
}

export function Mixer({ tracks, selectedId, onUpdateTrack, onInteractionStart, onInteractionEnd }: MixerProps) {
  return (
    <div className="flex gap-2 h-full overflow-x-auto pb-4 pt-1 px-1">
      {tracks.map(track => (
        <motion.div 
          key={track.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "w-36 shrink-0 flex flex-col items-center bg-studio-panel border border-studio-border rounded shadow-lg transition-all relative overflow-hidden",
            selectedId === track.id ? "ring-1 ring-studio-accent border-studio-accent/50" : "hover:border-studio-border/80"
          )}
          onClick={() => onUpdateTrack(track.id, {})}
        >
          {/* Header Strip */}
          <div className={cn(
            "w-full h-1 mb-1",
            track.color === '#ef4444' ? "bg-studio-record" : track.type === 'midi' ? "bg-purple-500" : "bg-studio-accent"
          )} />

          <div className="flex flex-col items-center gap-0.5 mb-2 px-2">
            <div className="text-studio-muted">
              {track.type === 'vocal' ? <Mic size={10} className="text-studio-record" /> : 
               track.type === 'midi' ? <Keyboard size={10} className="text-purple-400" /> : 
               <Music size={10} className="text-studio-accent" />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter truncate w-full text-center opacity-80">
              {track.name}
            </span>
          </div>

          {/* EQ Section */}
          <div className="w-full px-2 mb-3">
            <div className="bg-studio-bg/40 rounded p-1 border border-studio-border/30">
               <div className="text-[6px] font-black text-studio-muted uppercase mb-1 flex items-center justify-between">
                 <div className="flex items-center gap-1">
                   <Zap size={6} /> Channel EQ
                 </div>
                 <span className="text-[5px] font-mono opacity-50">PARAMETRIC</span>
               </div>
               <VisualEQ hi={track.eqHigh || 0} mid={track.eqMid || 0} low={track.eqLow || 0} />
               <div className="flex justify-between mt-1">
                 <Knob label="Hi" value={track.eqHigh || 0} onChange={(v) => onUpdateTrack(track.id, { eqHigh: v })} onInteractionStart={onInteractionStart} onInteractionEnd={onInteractionEnd} />
                 <Knob label="Mid" value={track.eqMid || 0} onChange={(v) => onUpdateTrack(track.id, { eqMid: v })} onInteractionStart={onInteractionStart} onInteractionEnd={onInteractionEnd} />
                 <Knob label="Low" value={track.eqLow || 0} onChange={(v) => onUpdateTrack(track.id, { eqLow: v })} onInteractionStart={onInteractionStart} onInteractionEnd={onInteractionEnd} />
               </div>
            </div>
          </div>

          {/* Sends & Dynamics */}
          <div className="w-full px-2 mb-3 grid grid-cols-2 gap-1">
             <div className="bg-studio-bg/40 rounded p-1 border border-studio-border/30">
                <span className="text-[6px] font-black text-studio-muted uppercase block mb-1">Sends</span>
                <div className="flex flex-col gap-2 scale-90 origin-top">
                  <Knob label="Bus A" value={track.sendA || 0} min={0} max={10} onChange={(v) => onUpdateTrack(track.id, { sendA: v })} color="blue-400" onInteractionStart={onInteractionStart} onInteractionEnd={onInteractionEnd} />
                  <Knob label="Bus B" value={track.sendB || 0} min={0} max={10} onChange={(v) => onUpdateTrack(track.id, { sendB: v })} color="green-400" onInteractionStart={onInteractionStart} onInteractionEnd={onInteractionEnd} />
                </div>
             </div>
             <div className="bg-studio-bg/40 rounded p-1 border border-studio-border/30">
                <span className="text-[6px] font-black text-studio-muted uppercase block mb-1">Dyn</span>
                <div className="flex flex-col gap-2 scale-90 origin-top">
                   <Knob label="Comp" value={track.compThreshold || 0} min={0} max={10} onChange={(v) => onUpdateTrack(track.id, { compThreshold: v })} color="studio-record" onInteractionStart={onInteractionStart} onInteractionEnd={onInteractionEnd} />
                </div>
             </div>
          </div>

          {/* Mute/Solo/Rec Controls */}
          <div className="flex gap-1 mb-3">
            <button 
              onClick={() => {
                if (onInteractionStart) onInteractionStart();
                onUpdateTrack(track.id, { muted: !track.muted });
              }}
              className={cn(
                "w-7 h-6 rounded-sm text-[9px] font-black border transition-colors",
                track.muted ? "bg-yellow-600 border-yellow-500 text-white" : "border-studio-border text-studio-muted hover:bg-studio-border"
              )}
            >M</button>
            <button 
              onClick={() => {
                if (onInteractionStart) onInteractionStart();
                onUpdateTrack(track.id, { soloed: !track.soloed });
              }}
              className={cn(
                "w-7 h-6 rounded-sm text-[9px] font-black border transition-colors",
                track.soloed ? "bg-studio-accent border-studio-accent text-white" : "border-studio-border text-studio-muted hover:bg-studio-border"
              )}
            >S</button>

            <button className="w-7 h-6 rounded-sm text-[9px] font-black border border-studio-border text-studio-muted hover:bg-studio-record/20 transition-colors flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-studio-record/40" />
            </button>
          </div>

          {/* Fader Section */}
          <div className="flex-1 w-full flex px-3 gap-2">
            <VUMeter volume={track.volume} isActive={true} />
            
            <div className="relative flex-1 bg-studio-bg rounded-sm border border-studio-border/50 flex justify-center py-2 h-40">
              {/* Fader Scale */}
              <div className="absolute inset-y-2 left-1 flex flex-col justify-between text-[6px] font-mono text-studio-muted pointer-events-none">
                <span>+6</span>
                <span>0</span>
                <span>-6</span>
                <span>-12</span>
                <span>-24</span>
                <span>-inf</span>
              </div>

              {/* Functional Range Input */}
              <input 
                type="range"
                min="0"
                max="1.2"
                step="0.01"
                value={track.volume}
                onMouseDown={() => { if (onInteractionStart) onInteractionStart(); }}
                onMouseUp={() => { if (onInteractionEnd) onInteractionEnd(); }}
                onChange={(e) => onUpdateTrack(track.id, { volume: parseFloat(e.target.value) })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-10"
                style={{ appearance: 'none', transform: 'rotate(-90deg)', width: '160px', left: '-55px', top: '70px' }}
              />

              {/* Custom Track UI */}
              <div className="relative w-1 h-full bg-studio-panel rounded-full overflow-visible">
                <motion.div 
                  className="absolute left-1/2 -translate-x-1/2 w-7 h-10 bg-gradient-to-b from-[#4a4b50] to-[#2c2e33] rounded-sm shadow-xl border border-studio-border flex flex-col items-center justify-center cursor-ns-resize"
                  style={{ bottom: `${(track.volume / 1.2) * 100}%`, marginBottom: '-20px' }}
                  animate={{ bottom: `${(track.volume / 1.2) * 100}%` }}
                >
                  <div className="w-5 h-0.5 bg-studio-accent rounded-full shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                  <div className="mt-1.5 w-0.5 h-4 bg-studio-border/50 rounded-full" />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Pan/Trim Footer */}
          <div className="w-full bg-studio-bg mt-4 p-2 border-t border-studio-border flex justify-between items-center">
             <div className="flex flex-col items-center gap-0.5 group">
                <div 
                  className="w-7 h-7 rounded-full border border-studio-border flex items-center justify-center relative bg-studio-panel cursor-pointer"
                  onMouseDown={(e) => {
                    if (onInteractionStart) onInteractionStart();
                    const startY = e.clientY;
                    const startPan = track.pan;
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const delta = (startY - moveEvent.clientY) * 0.01;
                      const newPan = Math.max(-1, Math.min(1, startPan + delta));
                      onUpdateTrack(track.id, { pan: newPan });
                    };
                    const handleMouseUp = () => {
                      if (onInteractionEnd) onInteractionEnd();
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  <div 
                    className="absolute w-0.5 h-3 bg-studio-accent bottom-1/2 origin-bottom transition-transform duration-200"
                    style={{ transform: `rotate(${track.pan * 90}deg)` }}
                  />
                  <div className="w-1 h-1 rounded-full bg-studio-border" />
                </div>
                <span className="text-[6px] font-bold text-studio-muted uppercase">Pan</span>
             </div>
             
             <div className="flex flex-col items-end">
               <span className="text-[7px] font-mono text-studio-muted uppercase bg-studio-panel px-1 rounded">{Math.round((track.volume > 0 ? 20 * Math.log10(track.volume) : -60) * 10) / 10} dB</span>
               <span className="text-[6px] font-bold text-studio-accent uppercase flex items-center gap-0.5 mt-1">
                 <Shield size={6} /> Post
               </span>
             </div>
          </div>
        </motion.div>
      ))}


      {/* FX Linker Arrow */}
      <div className="flex items-center text-studio-border px-1">
        <ChevronUp size={24} className="rotate-90" />
      </div>

      {/* Master Channel (Distinct Design) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-32 shrink-0 flex flex-col items-center bg-studio-panel border-2 border-studio-accent/40 rounded shadow-2xl relative overflow-hidden ring-4 ring-studio-accent/5 ml-2"
      >
        <div className="w-full h-1 bg-studio-accent shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        
        <div className="flex flex-col items-center gap-1 my-3">
          <Volume2 size={16} className="text-studio-accent" />
          <span className="text-[10px] font-black uppercase tracking-widest text-studio-accent">MASTER</span>
        </div>

        <div className="flex-1 w-full flex px-4 gap-4">
          <div className="flex gap-1">
            <VUMeter volume={0.8} isActive={true} />
            <VUMeter volume={0.78} isActive={true} />
          </div>
          
          <div className="relative flex-1 bg-studio-bg rounded-sm border border-studio-accent/20 flex justify-center py-2">
            <div className="relative w-1.5 h-full bg-studio-panel rounded-full">
              <motion.div 
                className="absolute left-1/2 -translate-x-1/2 w-8 h-10 bg-studio-accent rounded shadow-2xl border border-white/20 flex flex-col items-center justify-center"
                style={{ bottom: '75%', marginBottom: '-20px' }}
              >
                <div className="w-6 h-1 bg-white/40 rounded-full" />
                <div className="mt-1.5 w-1 h-3 bg-white/20 rounded-full" />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="w-full bg-studio-accent/10 mt-4 p-2 border-t border-studio-accent/20 flex flex-col items-center">
           <Zap size={10} className="text-studio-accent mb-1" />
           <span className="text-[8px] font-black text-studio-accent tracking-tighter">STEREO OUT</span>
           <span className="text-[7px] font-mono text-studio-muted">LUFS: -14.1</span>
        </div>
      </motion.div>
    </div>
  );
}

