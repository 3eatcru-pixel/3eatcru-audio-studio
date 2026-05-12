import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, Square, Mic, Upload, Settings, 
  Layers, Sliders, Wand2, Download, Save, 
  Plus, Trash2, Volume2, Music, Mic2, MessageSquare,
  ChevronRight, ChevronDown, Check, Info, AlertTriangle, Zap, Activity,
  MousePointer2, Hand, Scissors, ZoomIn, ZoomOut, BarChart3, Keyboard,
  Drum, Disc, Radio, Guitar, Wind, Waves, RotateCcw, RotateCw
} from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { Track, StudioState, MasterPreset, MidiNote } from '../types';
import { cn, formatTime, generateId } from '../lib/utils';
import { aiStudioService } from '../services/ai-studio-service';

// Child components will be extracted later if needed
import { WaveformView } from './WaveformView';
import { Mixer } from './Mixer';
import { TransportBar } from './TransportBar';
import { AIAssistant } from './AIAssistant';
import { EffectRack } from './EffectRack';
import { MidiEditor } from './MidiEditor';

interface MenuItem {
  label: string;
  shortcut?: string;
  url?: string;
  onClick?: () => void;
}

function MenuDropdown({ label, items, className = "w-48" }: { label: string, items: MenuItem[], className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-2 py-1 hover:text-studio-text transition-colors rounded hover:bg-studio-border/30",
          isOpen && "bg-studio-border text-studio-text"
        )}
      >
        {label}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={cn(
              "absolute top-full left-0 mt-1 bg-studio-panel border border-studio-border rounded shadow-2xl z-[150] p-1 flex flex-col",
              className
            )}
          >
            {items.map((item, i) => {
              if (item.label === 'divider') {
                return <div key={i} className="h-px bg-studio-border my-1 mx-1" />;
              }
              
              const content = (
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.url && <ChevronRight size={10} className="text-studio-muted" />}
                  </span>
                  {item.shortcut && <span className="text-[10px] font-mono text-studio-muted">{item.shortcut}</span>}
                </div>
              );

              if (item.url) {
                return (
                  <a 
                    key={i} 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 hover:bg-studio-accent hover:text-white rounded text-[11px] font-medium transition-colors flex items-center"
                    onClick={() => setIsOpen(false)}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <button 
                  key={i} 
                  className="px-3 py-1.5 hover:bg-studio-accent hover:text-white rounded text-left text-[11px] font-medium transition-colors"
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    setIsOpen(false);
                  }}
                >
                  {content}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Studio() {
  const [state, setState] = useState<StudioState>({
    isPlaying: false,
    isRecording: false,
    currentTime: 0,
    duration: 0,
    bpm: 120,
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
      }
    ],
    selectedTrackId: 'track-1',
    zoom: 50
  });

  const [activeTab, setActiveTab] = useState<'mixer' | 'effects' | 'ai' | 'analyze' | 'midi'>('mixer');
  const [masterPreset, setMasterPreset] = useState<MasterPreset>('Pop');
  const [showLanding, setShowLanding] = useState(true);
  const [toolMode, setToolMode] = useState<'selection' | 'grab' | 'cut'>('selection');
  const [sidebarTab, setSidebarTab] = useState<'tracks' | 'browser'>('tracks');
  const [browserSearch, setBrowserSearch] = useState('');

  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<StudioState[]>([]);
  const [redoStack, setRedoStack] = useState<StudioState[]>([]);
  const isInteracting = useRef(false);

  const pushToUndo = (s: StudioState, force = false) => {
    if (!force && isInteracting.current) return;
    setUndoStack(prev => [...prev.slice(-49), s]);
    setRedoStack([]); // Clear redo on new action
  };

  const startInteraction = () => {
    if (!isInteracting.current) {
      pushToUndo(state, true);
      isInteracting.current = true;
    }
  };

  const endInteraction = () => {
    isInteracting.current = false;
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const prevState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, state]);
    setUndoStack(prev => prev.slice(0, -1));
    setState(prevState);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, state]);
    setRedoStack(prev => prev.slice(0, -1));
    setState(nextState);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, state]);

  const INSTRUMENT_LIBRARY = [
    { name: '808 Fat Kit', type: 'drum', icon: <Drum size={12} className="text-yellow-500" />, desc: 'Deep sub kicks' },
    { name: 'Neo-Soul Keys', type: 'midi', icon: <Keyboard size={12} className="text-purple-400" />, desc: 'Silky smooth Rhodes' },
    { name: 'Sub Bass Pro', type: 'synth', icon: <Radio size={12} className="text-emerald-500" />, desc: 'Room-shaking low end' },
    { name: 'Lo-Fi Grand', type: 'sampler', icon: <Disc size={12} className="text-pink-500" />, desc: 'Warm, worn-out piano' },
    { name: 'Electric Strat', type: 'midi', icon: <Guitar size={12} className="text-blue-400" />, desc: 'Clean DI electric guitar' },
    { name: 'Midnight Sax', type: 'midi', icon: <Wind size={12} className="text-amber-500" />, desc: 'Smooth solo saxophone' },
    { name: 'Acoustic Kit', type: 'drum', icon: <Drum size={12} className="text-orange-400" />, desc: 'Natural studio drums' },
    { name: 'Space Pad', type: 'synth', icon: <Radio size={12} className="text-teal-400" />, desc: 'Ambient evolving textures' },
    { name: 'Cinematic Strings', type: 'midi', icon: <Keyboard size={12} className="text-indigo-400" />, desc: 'Full string ensemble' },
    { name: 'Trap Percussion', type: 'drum', icon: <Drum size={12} className="text-yellow-600" />, desc: 'Sharp hits and rolls' },
    { name: 'Dreamy Rhodes', type: 'sampler', icon: <Disc size={12} className="text-cyan-400" />, desc: 'Phase-shifted electic piano' },
    { name: 'Liquid Bass', type: 'synth', icon: <Waves size={12} className="text-blue-600" />, desc: 'Moving resonant bass' },
    { name: 'Spanish Nylon', type: 'midi', icon: <Guitar size={12} className="text-orange-700" />, desc: 'Warm classical guitar' },
    { name: 'Brass Punch', type: 'midi', icon: <Wind size={12} className="text-yellow-400" />, desc: 'Aggressive horn section' },
    { name: 'Dark Techno Kick', type: 'drum', icon: <Drum size={12} className="text-red-600" />, desc: 'Industrial impact' },
    { name: 'Analog Lead', type: 'synth', icon: <Radio size={12} className="text-lime-400" />, desc: 'Moog-style resonant lead' },
  ];

  const filteredLibrary = INSTRUMENT_LIBRARY.filter(item => 
    item.name.toLowerCase().includes(browserSearch.toLowerCase())
  );

  // Simulation: Increment time when playing
  useEffect(() => {
    let interval: any;
    if (state.isPlaying) {
      interval = setInterval(() => {
        setState(s => ({ ...s, currentTime: s.currentTime + 0.1 }));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [state.isPlaying]);

  const addTrack = (type: 'instrumental' | 'vocal' | 'midi' | 'drum' | 'sampler' | 'synth', name?: string) => {
    pushToUndo(state);
    const newTrack: Track = {
      id: generateId(),
      name: name || (
            type === 'vocal' ? `Vocal ${state.tracks.filter(t => t.type === 'vocal').length + 1}` : 
            type === 'midi' ? `Piano ${state.tracks.filter(t => t.type === 'midi').length + 1}` :
            type === 'drum' ? `Drum Machine ${state.tracks.filter(t => t.type === 'drum').length + 1}` :
            type === 'sampler' ? `Sampler ${state.tracks.filter(t => t.type === 'sampler').length + 1}` :
            type === 'synth' ? `Analog Synth ${state.tracks.filter(t => t.type === 'synth').length + 1}` : 'New Track'),
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
    setState(prev => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
      selectedTrackId: newTrack.id
    }));
    if (type !== 'instrumental' && type !== 'vocal') setActiveTab('midi');
  };

  const removeTrack = (id: string) => {
    pushToUndo(state);
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.filter(t => t.id !== id),
      selectedTrackId: prev.selectedTrackId === id ? (prev.tracks[0]?.id || null) : prev.selectedTrackId
    }));
  };

  const togglePlayback = () => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, trackId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      pushToUndo(state);
      const url = URL.createObjectURL(file);
      setState(prev => ({
        ...prev,
        tracks: prev.tracks.map(t => t.id === trackId ? { ...t, url, name: file.name } : t)
      }));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-studio-bg text-studio-text overflow-hidden font-sans">
      <AnimatePresence>
        {showLanding && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-studio-bg flex items-center justify-center p-6"
          >
            <div className="max-w-2xl w-full text-center flex flex-col items-center gap-8">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-20 h-20 bg-studio-accent rounded-2xl flex items-center justify-center shadow-2xl shadow-studio-accent/20"
              >
                <Music size={40} className="text-white" />
              </motion.div>
              
              <div className="space-y-4">
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl font-black tracking-tighter uppercase"
                >
                  Gemini Audio Studio
                </motion.h1>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-studio-muted text-lg font-medium"
                >
                  The world's first professional free music studio powered entirely by AI.
                  Record, mix, and master with studio-grade tools in your browser.
                </motion.p>
              </div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-3 gap-6 w-full mt-4"
              >
                {[
                  { icon: <Mic2 size={24} />, title: "AI Vocal Pro", desc: "Studio-grade pitch correction" },
                  { icon: <Wand2 size={24} />, title: "Smart Mix", desc: "Automated frequency balancing" },
                  { icon: <Zap size={24} />, title: "Mastering", desc: "Loudness for all platforms" }
                ].map((feature, i) => (
                  <div key={i} className="p-4 rounded-xl border border-studio-border bg-studio-panel/50 hover:border-studio-accent transition-colors group">
                    <div className="text-studio-accent mb-3 group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-1">{feature.title}</h3>
                    <p className="text-[10px] text-studio-muted leading-tight">{feature.desc}</p>
                  </div>
                ))}
              </motion.div>

              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={() => setShowLanding(false)}
                className="group relative px-8 py-4 bg-studio-text text-studio-bg rounded-full font-black uppercase tracking-widest text-sm hover:px-12 transition-all overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Start Creating Now <ChevronRight size={18} />
                </span>
                <div className="absolute inset-0 bg-studio-accent translate-y-full group-hover:translate-y-0 transition-transform" />
              </motion.button>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-[10px] uppercase font-mono tracking-[0.3em] text-studio-muted"
              >
                AI Assisted Processing • 48kHz / 24-bit • Zero Watermarks
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="h-12 border-bottom border-studio-border bg-studio-panel flex items-center px-4 justify-between">
        {/* ... existing header content ... */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-studio-accent rounded-sm flex items-center justify-center">
              <Music size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">GEMINI AUDIO STUDIO</span>
          </div>
          <div className="h-4 w-px bg-studio-border mx-2" />
          <nav className="flex gap-1 text-xs font-medium text-studio-muted">
            <MenuDropdown 
              label="File" 
              items={[
                { label: 'New Project', shortcut: 'Ctrl+N' },
                { label: 'Open...', shortcut: 'Ctrl+O' },
                { label: 'Save', shortcut: 'Ctrl+S' },
                { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
                { label: 'divider' },
                { label: 'Export (WAV)', shortcut: 'Ctrl+E' },
                { label: 'Export (MP3)' },
                { label: 'divider' },
                { label: 'Close', shortcut: 'Ctrl+W' }
              ]} 
            />
            <MenuDropdown 
              label="Edit" 
              items={[
                { label: 'Undo', shortcut: 'Ctrl+Z', onClick: undo },
                { label: 'Redo', shortcut: 'Ctrl+Y', onClick: redo },
                { label: 'divider' },
                { label: 'Cut', shortcut: 'Ctrl+X' },
                { label: 'Copy', shortcut: 'Ctrl+C' },
                { label: 'Paste', shortcut: 'Ctrl+V' },
                { label: 'divider' },
                { label: 'Select All', shortcut: 'Ctrl+A' }
              ]} 
            />
            <MenuDropdown 
              label="View" 
              items={[
                { label: 'Show/Hide Mixer', shortcut: 'F2' },
                { label: 'Show/Hide FX Rack', shortcut: 'F3' },
                { label: 'Show/Hide AI Assistant', shortcut: 'F4' },
                { label: 'divider' },
                { label: 'Theme (Dark/Light)' },
                { label: 'Reset Layout' }
              ]} 
            />
            <MenuDropdown 
              label="Project" 
              items={[
                { label: 'Project Info' },
                { label: 'BPM Setup' },
                { label: 'Mastering Settings' },
                { label: 'divider' },
                { label: 'Consolidate Tracks' }
              ]} 
            />
            <MenuDropdown 
              label="Help" 
              className="w-56"
              items={[
                { label: 'Documentation' },
                { label: 'Shortcuts List' },
                { label: 'divider' },
                { label: 'Official Website', url: 'http://www.3eatcru.com.br' },
                { label: 'YouTube Channel', url: 'https://www.youtube.com/@3eatcru' },
                { label: 'Spotify Artist', url: 'https://open.spotify.com/user/31fvxyhsos3p7bokgtuomcspvh5a?si=070d5c8e89af4028' },
                { label: 'Instagram', url: 'https://www.instagram.com/3eatcru' },
                { label: 'TikTok', url: 'https://www.tiktok.com/@3eatcru' },
                { label: 'Facebook', url: 'https://www.facebook.com/3eatcru' },
                { label: 'Dailymotion', url: 'https://www.dailymotion.com/3eatcru' },
                { label: '3eatcru Blog', url: 'https://3eatcru.blogspot.com/' },
                { label: 'WhatsApp Group', url: 'https://chat.whatsapp.com/IW3zLjIEUtIDZWkisJG95N' },
                { label: 'divider' },
                { label: 'Email Support', url: 'mailto:3eatcru@gmail.com' },
                { label: 'About 3eatcru' }
              ]} 
            />
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-studio-bg rounded border border-studio-border px-2 py-1 gap-2">
            <Wand2 size={12} className="text-studio-accent" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-studio-muted">AI Mastering:</span>
            <select 
              value={masterPreset}
              onChange={(e) => setMasterPreset(e.target.value as MasterPreset)}
              className="bg-transparent text-[10px] font-bold focus:outline-none cursor-pointer"
            >
              {['Pop', 'Trap', 'Rock', 'Sertanejo', 'Lo-Fi', 'Electronic'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <button className="bg-studio-accent hover:bg-blue-600 px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all">
            <Download size={12} /> EXPORT
          </button>
        </div>
      </header>

      {/* Audacity-style Toolbar */}
      <div className="h-10 border-bottom border-studio-border bg-studio-panel/80 flex items-center px-4 gap-4">
        <div className="flex bg-studio-bg border border-studio-border rounded p-0.5">
          <button 
            onClick={undo}
            disabled={undoStack.length === 0}
            className={cn(
              "p-1.5 rounded transition-all",
              undoStack.length === 0 ? "text-studio-muted/20" : "hover:bg-studio-border text-studio-muted hover:text-studio-text"
            )}
            title="Undo (Ctrl+Z)"
          >
            <motion.div whileTap={{ scale: 0.9 }} rotate={-90}>
              <RotateCcw size={14} />
            </motion.div>
          </button>
          <button 
            onClick={redo}
            disabled={redoStack.length === 0}
            className={cn(
              "p-1.5 rounded transition-all",
              redoStack.length === 0 ? "text-studio-muted/20" : "hover:bg-studio-border text-studio-muted hover:text-studio-text"
            )}
            title="Redo (Ctrl+Y)"
          >
            <motion.div whileTap={{ scale: 0.9 }}>
              <RotateCw size={14} />
            </motion.div>
          </button>
        </div>

        <div className="h-4 w-px bg-studio-border" />

        <div className="flex bg-studio-bg border border-studio-border rounded p-0.5">
          <button 
            onClick={() => setToolMode('selection')}
            className={cn(
              "p-1.5 rounded transition-all",
              toolMode === 'selection' ? "bg-studio-accent text-white" : "hover:bg-studio-border text-studio-muted"
            )}
            title="Selection Tool (S)"
          >
            <MousePointer2 size={14} />
          </button>
          <button 
            onClick={() => setToolMode('grab')}
            className={cn(
              "p-1.5 rounded transition-all",
              toolMode === 'grab' ? "bg-studio-accent text-white" : "hover:bg-studio-border text-studio-muted"
            )}
            title="Grab/Move Tool (G)"
          >
            <Hand size={14} />
          </button>
          <button 
            onClick={() => setToolMode('cut')}
            className={cn(
              "p-1.5 rounded transition-all",
              toolMode === 'cut' ? "bg-studio-accent text-white" : "hover:bg-studio-border text-studio-muted"
            )}
            title="Cut Tool (C)"
          >
            <Scissors size={14} />
          </button>
        </div>

        <div className="h-4 w-px bg-studio-border" />

        <div className="flex items-center gap-3">
          <ZoomOut size={12} className="text-studio-muted" />
          <input 
            type="range"
            min="10"
            max="200"
            value={state.zoom}
            onChange={(e) => setState(s => ({ ...s, zoom: parseInt(e.target.value) }))}
            className="w-32 h-1 bg-studio-border rounded-full appearance-none accent-studio-accent cursor-pointer"
          />
          <ZoomIn size={12} className="text-studio-muted" />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-studio-muted">SAMPLE RATE: 48kHz</span>
          <div className="h-4 w-px bg-studio-border" />
          <span className="text-[10px] font-mono text-studio-muted">LATENCY: 12ms</span>
        </div>
      </div>

      {/* Main Studio Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Track List (Left Sidebar) */}
        <aside className="w-64 border-right border-studio-border bg-studio-panel/50 flex flex-col">
          <div className="p-3 border-bottom border-studio-border flex justify-between items-center bg-studio-panel">
            <div className="flex gap-4">
              <button 
                onClick={() => setSidebarTab('tracks')}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-all",
                  sidebarTab === 'tracks' ? "text-studio-text" : "text-studio-muted"
                )}
              >
                Tracks
              </button>
              <button 
                onClick={() => setSidebarTab('browser')}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-all",
                  sidebarTab === 'browser' ? "text-studio-text" : "text-studio-muted"
                )}
              >
                Browser
              </button>
            </div>
            <div className="flex gap-1">
              {sidebarTab === 'tracks' ? (
                <>
                  <button 
                    onClick={() => addTrack('instrumental')}
                    className="p-1 hover:bg-studio-border rounded transition-colors"
                    title="Add Audio Track"
                  >
                    <Plus size={14} />
                  </button>
                  <button 
                    onClick={() => addTrack('vocal')}
                    className="p-1 hover:bg-studio-border rounded transition-colors text-studio-record"
                    title="Add Vocal Track"
                  >
                    <Mic size={14} />
                  </button>
                  <button 
                    onClick={() => addTrack('midi')}
                    className="p-1 hover:bg-studio-border rounded transition-colors text-purple-400"
                    title="Add MIDI Track"
                  >
                    <Keyboard size={14} />
                  </button>
                  <button 
                    onClick={() => addTrack('drum')}
                    className="p-1 hover:bg-studio-border rounded transition-colors text-yellow-500"
                    title="Add Drum Machine"
                  >
                    <Drum size={14} />
                  </button>
                  <button 
                    onClick={() => addTrack('sampler')}
                    className="p-1 hover:bg-studio-border rounded transition-colors text-pink-500"
                    title="Add Sampler"
                  >
                    <Disc size={14} />
                  </button>
                  <button 
                    onClick={() => addTrack('synth')}
                    className="p-1 hover:bg-studio-border rounded transition-colors text-emerald-500"
                    title="Add Analog Synth"
                  >
                    <Radio size={14} />
                  </button>
                </>
              ) : (
                <button className="p-1 hover:bg-studio-border rounded" title="Refresh Files">
                  <Activity size={12} className="text-studio-accent" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto track-list">
            {sidebarTab === 'tracks' ? (
              state.tracks.map(track => (
                <div 
                  key={track.id}
                  onClick={() => setState(s => ({ ...s, selectedTrackId: track.id }))}
                  className={cn(
                    "p-3 border-bottom border-studio-border cursor-pointer transition-all border-l-4 group",
                    state.selectedTrackId === track.id ? "bg-studio-border/30" : "hover:bg-studio-border/10",
                    track.id === state.selectedTrackId ? "border-studio-accent" : "border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {track.type === 'vocal' ? <Mic2 size={12} className="text-studio-record shrink-0" /> : 
                       track.instrument === '808 Kit' ? <Drum size={12} className="text-yellow-500 shrink-0" /> :
                       track.instrument === 'Sampler Pro' ? <Disc size={12} className="text-pink-500 shrink-0" /> :
                       track.instrument === 'Lead Synth' ? <Radio size={12} className="text-emerald-500 shrink-0" /> :
                       track.type === 'midi' ? <Keyboard size={12} className="text-purple-400 shrink-0" /> :
                       <Music size={12} className="text-studio-accent shrink-0" />}
                      <span className="text-[11px] font-medium truncate uppercase tracking-tight">{track.name}</span>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button className="p-1 hover:bg-studio-accent rounded transition-colors" title="Duplicate">
                          <Layers size={10} />
                       </button>
                       <button 
                        onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                        className="p-1 hover:text-studio-record transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex h-5 items-center gap-0.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setState(s => ({ ...s, tracks: s.tracks.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t) })) }}
                        className={cn("w-6 h-full border border-studio-border rounded-sm text-[9px] font-bold", track.muted && "bg-yellow-600 text-white")}
                      >M</button>
                      <button className="w-6 h-full border border-studio-border rounded-sm text-[9px] font-bold hover:bg-studio-border">S</button>
                      <button className="w-6 h-full border border-studio-border rounded-sm text-[9px] font-bold hover:bg-studio-record flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-studio-record" />
                      </button>
                    </div>
                    <div className="flex-1 h-5 bg-studio-bg rounded-sm border border-studio-border relative overflow-hidden">
                      <div 
                        className="h-full bg-studio-accent/20 border-r border-studio-accent"
                        style={{ width: `${track.volume * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col h-full bg-studio-bg/30">
                <div className="p-3 border-b border-studio-border bg-studio-panel/50">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Search instruments..."
                      value={browserSearch}
                      onChange={(e) => setBrowserSearch(e.target.value)}
                      className="w-full bg-studio-bg border border-studio-border rounded-md px-8 py-1.5 text-[10px] focus:outline-none focus:border-studio-accent transition-colors"
                    />
                    <Music size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-studio-muted" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-studio-muted px-2">Library</span>
                    <div className="space-y-0.5">
                      {filteredLibrary.map(item => (
                        <div 
                          key={item.name} 
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-studio-border/30 cursor-pointer group transition-colors"
                          onClick={() => addTrack(item.type as any, item.name)}
                        >
                           <div className="w-8 h-8 rounded bg-studio-panel border border-studio-border flex items-center justify-center group-hover:border-studio-accent/50 transition-colors">
                             {item.icon}
                           </div>
                           <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-[11px] font-bold truncate text-studio-text group-hover:text-studio-accent transition-colors">{item.name}</span>
                              <div className="flex items-center gap-1.5 leading-none mt-0.5">
                                 <span className="text-[7px] font-black text-studio-muted uppercase tracking-tighter border border-studio-border px-1 rounded-sm group-hover:border-studio-accent/30 transition-colors">{item.type}</span>
                                 <span className="text-[8px] text-studio-muted truncate">{(item as any).desc}</span>
                              </div>
                           </div>
                           <Plus size={10} className="opacity-0 group-hover:opacity-100 text-studio-accent" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-studio-muted px-2 opacity-50">Recent Samples</span>
                    <div className="space-y-1 px-2">
                      {['Kick_Fat_01.wav', 'Snare_Dry.wav'].map(file => (
                        <div key={file} className="flex items-center gap-2 p-1 text-[10px] text-studio-muted hover:text-studio-text cursor-pointer">
                           <Music size={8} className="text-studio-muted/50" />
                           <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Timeline Area (Center) */}
        <section className="flex-1 flex flex-col relative bg-studio-bg">
          <div className="flex-1 relative overflow-hidden">
            {/* Timeline Ruler */}
            <div className="h-6 border-bottom border-studio-border bg-studio-panel/30 flex items-end">
              <div className="flex w-full px-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="flex-1 h-3 border-l border-studio-border/50 text-[8px] font-mono pl-1 text-studio-muted">
                    {(i * 10).toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-white z-20 shadow-[0_0_8px_rgba(255,255,255,0.5)] pointer-events-none"
              style={{ left: `${(state.currentTime / (state.duration || 300)) * 100}%` }}
            />

            {/* Tracks Waveforms */}
            <div className="flex flex-col gap-[1px]">
              {state.tracks.map(track => (
                <WaveformView 
                  key={track.id}
                  track={track}
                  isRecording={state.isRecording && state.selectedTrackId === track.id}
                  isSelected={state.selectedTrackId === track.id}
                  zoom={state.zoom}
                  onUpload={(e) => handleFileUpload(e, track.id)}
                  onShift={(delta) => {
                    pushToUndo(state);
                    setState(s => ({
                      ...s,
                      tracks: s.tracks.map(t => t.id === track.id ? { ...t, startTime: t.startTime + delta } : t)
                    }));
                  }}
                />
              ))}
            </div>
          </div>

          {/* Bottom Panel (Mixer / Effects / AI) */}
          <div className="h-64 border-top border-studio-border bg-studio-panel flex flex-col">
            <div className="flex h-10 border-bottom border-studio-border px-4 items-center justify-between">
              <div className="flex gap-6 h-full">
                <button 
                  onClick={() => setActiveTab('mixer')}
                  className={cn(
                    "h-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all px-2",
                    activeTab === 'mixer' ? "border-studio-accent text-studio-text" : "border-transparent text-studio-muted"
                  )}
                >
                  <Sliders size={12} /> Mixer
                </button>
                <button 
                  onClick={() => setActiveTab('effects')}
                  className={cn(
                    "h-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all px-2",
                    activeTab === 'effects' ? "border-studio-accent text-studio-text" : "border-transparent text-studio-muted"
                  )}
                >
                  <Layers size={12} /> FX Rack
                </button>
                <button 
                  onClick={() => setActiveTab('ai')}
                  className={cn(
                    "h-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all px-2",
                    activeTab === 'ai' ? "border-studio-accent text-studio-text" : "border-transparent text-studio-muted"
                  )}
                >
                  <Wand2 size={12} /> AI Advisor
                </button>
                <button 
                  onClick={() => setActiveTab('analyze')}
                  className={cn(
                    "h-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all px-2",
                    activeTab === 'analyze' ? "border-studio-accent text-studio-text" : "border-transparent text-studio-muted"
                  )}
                >
                  <BarChart3 size={12} /> Analyze
                </button>
                <button 
                  onClick={() => setActiveTab('midi')}
                  className={cn(
                    "h-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all px-2",
                    activeTab === 'midi' ? "border-studio-accent text-studio-text" : "border-transparent text-studio-muted"
                  )}
                >
                  <Keyboard size={12} /> Piano Roll
                </button>
              </div>
              
              <div className="text-[10px] font-mono text-studio-muted uppercase tracking-tighter">
                Track: {state.tracks.find(t => t.id === state.selectedTrackId)?.name || 'None'}
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden p-4">
              <AnimatePresence mode="wait">
                {activeTab === 'mixer' && (
                  <motion.div 
                    key="mixer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full"
                  >
                    <Mixer 
                      tracks={state.tracks} 
                      selectedId={state.selectedTrackId} 
                      onInteractionStart={startInteraction}
                      onInteractionEnd={endInteraction}
                      onUpdateTrack={(id, updates) => {
                        setState(s => ({
                          ...s,
                          tracks: s.tracks.map(t => t.id === id ? { ...t, ...updates } : t)
                        }));
                      }} 
                    />
                  </motion.div>
                )}
                {activeTab === 'effects' && (
                  <motion.div 
                    key="effects"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full"
                  >
                    <EffectRack 
                      track={state.tracks.find(t => t.id === state.selectedTrackId)} 
                      onInteractionStart={startInteraction}
                      onInteractionEnd={endInteraction}
                      onUpdateEffects={(effects) => {
                        pushToUndo(state, true);
                        setState(s => ({
                          ...s,
                          tracks: s.tracks.map(t => t.id === state.selectedTrackId ? { ...t, effects } : t)
                        }));
                      }}
                    />
                  </motion.div>
                )}
                {activeTab === 'ai' && (
                  <motion.div 
                    key="ai"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full"
                  >
                    <AIAssistant />
                  </motion.div>
                )}
                {activeTab === 'midi' && (
                  <motion.div 
                    key="midi"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="h-full"
                  >
                    {state.tracks.find(t => t.id === state.selectedTrackId)?.type === 'midi' ? (
                      <MidiEditor 
                        track={state.tracks.find(t => t.id === state.selectedTrackId)!} 
                        onUpdateNotes={(notes) => {
                          pushToUndo(state);
                          setState(s => ({
                            ...s,
                            tracks: s.tracks.map(t => t.id === state.selectedTrackId ? { ...t, notes } : t)
                          }));
                        }}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-studio-muted gap-4">
                        <Keyboard size={32} className="opacity-20" />
                        <div className="text-center">
                          <p className="text-[10px] uppercase font-bold tracking-widest">No MIDI Track Selected</p>
                          <button 
                            onClick={() => addTrack('midi')}
                            className="mt-2 text-[10px] text-studio-accent font-bold hover:underline"
                          >
                            Create MIDI Track
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
                {activeTab === 'analyze' && (
                  <motion.div 
                    key="analyze"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full flex flex-col gap-4"
                  >
                    <div className="flex h-full gap-6">
                      <div className="flex-1 bg-studio-bg rounded border border-studio-border p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-studio-muted">Frequency Spectrum (FFT)</span>
                          <div className="flex gap-2">
                             <span className="text-[9px] font-mono text-studio-accent">Peak: 440Hz / -12dB</span>
                          </div>
                        </div>
                        <div className="flex-1 border-l border-b border-studio-border relative flex items-end gap-[2px] pt-4">
                          {/* Simulated Spectrum Plot */}
                          {Array.from({ length: 48 }).map((_, i) => {
                            const val = Math.sin(i * 0.2) * 50 + 40 + Math.random() * 10;
                            return (
                              <div 
                                key={i} 
                                className="flex-1 bg-studio-accent/40 rounded-t-sm hover:bg-studio-accent transition-all cursor-crosshair"
                                style={{ height: `${val}%` }}
                                title={`${Math.round(i * 440)} Hz`}
                              />
                            );
                          })}
                          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-studio-border" />
                        </div>
                        <div className="flex justify-between text-[8px] font-mono text-studio-muted">
                          <span>20Hz</span>
                          <span>200Hz</span>
                          <span>2kHz</span>
                          <span>20kHz</span>
                        </div>
                      </div>

                      <div className="w-64 shrink-0 flex flex-col gap-3">
                        <div className="p-3 rounded bg-studio-panel border border-studio-border space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <Info size={12} className="text-studio-accent" /> Statistics
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-studio-muted uppercase">Peak Level</span>
                              <span className="font-mono">-0.1 dB</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-studio-muted uppercase">RMS</span>
                              <span className="font-mono">-14.2 dB</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-studio-muted uppercase">Dynamic Range</span>
                              <span className="font-mono">12.5 dB</span>
                            </div>
                          </div>
                        </div>
                        <button className="w-full py-2 rounded bg-studio-accent/20 border border-studio-accent/40 hover:bg-studio-accent/30 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                           <Save size={12} /> Export CSV Data
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>

      {/* Transport Bar (Footer) */}
      <TransportBar 
        state={state} 
        onTogglePlay={togglePlayback}
        onToggleRecord={() => setState(s => ({ ...s, isRecording: !s.isRecording }))}
        onUpdateState={(updates) => setState(s => ({ ...s, ...updates }))}
      />
    </div>
  );
}
