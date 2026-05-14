import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Keyboard, Cpu, Zap, Radio, Check, AlertTriangle, Loader2, Music } from 'lucide-react';
import { cn } from '../lib/utils';

interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
  type: 'input' | 'output';
}

export function PeripheralManager() {
  const [inputs, setInputs] = useState<MidiDevice[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [activeNote, setActiveNote] = useState<number | null>(null);

  const updateDevices = useCallback(() => {
    if (!navigator.requestMIDIAccess) return;

    navigator.requestMIDIAccess().then((access) => {
      const midiInputs: MidiDevice[] = [];
      access.inputs.forEach((input) => {
        midiInputs.push({
          id: input.id,
          name: input.name || 'Unknown Device',
          manufacturer: input.manufacturer || 'Generic',
          state: input.state,
          type: 'input'
        });

        // Listen for MIDI messages
        input.onmidimessage = (message) => {
          const [status, data1, data2] = message.data;
          // Note on message (144 = 0x90)
          if ((status & 0xf0) === 0x90 && data2 > 0) {
            setActiveNote(data1);
            setTimeout(() => setActiveNote(null), 100);
          }
        };
      });
      setInputs(midiInputs);
    });
  }, []);

  const requestMidi = async () => {
    if (!navigator.requestMIDIAccess) {
      setIsSupported(false);
      return;
    }

    try {
      await navigator.requestMIDIAccess();
      setIsEnabled(true);
      updateDevices();
    } catch (e) {
      setIsSupported(false);
    }
  };

  useEffect(() => {
    if (isEnabled) {
      const interval = setInterval(updateDevices, 2000);
      return () => clearInterval(interval);
    }
  }, [isEnabled, updateDevices]);

  return (
    <div className="flex flex-col h-full bg-studio-bg rounded-xl border border-studio-border overflow-hidden">
      <div className="p-8 pb-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-studio-accent/20 rounded-xl text-studio-accent">
              <Cpu size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Peripheral Control Center</h2>
              <p className="text-[10px] font-bold text-studio-muted uppercase tracking-widest mt-1">Connect MIDI Keyboards, MPCs, and Control Surfaces</p>
            </div>
          </div>
          
          {!isEnabled && isSupported && (
            <button 
              onClick={requestMidi}
              className="px-6 py-2 bg-studio-accent text-white rounded-lg text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
            >
              <Zap size={14} /> Enable MIDI Access
            </button>
          )}
        </div>

        {!isSupported && (
          <div className="mb-6 p-4 bg-studio-record/10 border border-studio-record/20 rounded-xl flex items-center gap-4">
             <AlertTriangle className="text-studio-record" />
             <div>
                <h4 className="text-xs font-black uppercase text-studio-record">Web MIDI Not Supported</h4>
                <p className="text-[10px] font-bold text-studio-muted uppercase">Your browser does not support the Web MIDI API. Try Chrome or Edge.</p>
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Device List */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-studio-muted flex items-center gap-2">
              <Radio size={14} className={isEnabled ? "text-studio-accent animate-pulse" : ""} /> Detected MIDI Inputs
            </h3>
            
            {!isEnabled ? (
              <div className="p-12 border-2 border-dashed border-studio-border rounded-xl flex flex-col items-center justify-center text-center opacity-30">
                <Music size={32} className="mb-4" />
                <p className="text-[10px] font-bold uppercase">MIDI Engine Offline</p>
              </div>
            ) : inputs.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-studio-border rounded-xl flex flex-col items-center justify-center text-center">
                <Loader2 size={32} className="mb-4 animate-spin text-studio-accent" />
                <p className="text-[10px] font-bold uppercase text-studio-muted">Scanning for devices...</p>
                <p className="text-[8px] text-studio-muted uppercase mt-2">Connect your keyboard via USB</p>
              </div>
            ) : (
              <div className="space-y-2">
                {inputs.map((device) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={device.id} 
                    className="bg-studio-panel border border-studio-border p-4 rounded-xl flex items-center justify-between group hover:border-studio-accent transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-studio-bg rounded-lg">
                        <Keyboard size={16} className="text-studio-accent" />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-tight">{device.name}</div>
                        <div className="text-[8px] font-bold text-studio-muted uppercase">{device.manufacturer}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase text-studio-accent">CONNECTED</span>
                      <div className="w-2 h-2 bg-studio-accent rounded-full animate-pulse" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          /* MPC / Pad Visualizer Section */
          <div className="space-y-4 text-left">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-studio-muted flex items-center gap-2">
              <Zap size={14} /> Global Input Monitor
            </h3>
            
            <div className="bg-studio-panel border border-studio-border p-6 rounded-xl relative overflow-hidden">
              <div className="grid grid-cols-4 gap-2 aspect-square">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "rounded-lg border-2 border-studio-border flex items-center justify-center text-[10px] font-bold transition-all duration-75",
                      activeNote !== null && (activeNote % 16 === i) 
                        ? "bg-studio-accent border-studio-accent text-white shadow-[0_0_20px_rgba(var(--studio-accent),0.4)] scale-95" 
                        : "bg-studio-bg text-studio-muted hover:border-studio-accent/30"
                    )}
                  >
                    PAD {i + 1}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex items-center justify-between p-3 bg-studio-bg rounded-lg border border-studio-border">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-studio-muted uppercase">Last Message</span>
                  <span className="text-[10px] font-mono font-bold text-studio-accent">
                    {activeNote ? `NOTE ON: ${activeNote}` : 'IDLE...'}
                  </span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                         "w-1 h-4 rounded-full transition-all",
                         activeNote && i < (activeNote % 8) + 1 ? "bg-studio-accent" : "bg-white/5"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-studio-accent/5 border border-studio-accent/10 rounded-xl">
               <p className="text-[8px] font-bold text-studio-muted uppercase leading-relaxed">
                  <span className="text-studio-accent">PRO TIP:</span> External MIDI inputs are automatically routed to the selected VST or MIDI track. Enable "Input Echo" in the mixer to hear live monitoring.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
