import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, Waves, BarChart3, Target, Crosshair, Search } from 'lucide-react';
import { cn } from '../lib/utils';

export function AnalyzerView() {
  const [frequencies, setFrequencies] = useState<number[]>(Array(64).fill(0));
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrequencies(prev => prev.map((_, i) => {
        // Create some "musical" peaks
        const base = Math.sin(i * 0.1 + Date.now() * 0.001) * 20 + 40;
        const randomness = Math.random() * 15;
        const lowEndBoost = i < 10 ? 15 : 0;
        const highEndRollOff = i > 50 ? -20 : 0;
        return Math.max(5, base + randomness + lowEndBoost + highEndRollOff);
      }));
      setPhase(prev => (prev + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full gap-6">
      {/* Left: FFT Spectrum */}
      <div className="flex-1 bg-studio-bg rounded-xl border border-studio-border p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
         <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
            <svg width="100%" height="100%">
               <pattern id="fft-grid" width="60" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
               </pattern>
               <rect width="100%" height="100%" fill="url(#fft-grid)" />
            </svg>
         </div>

         <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-studio-accent/20 rounded-lg">
                  <Activity size={18} className="text-studio-accent" />
               </div>
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-studio-text">Spectrum Analyzer</h3>
                  <p className="text-[8px] font-bold text-studio-muted uppercase tracking-tighter">Fast Fourier Transform • Linear Scale</p>
               </div>
            </div>
            <div className="flex gap-4">
               <div className="text-right">
                  <div className="text-[8px] font-black text-studio-muted uppercase">Peak Frequency</div>
                  <div className="text-xs font-mono font-bold text-studio-accent">124.5 Hz</div>
               </div>
               <div className="text-right">
                  <div className="text-[8px] font-black text-studio-muted uppercase">Avg Level</div>
                  <div className="text-xs font-mono font-bold text-studio-record">-18.2 dB</div>
               </div>
            </div>
         </div>

         <div className="flex-1 flex items-end gap-[2px] relative z-10 pb-8 border-b border-studio-border/30">
            {frequencies.map((f, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex-1 bg-gradient-to-t rounded-t-sm transition-all duration-75 group relative",
                  i < 15 ? "from-studio-accent/20 to-studio-accent/60" : 
                  i > 50 ? "from-studio-record/20 to-studio-record/60" :
                  "from-studio-accent/10 to-studio-accent/40"
                )}
                style={{ height: `${f}%` }}
              >
                 <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[6px] font-bold text-studio-muted pointer-events-none">
                    {(i * 320).toLocaleString()}Hz
                 </div>
              </div>
            ))}
            
            {/* Axis labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pt-2 text-[6px] font-black text-studio-muted uppercase">
               <span>20Hz</span>
               <span>100Hz</span>
               <span>500Hz</span>
               <span>2kHz</span>
               <span>10kHz</span>
               <span>22kHz</span>
            </div>
         </div>
      </div>

      {/* Right: Stereo Field & Correlation */}
      <div className="w-80 flex flex-col gap-4">
         <div className="flex-1 bg-studio-panel border border-studio-border rounded-xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-2">
               <Crosshair size={16} className="text-studio-accent" />
               <span className="text-[10px] font-black uppercase tracking-widest">Stereo Imager</span>
            </div>
            
            {/* Goniometer Simulation */}
            <div className="aspect-square bg-studio-bg rounded-full border border-studio-border relative overflow-hidden flex items-center justify-center">
               <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <div className="w-full h-px bg-white" />
                  <div className="h-full w-px bg-white" />
                  <div className="w-full h-full border border-white rounded-full scale-75" />
               </div>
               <svg viewBox="0 0 100 100" className="w-full h-full">
                  <motion.path 
                    d={`M 50 50 Q ${50 + Math.sin(phase) * 30} ${50 + Math.cos(phase) * 20} ${50 + Math.sin(phase * 2) * 40} ${50 + Math.cos(phase * 1.5) * 40}`}
                    fill="none"
                    stroke="var(--color-studio-accent)"
                    strokeWidth="0.5"
                    strokeOpacity="0.6"
                    animate={{ d: `M 50 50 Q ${50 + Math.sin(phase) * 30} ${50 + Math.cos(phase * 0.8) * 20} ${50 + Math.sin(phase * 1.2) * 40} ${50 + Math.cos(phase * 1.5) * 40}` }}
                  />
               </svg>
               <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-studio-muted">L</div>
               <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-studio-muted">R</div>
               <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-studio-muted">M</div>
               <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-studio-muted">S</div>
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-black uppercase text-studio-muted">Correlation</span>
                  <span className="text-[10px] font-mono text-studio-accent">+0.84</span>
               </div>
               <div className="h-1.5 w-full bg-studio-bg border border-studio-border rounded-full relative overflow-hidden">
                  <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/20" />
                  <motion.div 
                    className="h-full bg-studio-accent/60 absolute left-1/2"
                    style={{ width: '40%' }}
                    animate={{ width: `${30 + Math.random() * 20}%` }}
                  />
                  <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                     <span className="text-[6px] font-bold text-studio-muted">-1</span>
                     <span className="text-[6px] font-bold text-studio-muted">0</span>
                     <span className="text-[6px] font-bold text-studio-muted">+1</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="h-32 bg-studio-accent/5 border border-studio-accent/10 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2">
               <Zap size={14} className="text-studio-accent" />
               <span className="text-[9px] font-black uppercase tracking-widest text-studio-accent">AI Resonance Alert</span>
            </div>
            <p className="text-[8px] text-studio-muted uppercase font-bold leading-tight">
               Build up detected around <span className="text-studio-text">240Hz</span>. Consider a small subtractive EQ dip on the Master Bus.
            </p>
            <button className="text-[8px] font-black underline uppercase text-studio-accent text-left hover:text-white transition-colors">
               Apply Fix Automatically
            </button>
         </div>
      </div>
    </div>
  );
}
