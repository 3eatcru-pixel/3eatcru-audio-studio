import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Power, ChevronRight, Settings2, Sparkles, Volume2, Hash, Zap, Mic, Plus } from 'lucide-react';
import { Track, AudioEffect } from '../types';
import { cn } from '../lib/utils';

interface EffectRackProps {
  track?: Track;
  onUpdateEffects: (effects: AudioEffect[]) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

const EFFECTS_LIBRARY = [
  { id: 'eq', name: 'Studio EQ-X', category: 'EQ', color: 'bg-blue-500', desc: '8-Band Parametric Equalizer', accentColor: '#3b82f6' },
  { id: 'vocal-tune', name: 'Auto-Tune Pro', category: 'Pitch', color: 'bg-cyan-400', desc: 'Professional Pitch Correction', accentColor: '#22d3ee' },
  { id: 'harmony', name: 'Harmony Engine', category: 'Vocals', color: 'bg-indigo-400', desc: 'Backing Vocal Harmonizer', accentColor: '#818cf8' },
  { id: 'deesser', name: 'De-Esser X', category: 'Dynamics', color: 'bg-emerald-500', desc: 'Intelligent Sibilance Control', accentColor: '#10b981' },
  { id: 'doubler', name: 'Doubler 2.0', category: 'Modulation', color: 'bg-pink-400', desc: 'Vocal Thickness & Width', accentColor: '#f472b6' },
  { id: 'comp', name: 'VCA-Master', category: 'Dynamics', color: 'bg-red-500', desc: 'Classic VCA Compression', accentColor: '#ef4444' },
  { id: 'reverb', name: 'Lush-Verb', category: 'Reverb', color: 'bg-purple-600', desc: 'Premium Hall Emulation', accentColor: '#9333ea' },
  { id: 'delay', name: 'Echo-Sync', category: 'Delay', color: 'bg-green-500', desc: 'Stereo Multi-Tap Delay', accentColor: '#22c55e' },
];

const PROCESS_ACTIONS = [
  { id: 'norm', name: 'Normalize', icon: <Volume2 size={12} /> },
  { id: 'invert', name: 'Invert Phase', icon: <Hash size={12} /> },
  { id: 'reverse', name: 'Reverse Audio', icon: <Zap size={12} /> },
  { id: 'denoise', name: 'AI De-Noise', icon: <Sparkles size={12} />, secondary: true },
  { id: 'dereverb', name: 'AI De-Reverb', icon: <Sparkles size={12} />, secondary: true },
];

const VOCAL_CHAINS = [
  { id: 'trap-vocal', name: 'Trap Sauce', icon: <Mic size={12} />, effects: ['vocal-tune', 'eq', 'comp', 'delay'] },
  { id: 'drill-vocal', name: 'Drill Master', icon: <Zap size={12} />, effects: ['vocal-tune', 'deesser', 'comp', 'reverb'] },
  { id: 'lofi-vocal', name: 'Lo-Fi Chill', icon: <Sparkles size={12} />, effects: ['eq', 'doubler', 'reverb'] },
];

export function EffectRack({ track, onUpdateEffects, onInteractionStart, onInteractionEnd }: EffectRackProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  if (!track) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-studio-muted gap-4 opacity-50">
        <Settings2 size={48} strokeWidth={1} />
        <span className="text-xs font-black uppercase tracking-widest">No Track Selected</span>
      </div>
    );
  }

  const addEffect = (effectLibItem: typeof EFFECTS_LIBRARY[0]) => {
    if (onInteractionStart) onInteractionStart();
    const newEffect: AudioEffect = {
      id: `${effectLibItem.id}-${Date.now()}`,
      name: effectLibItem.name,
      type: effectLibItem.id,
      category: effectLibItem.category,
      enabled: true,
      params: {}
    };
    onUpdateEffects([...(track.effects || []), newEffect]);
    setShowAddMenu(false);
  };

  const removeEffect = (id: string) => {
    if (onInteractionStart) onInteractionStart();
    onUpdateEffects((track.effects || []).filter(e => e.id !== id));
  };

  const toggleEffect = (id: string) => {
    if (onInteractionStart) onInteractionStart();
    onUpdateEffects((track.effects || []).map(e => 
      e.id === id ? { ...e, enabled: !e.enabled } : e
    ));
  };

  const applyVocalChain = (chainId: string) => {
    const chain = VOCAL_CHAINS.find(c => c.id === chainId);
    if (!chain) return;
    
    if (onInteractionStart) onInteractionStart();
    const newEffects: AudioEffect[] = chain.effects.map(effId => {
      const libInfo = EFFECTS_LIBRARY.find(l => l.id === effId) || EFFECTS_LIBRARY[0];
      return {
        id: `${effId}-${Date.now()}-${Math.random()}`,
        name: libInfo.name,
        type: effId,
        category: libInfo.category,
        enabled: true,
        params: {}
      };
    });
    onUpdateEffects(newEffects);
  };

  const activeEffects = track.effects || [];

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4 px-2 scrollbar-hide">
      {/* Sidebar - Quick Processing */}
      <div className="w-52 shrink-0 flex flex-col gap-2 p-3 bg-gradient-to-b from-studio-panel to-studio-bg rounded-lg border border-studio-border/50 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 size={14} className="text-studio-muted" />
          <span className="text-[10px] font-black uppercase tracking-widest text-studio-muted">Audio Process</span>
        </div>
        
        <div className="flex flex-col gap-1.5">
          {PROCESS_ACTIONS.map(action => (
            <button 
              key={action.id}
              className={cn(
                "group flex items-center justify-between p-2.5 rounded-md border text-[10px] font-black uppercase tracking-tighter transition-all text-left",
                action.secondary 
                  ? "bg-studio-accent/10 border-studio-accent/20 text-studio-accent hover:bg-studio-accent/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]" 
                  : "bg-studio-panel border-studio-border/30 hover:bg-studio-border/50 text-studio-muted hover:text-studio-text"
              )}
            >
              <div className="flex items-center gap-2">
                {action.icon}
                <span>{action.name}</span>
              </div>
              <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-studio-border/30">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Mic size={10} className="text-studio-accent" />
            <span className="text-[8px] font-black uppercase tracking-widest text-studio-muted">AURA Chains</span>
          </div>
          <div className="flex flex-col gap-1">
            {VOCAL_CHAINS.map(chain => (
              <button 
                key={chain.id}
                onClick={() => applyVocalChain(chain.id)}
                className="flex items-center gap-2 p-2 rounded bg-studio-accent/5 border border-studio-accent/10 hover:bg-studio-accent/20 text-[9px] font-bold transition-all text-studio-text"
              >
                {chain.icon}
                <span>{chain.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-studio-border/30">
          <button className="w-full flex items-center justify-center gap-2 p-2 rounded bg-studio-record/10 border border-studio-record/20 text-studio-record text-[9px] font-black uppercase hover:bg-studio-record/20 transition-all">
             <Power size={12} /> Bypass All
          </button>
        </div>
      </div>

      <div className="flex gap-3 h-full">
        <AnimatePresence mode="popLayout">
          {activeEffects.map((effect, i) => {
            const libInfo = EFFECTS_LIBRARY.find(l => l.id === effect.type) || EFFECTS_LIBRARY[0];
            return (
              <motion.div 
                key={effect.id} 
                layout
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                className={cn(
                  "w-56 shrink-0 bg-studio-panel/80 rounded-xl border shadow-2xl flex flex-col overflow-hidden group hover:border-studio-accent/50 transition-colors",
                  effect.enabled ? "border-studio-border" : "border-studio-border opacity-50"
                )}
              >
                {/* Plugin Header */}
                <div className={cn("h-1", libInfo.color)} />
                <div className="p-3 bg-black/20 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded flex items-center justify-center bg-white/5")}>
                       <Settings2 size={12} className="text-studio-muted" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-tight leading-none mb-0.5">{effect.name}</span>
                      <span className="text-[7px] font-bold text-studio-muted uppercase tracking-widest">{effect.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleEffect(effect.id)}
                      className={cn(
                        "w-6 h-6 rounded border flex items-center justify-center transition-all",
                        effect.enabled ? "bg-studio-accent border-studio-accent text-white" : "bg-studio-bg border-white/5 text-studio-muted"
                      )}
                    >
                      <Power size={10} />
                    </button>
                    <button 
                      onClick={() => removeEffect(effect.id)}
                      className="w-6 h-6 rounded bg-studio-bg border border-white/5 flex items-center justify-center text-studio-muted hover:text-studio-record hover:border-studio-record transition-all"
                    >
                      <Hash size={10} className="rotate-45" /> 
                    </button>
                  </div>
                </div>

                {/* Plugin Body */}
                <div className="flex-1 p-4 flex flex-col gap-5 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
                  {/* Plugin Visualizer Area */}
                  <div className="h-16 bg-black/40 rounded border border-white/5 relative overflow-hidden mb-1 flex items-center justify-center">
                    {effect.type === 'vocal-tune' && (
                        <div className="relative w-full h-full flex flex-col justify-center px-4 overflow-hidden text-cyan-400">
                          <div className="text-[6px] font-mono mb-1 opacity-50">C Major - 440Hz</div>
                          <div className="flex gap-0.5 h-6 items-end">
                            {[0.4, 0.6, 0.9, 0.7, 0.5].map((h, i) => (
                              <motion.div 
                                key={i} 
                                className="flex-1 bg-current" 
                                animate={{ height: [`${h * 80}%`, `${(h + 0.2) * 80}%`, `${h * 80}%`] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                              />
                            ))}
                          </div>
                        </div>
                    )}
                    {effect.type === 'harmony' && (
                        <div className="flex items-center justify-around w-full h-full text-indigo-400">
                          <div className="w-1.5 h-6 bg-current opacity-40 rounded-full" />
                          <div className="w-2 h-10 bg-current rounded-full shadow-[0_0_10px_currentColor]" />
                          <div className="w-1.5 h-8 bg-current opacity-60 rounded-full" />
                        </div>
                    )}
                    {!['vocal-tune', 'harmony'].includes(effect.type) && (
                        <div className="flex items-center gap-1 opacity-20">
                          <div className="w-12 h-px bg-white" />
                          <div className="w-2 h-2 rounded-full border border-white" />
                          <div className="w-12 h-px bg-white" />
                        </div>
                    )}
                  </div>

                  {/* Main Knob Space */}
                  <div className="flex justify-between items-center px-2">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full border-2 border-studio-border bg-studio-bg flex items-center justify-center relative shadow-inner">
                          <div className="absolute inset-0 rounded-full bg-white/5" />
                          <div 
                            className="w-1 h-5 absolute -top-1 rounded-full shadow-[0_0_10px_white] origin-bottom rotate-45"
                            style={{ backgroundColor: libInfo.accentColor || '#3b82f6' }}
                          />
                          <div className="w-8 h-8 rounded-full border border-white/5 bg-studio-panel flex items-center justify-center">
                              <span className="text-[8px] font-mono text-studio-text">50</span>
                          </div>
                        </div>
                        <span className="text-[7px] font-black uppercase text-studio-muted tracking-widest">Amount</span>
                    </div>
                    
                    <div className="flex flex-col gap-3 flex-1 ml-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[7px] font-black uppercase text-studio-muted">
                            <span>Mix</span>
                            <span>100%</span>
                          </div>
                          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-studio-accent/60 w-full" />
                          </div>
                        </div>
                    </div>
                  </div>

                  {/* Bottom Buttons */}
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button className="bg-white/5 border border-white/10 rounded-md py-2 text-[9px] font-black uppercase tracking-tighter hover:bg-studio-accent/10 hover:border-studio-accent/30 transition-all flex items-center justify-center gap-2">
                       <Sparkles size={10} className="text-studio-accent" /> AI
                    </button>
                    <button className="bg-white/5 border border-white/10 rounded-md py-2 text-[9px] font-black uppercase tracking-tighter hover:bg-studio-border transition-all">
                       Presets
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-2 bg-black/40 border-t border-white/5 flex justify-between items-center">
                  <span className="text-[7px] font-mono text-studio-muted truncate">{libInfo.desc}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add New Slot */}
        <div className="relative">
          <button 
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={cn(
              "w-14 h-full shrink-0 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-all p-4",
              showAddMenu ? "bg-studio-panel border-studio-accent text-studio-accent" : "bg-studio-panel/30 border-studio-border/30 text-studio-muted hover:bg-studio-panel/50 hover:border-studio-accent/30 hover:text-studio-accent"
            )}
          >
            <Plus size={20} className={cn("transition-transform", showAddMenu && "rotate-45")} />
            <span className="text-[8px] font-black uppercase tracking-widest text-center">Add Slot</span>
          </button>

          <AnimatePresence>
            {showAddMenu && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute left-full ml-2 top-0 w-48 bg-studio-panel border border-studio-border rounded-lg shadow-2xl z-50 p-2 overflow-y-auto max-h-[300px]"
              >
                <div className="text-[8px] font-black uppercase tracking-widest text-studio-muted mb-2 px-2">Select Effect</div>
                <div className="flex flex-col gap-1">
                  {EFFECTS_LIBRARY.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => addEffect(item)}
                      className="flex flex-col items-start p-2 rounded hover:bg-studio-accent hover:text-white transition-colors group"
                    >
                      <span className="text-[10px] font-black uppercase">{item.name}</span>
                      <span className="text-[7px] opacity-70 group-hover:opacity-100">{item.category}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
