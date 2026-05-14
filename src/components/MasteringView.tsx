import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Activity, Waves, Gauge, Disc, Wand2, Sparkles, Sliders, Volume2, Shield, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import { MasterPreset } from '../types'; // Keep MasterPreset type
import { useStudioStore } from '../store/studioStore'; // Import Zustand store

interface MasteringViewProps {
  preset: MasterPreset;
  onPresetChange: (preset: MasterPreset) => void;
}

const MODULES = [
  { id: 'preamp', name: 'Vintage Preamp', icon: <Disc size={14} />, desc: 'Warm analog saturation' },
  { id: 'eq', name: 'Dynamic EQ', icon: <Sliders size={14} />, desc: 'surgical frequency control' },
  { id: 'comp', name: 'Glue Compressor', icon: <Layers size={14} />, desc: 'Bus compression for cohesion' },
  { id: 'image', name: 'Stereo Widener', icon: <Waves size={14} />, desc: 'MS processing' },
  { id: 'limit', name: 'LUFS Maximizer', icon: <Shield size={14} />, desc: 'Transparent loudness' },
];

export function MasteringView({ preset, onPresetChange }: MasteringViewProps) {
  // The preset and onPresetChange are still passed as props from Studio.tsx, which now gets them from Zustand
  const [isProcessing, setIsProcessing] = useState(false);
  const [meterValues, setMeterValues] = useState<number[]>(Array(5).fill(0));

  React.useEffect(() => {
    const interval = setInterval(() => {
       setMeterValues(prev => prev.map(() => Math.random() * 100));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const presets: MasterPreset[] = ['Pop', 'Trap', 'Rock', 'Sertanejo', 'Lo-Fi', 'Electronic', 'Rap', 'Hip Hop', 'None'];

  return (
    <div className="flex h-full gap-6">
      {/* Left Pane: Preset Selection & Stats */}
      <div className="w-72 flex flex-col gap-4">
        <div className="bg-studio-bg rounded-xl border border-studio-border p-4 shadow-xl">
           <div className="flex items-center gap-2 mb-4">
              <Wand2 size={16} className="text-studio-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Mastering Preset</span>
           </div>
           <div className="grid grid-cols-2 gap-2">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => onPresetChange(p)}
                  className={cn(
                    "px-3 py-2 rounded text-[10px] font-black transition-all uppercase tracking-tight",
                    preset === p 
                      ? "bg-studio-accent text-white shadow-lg shadow-studio-accent/20" 
                      : "bg-studio-panel border border-studio-border text-studio-muted hover:border-studio-accent/50 hover:text-studio-text"
                  )}
                >
                  {p}
                </button>
              ))}
           </div>
        </div>

        <div className="flex-1 bg-studio-panel/50 rounded-xl border border-studio-border p-4 flex flex-col gap-6">
           <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] font-bold text-studio-muted uppercase">Target LUFS</span>
                <span className="text-sm font-mono font-black text-studio-accent">-14.0</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] font-bold text-studio-muted uppercase">Peak Ceiling</span>
                <span className="text-sm font-mono font-black text-studio-record">-1.0 dB</span>
              </div>
              <div className="flex justify-between items-baseline border-t border-studio-border pt-4">
                <span className="text-[9px] font-bold text-studio-muted uppercase">Current RMS</span>
                <span className="text-xs font-mono font-bold">-16.4</span>
              </div>
           </div>

           <div className="mt-auto">
              <button 
                onClick={() => setIsProcessing(!isProcessing)}
                className={cn(
                  "w-full py-4 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all",
                  isProcessing 
                    ? "bg-studio-record text-white animate-pulse" 
                    : "bg-white text-black hover:scale-[1.02]"
                )}
              >
                {isProcessing ? <Sparkles size={16} /> : <Zap size={16} />}
                {isProcessing ? 'Finalizing...' : 'Apply Master'}
              </button>
           </div>
        </div>
      </div>

      {/* Main Area: Processing Chain Visualization */}
      <div className="flex-1 bg-studio-bg rounded-xl border border-studio-border p-6 relative overflow-hidden flex flex-col shadow-inner">
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <svg width="100%" height="100%">
               <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
               </pattern>
               <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
         </div>

         <div className="flex justify-between items-center mb-8 relative z-10">
            <div className="flex items-center gap-4">
               <div className="bg-studio-accent/20 p-2 rounded-lg">
                  <Zap size={20} className="text-studio-accent" />
               </div>
               <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter leading-none">Aura Master Engine</h3>
                  <p className="text-[9px] font-bold text-studio-muted uppercase tracking-widest mt-1">Version 4.2.0 • 64-bit Floating Point</p>
               </div>
            </div>
            <div className="flex gap-4">
               <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-studio-muted uppercase">Latency</span>
                  <span className="text-[10px] font-mono font-bold text-studio-accent">0.0ms</span>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-studio-muted uppercase">CPU Usage</span>
                  <span className="text-[10px] font-mono font-bold text-studio-accent">2.4%</span>
               </div>
            </div>
         </div>

         <div className="flex-1 flex items-center justify-between gap-4 relative z-10">
            {MODULES.map((mod, i) => (
              <React.Fragment key={mod.id}>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="w-40 bg-studio-panel border border-studio-border rounded-xl p-4 flex flex-col items-center gap-3 hover:border-studio-accent/50 transition-all cursor-pointer group"
                >
                   <div className="w-10 h-10 rounded-full bg-studio-bg flex items-center justify-center border border-studio-border group-hover:text-studio-accent transition-colors">
                      {mod.icon}
                   </div>
                   <div className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-tighter">{mod.name}</div>
                      <div className="text-[7px] text-studio-muted uppercase tracking-tight mt-1">{mod.desc}</div>
                   </div>
                   <div className="w-full flex justify-between gap-1 h-3 mt-2">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <div 
                          key={j} 
                          className={cn(
                            "flex-1 rounded-full transition-all duration-75", 
                            (meterValues[i] / 12.5) > j ? (j > 6 ? "bg-studio-record" : "bg-studio-accent") : "bg-studio-border"
                          )} 
                        />
                      ))}
                   </div>
                </motion.div>
                {i < MODULES.length - 1 && (
                  <div className="flex-1 h-[2px] bg-gradient-to-right from-studio-border via-studio-accent/20 to-studio-border" />
                )}
              </React.Fragment>
            ))}
         </div>

         <div className="mt-8 flex items-center justify-between border-t border-studio-border pt-6 relative z-10">
            <div className="flex gap-8">
               <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-studio-muted uppercase">Input Meter</span>
                  <div className="w-32 h-2 bg-studio-panel rounded-full overflow-hidden flex gap-[px]">
                     {Array.from({ length: 16 }).map((_, i) => (
                       <div key={i} className={cn("flex-1 h-full", (meterValues[0] / 6.25) > i ? "bg-studio-accent/40" : "bg-studio-border")} />
                     ))}
                  </div>
               </div>
               <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-studio-muted uppercase">Output Meter</span>
                  <div className="w-32 h-2 bg-studio-panel rounded-full overflow-hidden flex gap-[px]">
                     {Array.from({ length: 16 }).map((_, i) => (
                       <div key={i} className={cn("flex-1 h-full", (meterValues[4] / 6.25) > i ? "bg-studio-record/40" : "bg-studio-border")} />
                     ))}
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="px-3 py-1 bg-studio-accent/10 border border-studio-accent/20 rounded-full">
                  <span className="text-[8px] font-black text-studio-accent tracking-widest uppercase">Safe Limiting Active</span>
               </div>
               <div className="h-4 w-px bg-studio-border" />
               <span className="text-[10px] font-mono text-studio-muted">DITHER: TRIANGULAR</span>
            </div>
         </div>
      </div>
    </div>
  );
}
