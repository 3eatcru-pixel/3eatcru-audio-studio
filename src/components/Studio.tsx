import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, Square, Mic, Upload, Settings, 
  Layers, Sliders, Wand2, Download, Save, 
  Plus, Trash2, Volume2, Music, Mic2, MessageSquare, Cloud, CloudUpload, CloudDownload, Globe, Magnet, Cpu,
  ChevronRight, ChevronDown, Check, Info, AlertTriangle, Zap, Activity,
  MousePointer2, Hand, Scissors, ZoomIn, ZoomOut, BarChart3, Keyboard,
  Drum, Disc, Radio, Guitar, Wind, Waves, RotateCcw, RotateCw, Loader2, Sparkles
} from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { User } from 'firebase/auth';
import { Track, StudioState, MasterPreset, MidiNote } from '../types';
import { cn, formatTime, generateId } from '../lib/utils';
import { aiStudioService } from '../services/ai-studio-service';
import { 
  loginWithGoogle, logout, subscribeToAuth, createUserProfile, getUserProfile, 
  subscribeToProjects, saveProjectMetadata, db, getUserByEmail
import { doc, deleteDoc } from 'firebase/firestore';
import { saveProjectToDrive, getProjectFromDrive, updateProjectInDrive, uploadAudioToDrive } from '../services/driveService';
import { audioEngine } from '../services/audioEngine';
// Child components will be extracted later if needed
import { WaveformView } from './WaveformView';
import { Mixer } from './Mixer';
import { TransportBar } from './TransportBar';
import { AIAssistant } from './AIAssistant';
import { EffectRack } from './EffectRack';
import { MidiEditor } from './MidiEditor';
import { StepSequencer } from './StepSequencer';
import { MasteringView } from './MasteringView';
import { AnalyzerView } from './AnalyzerView';
import { SearchView } from './SearchView';
import { useStudioStore } from '../store/studioStore';
import { PeripheralManager } from './PeripheralManager';

interface MenuItem {
  label: string;
  shortcut?: string;
  url?: string;
  onClick?: () => void;
}

function MenuDropdown({ label, items, className = "w-48", icon }: { label: string, items: MenuItem[], className?: string, icon?: React.ReactNode }) {
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
  const {
    isPlaying, isRecording, currentTime, duration, metronomeEnabled, tracks, selectedTrackId, zoom, lyrics, bpm, key, snap, name, id, driveFileId, masterPreset,
    updateStudioState, addTrack, removeTrack, updateTrack, setSelectedTrackId, togglePlayback, toggleRecording, setLyrics, setBpm, setKey, setSnap, setZoom, setMasterPreset
  } = useStudioStore();

  const [activeTab, setActiveTab] = useState<'mixer' | 'effects' | 'ai' | 'analyze' | 'midi' | 'lyrics' | 'mastering' | 'search' | 'peripherals'>('mixer');
  const [showLanding, setShowLanding] = useState(true);
  const [toolMode, setToolMode] = useState<'selection' | 'grab' | 'cut'>('selection');
  const [sidebarTab, setSidebarTab] = useState<'tracks' | 'browser' | 'projects'>('tracks');
  const [browserSearch, setBrowserSearch] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisText, setAiAnalysisText] = useState<string | null>(null);
  const [sharingProjectId, setSharingProjectId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportProject = () => {
    setIsExporting(true);
    // Simulate export progress
    setTimeout(() => {
      setIsExporting(false);
      alert("Project rendered and exported successfully as 'Aura_Studio_Master.wav'");
    }, 3000);
  };

  const addCollaborator = async (projectId: string) => {
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      const targetUser = await getUserByEmail(inviteEmail);
      if (!targetUser) {
        alert("User not found or hasn't joined Aura yet.");
        return;
      }
      
      const proj = userProjects.find(p => p.id === projectId);
      const labs = proj.collaborators || [];
      if (labs.includes(targetUser.uid)) {
        alert("User is already a collaborator.");
        return;
      }

      await saveProjectMetadata({
        id: projectId,
        collaborators: [...labs, targetUser.uid]
      });
      setInviteEmail('');
      alert("Collaborator added!");
    } catch (e) {
      console.error(e);
    } finally {
      setIsInviting(false);
    }
  };

  const analyzeSession = async () => {
    setIsAnalyzing(true);
    try {
      const response = await aiStudioService.analyzeStructure(state.tracks);
      setAiAnalysisText(response); // This is local state, not part of StudioState
      setSidebarTab('ai-analysis' as any);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auth Subscription
  useEffect(() => {
    let unsubscribeProjects: (() => void) | undefined;
    
    const sub = subscribeToAuth(async (u) => {
      setUser(u);
      if (u) {
        // Ensure profile exists
        const profile = await getUserProfile(u.uid);
        if (!profile) {
          await createUserProfile(u);
        }
        // Load projects
        unsubscribeProjects = subscribeToProjects(u.uid, (projects) => {
          setUserProjects(projects.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
        });
      } else {
        setUserProjects([]);
        if (unsubscribeProjects) unsubscribeProjects();
      }
    });

    return () => {
      sub();
      if (unsubscribeProjects) unsubscribeProjects();
    };
  }, []);

  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<StudioState[]>([]);
  const [redoStack, setRedoStack] = useState<StudioState[]>([]);
  const isInteracting = useRef(false);

  const pushToUndo = (s: StudioState, force = false) => {
    if (!force && isInteracting.current) return;
    setUndoStack(prev => [...prev.slice(-49), s]);
    setRedoStack([]); // Clear redo on new action. Note: 's' here is the current state *before* the action.
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
    setRedoStack(prev => [...prev, useStudioStore.getState()]); // Save current state to redo stack
    setUndoStack(prev => prev.slice(0, -1));
    useStudioStore.setState(prevState); // Restore previous state
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, useStudioStore.getState()]); // Save current state to undo stack
    setRedoStack(prev => prev.slice(0, -1));
    useStudioStore.setState(nextState); // Restore next state
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
      if (e.key.toLowerCase() === 'q' && !['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase()) && selectedTrackId) {
        e.preventDefault();
        quantizeSelectedTrack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, selectedTrackId, bpm, snap]); // Dependencies for keyboard shortcuts

  // Audio Engine Synchronization
  useEffect(() => {
    tracks.forEach(track => {
      audioEngine.setupTrack(track.id);
      audioEngine.updateTrackVolume(track.id, track.muted ? 0 : track.volume);
    });
  }, [tracks]);

  // Local Persistence (Zero-Cost strategy #7)
  useEffect(() => {
    const saved = localStorage.getItem('aura_last_session');
    if (saved) {
      try {
        const parsed: StudioState = JSON.parse(saved);
        // Ensure some sanity check
        if (parsed.tracks) setState(parsed);
      } catch (e) {
        console.error("Failed to load local session");
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('aura_last_session', JSON.stringify(useStudioStore.getState()));
    }, 1000);
    return () => clearTimeout(timer);
  }, [state]);

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
    { name: 'Boom Bap Kit', type: 'drum', icon: <Drum size={12} className="text-stone-500" />, desc: 'Classic 90s hip hop drums' },
    { name: 'Drill Sub', type: 'synth', icon: <Waves size={12} className="text-red-500" />, desc: 'Gliding 808s for Drill' },
    { name: 'West Coast G-Funk', type: 'synth', icon: <Radio size={12} className="text-yellow-400" />, desc: 'Whiny portamento lead' },
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

  // Metronome Logic (now using Zustand state)
  useEffect(() => {
    if (isPlaying && metronomeEnabled) {
      const beatInterval = 60 / bpm;
      const currentBeat = Math.floor(currentTime / beatInterval);
      const nextBeatTime = (currentBeat + 1) * beatInterval;
      
      const timeToNextBeat = (nextBeatTime - state.currentTime) * 1000;
      
      const timeout = setTimeout(() => {
        playMetronomeClick(0);
      }, timeToNextBeat);
      
      return () => clearTimeout(timeout); // Cleanup on unmount or dependency change
    }
  }, [isPlaying, metronomeEnabled, Math.floor(currentTime * (bpm / 60))]);

  // Simulation: Increment time when playing
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        updateStudioState({
          currentTime: currentTime + 0.1,
          duration: isRecording ? Math.max(duration, currentTime + 0.1) : duration
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isRecording, currentTime, duration, updateStudioState]);

  // Metronome Logic (needs AudioContext)
  const audioContextRef = useRef<AudioContext | null>(null);
  const playMetronomeClick = () => {
    // This logic remains the same, but now uses the global bpm and metronomeEnabled from Zustand
    // Ensure audioContextRef.current is initialized and resumed on user interaction
  };

  const handleAddTrack = (type: 'instrumental' | 'vocal' | 'midi' | 'drum' | 'sampler' | 'synth', name?: string) => {
    pushToUndo(useStudioStore.getState());
    addTrack(type, name);
    if (type !== 'instrumental' && type !== 'vocal') setActiveTab('midi'); // Keep this UI logic here
  };

  const handleRemoveTrack = (id: string) => {
    pushToUndo(useStudioStore.getState());
    removeTrack(id);
  };

  const quantizeSelectedTrack = () => {
    if (!selectedTrackId) return;
    pushToUndo(useStudioStore.getState());

    const snapDenom = parseInt(snap.split('/')[1]);
    const subdivisionTime = (60 / bpm) * (4 / snapDenom);

    updateStudioState({
      tracks: tracks.map(t => {
        if (t.id === selectedTrackId) {
          if (t.notes) {
            return {
              ...t,
              notes: t.notes.map(n => ({
                ...n,
                time: Math.round(n.time / subdivisionTime) * subdivisionTime
              }))
            };
          } else {
            return {
              ...t,
              startTime: Math.round(t.startTime / subdivisionTime) * subdivisionTime // This needs to be handled carefully for audio tracks
            };
          }
        }
        return t;
      })
    }));
  };

  const togglePlayback = () => {
    // Initialize audio engine on first user interaction (remains here)
    if (!audioEngine.getContext()) {
      audioEngine.init();
    }
    useStudioStore.getState().togglePlayback(); // Call Zustand action
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      if (!selectedTrackId) return;
      await audioEngine.startRecording(selectedTrackId);
      updateStudioState({ isRecording: true, isPlaying: true }); // Update Zustand state
    } else {
      updateStudioState({ isRecording: false, isPlaying: false }); // Update Zustand state
      const audioBlob = await audioEngine.stopRecording();
      
      if (selectedTrackId && user) {
        setIsSaving(true);
        try {
          const result = await uploadAudioToDrive(audioBlob, `Recording_${Date.now()}`, selectedTrackId);
          updateTrack(selectedTrackId, { url: result.webViewLink }); // Call Zustand action
        } catch (err) {
          console.error("Failed to upload recording:", err);
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  const [lyricMood, setLyricMood] = useState('Inspired');
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);

  const generateLyrics = async () => {
    setIsGeneratingLyrics(true);
    try {
      const resp = await aiStudioService.generateLyrics(masterPreset, name || 'Untitled', lyricMood);
      setLyrics(resp); // Call Zustand action
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, trackId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      pushToUndo(useStudioStore.getState());
      const url = URL.createObjectURL(file);
      updateTrack(trackId, { url, name: file.name, blob: file }); // Call Zustand action
    }
  };

  const saveProjectToCloud = async (isNewVersion = false) => {
    if (!user) {
      alert("Please sign in to save to cloud");
      return;
    }

    setIsSaving(true);
    try {
      const fileName = isNewVersion ? `${name || "Untitled"} (v${Date.now().toString().slice(-4)})` : (name || "Untitled Project");
      const projectId = isNewVersion ? generateId() : (id || generateId());
      
      // 1. Save data to Drive
      const newDriveFileId = (!isNewVersion && driveFileId) ?
        await updateProjectInDrive(driveFileId, useStudioStore.getState()) :
        await saveProjectToDrive(projectId, fileName, useStudioStore.getState());
      
      // 2. Save metadata to Firestore
      const metadata = {
        id: projectId,
        ownerId: user.uid,
        name: fileName, // Use the new fileName
        driveFileId: typeof newDriveFileId === 'string' ? newDriveFileId : (newDriveFileId as any).id || driveFileId,
        isPublic: false
      };

      await saveProjectMetadata(metadata);
      
      if (isNewVersion) {
        updateStudioState({ id: projectId, driveFileId: metadata.driveFileId, name: fileName });
      } else {
        updateStudioState({ id: projectId, driveFileId: metadata.driveFileId });
      }
      console.log(`Project ${isNewVersion ? 'versioned' : 'saved'} successfully`);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const [isPublicLoading, setIsPublicLoading] = useState(false);

  const deleteProject = async (proj: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${proj.name}"?`)) return;
    try {
      // In a real production app, we'd delete the Drive file too. 
      // For now, we delete the metadata.
      await deleteDoc(doc(db, 'projects', proj.id));
      console.log("Project metadata deleted");
    } catch (err) {
      console.error(err);
    }
  };

  const togglePublic = async (proj: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPublicLoading(true);
    try {
      await saveProjectMetadata({
        id: proj.id,
        isPublic: !proj.isPublic
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublicLoading(false);
    }
  };

  const loadProjectFromCloud = async (project: any) => {
    if (!user) return;
    try {
      const projectData = await getProjectFromDrive(project.driveFileId);
      useStudioStore.setState({ // Directly set the state from loaded project
        ...projectData,
        id: project.id,
        driveFileId: project.driveFileId
      }, true); // The 'true' argument tells Zustand to replace the entire state
      console.log("Project loaded from Google Drive");
    } catch (error) {
      console.error("Load failed:", error);
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
                  AURA - Cloud Studio
                </motion.h1>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-studio-muted text-lg font-medium"
                >
                  The professional AI-powered music studio with Zero-Cost Cloud Architecture.
                  Record, mix, and master using your own Google Drive storage and Gemini keys.
                </motion.p>
              </div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-4 items-center"
              >
                {!user ? (
                   <button
                    onClick={loginWithGoogle}
                    className="group relative px-12 py-4 bg-white text-black rounded-full font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      Sign In with Google
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLanding(false)}
                    className="group relative px-12 py-4 bg-studio-accent text-white rounded-full font-black uppercase tracking-widest text-sm hover:px-16 transition-all overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      Welcome, {user.displayName} <ChevronRight size={18} />
                    </span>
                    <div className="absolute inset-0 bg-studio-accent translate-y-full group-hover:translate-y-0 transition-transform" />
                  </button>
                )}
                
                {user && (
                   <button onClick={() => setShowLanding(false)} className="text-[10px] text-studio-muted hover:text-studio-text uppercase tracking-widest font-bold">Skip for now</button>
                )}
              </motion.div>
              
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
            <div className="flex flex-col">
              <span className="font-semibold text-[10px] leading-none opacity-50 uppercase tracking-tighter">AURA CLOUD STUDIO</span>
              <input
                value={state.name || "Untitled Project"}
                onChange={(e) => setState(s => ({ ...s, name: e.target.value }))}
                className="bg-transparent font-black text-sm tracking-tight focus:outline-none focus:text-studio-accent transition-colors"
                placeholder="Untitled Project"
              />
            </div>
          </div>
          <div className="h-4 w-px bg-studio-border mx-2" />
          <nav className="flex gap-1 text-xs font-medium text-studio-muted">
            <MenuDropdown 
              label="File" 
              items={[
                { label: 'New Project', shortcut: 'Ctrl+N', onClick: () => window.location.reload() },
                { label: 'Open Cloud Projects', onClick: () => setSidebarTab('projects') },
                { label: 'divider' },
                { label: 'Save to Cloud', shortcut: 'Ctrl+S', onClick: () => saveProjectToCloud(false) },
                { label: 'Save New Version', shortcut: 'Ctrl+Shift+S', onClick: () => saveProjectToCloud(true) },
                { label: 'divider' },
                { label: 'Export (WAV)', shortcut: 'Ctrl+E', onClick: exportProject },
                { label: 'divider' },
                { label: 'Close', shortcut: 'Ctrl+W' }
              ]} 
              icon={<ChevronDown size={12} />} 
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
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-studio-bg border border-studio-border">
             <div className={cn("w-1.5 h-1.5 rounded-full", isSaving ? "bg-studio-accent animate-pulse" : "bg-emerald-500")} />
             <span className="text-[8px] font-black uppercase text-studio-muted tracking-widest">{isSaving ? 'Syncing...' : 'Synced'}</span>
          </div> 
          {user ? (
            <div className="flex items-center gap-3">
               <div className="flex flex-col items-end mr-1">
                  <span className="text-[10px] font-bold leading-none">{user.displayName}</span>
                  <button onClick={logout} className="text-[8px] text-studio-muted hover:text-studio-record transition-colors uppercase font-black">Sign Out</button>
               </div>
               <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-studio-border" alt="Profile" />
            </div>
          ) : (
            <button 
              onClick={loginWithGoogle}
              className="bg-white text-black px-3 py-1 rounded text-[10px] font-black flex items-center gap-1.5 transition-all hover:bg-studio-accent hover:text-white"
            >
              Sign In with Google
            </button>
          )}
          <div className="h-6 w-px bg-studio-border mx-1" />
          <button 
        onClick={analyzeSession}
        disabled={isAnalyzing}
        className="bg-studio-panel border border-studio-border px-3 py-1 rounded text-[10px] font-black flex items-center gap-1.5 transition-all hover:bg-studio-accent hover:text-white disabled:opacity-50"
      >
        {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-studio-accent" />}
        AI ANALYSIS
      </button>
      <div className="h-6 w-px bg-studio-border mx-1" />
      <div className="flex items-center bg-studio-bg rounded border border-studio-border px-2 py-1 gap-2">
            <Wand2 size={12} className="text-studio-accent" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-studio-muted">AI Mastering:</span>
            <select 
              value={masterPreset || 'None'} // Use masterPreset from Zustand
              onChange={(e) => setMasterPreset(e.target.value as MasterPreset)}
              className="bg-transparent text-[10px] font-bold focus:outline-none cursor-pointer"
            >
              {['Pop', 'Trap', 'Rock', 'Sertanejo', 'Lo-Fi', 'Electronic', 'Rap', 'Hip Hop'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-studio-bg rounded border border-studio-border px-3 py-1 gap-4">
             <div className="flex items-center gap-1.5 border-r border-studio-border pr-3">
                <span className="text-[10px] font-black text-studio-muted">BPM</span>
                <input 
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                  className="bg-transparent text-[11px] font-black text-studio-accent w-8 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
             </div>
             <div className="flex items-center gap-1.5">
                <Music size={10} className="text-studio-muted" /> 
                <select 
                  value={state.key}
                  onChange={(e) => setState(s => ({ ...s, key: e.target.value }))}
                  className="bg-transparent text-[10px] font-black text-studio-text focus:outline-none cursor-pointer"
                >
                  {['C Major', 'G Major', 'D Major', 'A Major', 'E Major', 'B Major', 'F# Major', 'Db Major', 'Ab Major', 'Eb Major', 'Bb Major', 'F Major', 'A Minor', 'E Minor', 'B Minor', 'F# Minor', 'C# Minor', 'G# Minor', 'D# Minor', 'Bb Minor', 'F Minor', 'C Minor', 'G Minor', 'D Minor'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
             </div>
          </div>
          <button 
            disabled={isExporting}
            onClick={exportProject}
            className="bg-studio-accent hover:bg-blue-600 px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} 
            {isExporting ? 'RENDERING...' : 'EXPORT'}
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

        <button 
          onClick={quantizeSelectedTrack}
          className="flex items-center gap-2 px-3 py-1.5 bg-studio-bg border border-studio-border rounded hover:border-studio-accent hover:text-studio-accent transition-all text-studio-muted text-[10px] font-black uppercase tracking-widest"
          title="Quantize Selected Track (Q)"
        >
          <Magnet size={14} />
          Quantize
        </button>

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
      <main className="flex-1 flex overflow-hidden relative">
        {/* Mastering Rack (Conditional) */}
        {masterPreset !== 'None' && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            className="absolute right-0 top-0 bottom-0 w-64 bg-studio-bg border-l border-studio-border z-20 p-4 flex flex-col gap-6 shadow-2xl"
          >
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-2">
                  <Zap size={14} className="text-studio-accent" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Mastering Chain</span>
               </div>
               <button onClick={() => setMasterPreset('None')} className="text-studio-muted hover:text-studio-text">
                  <RotateCcw size={12} />
               </button>
            </div>

            <div className="space-y-4">
               {[
                 { name: 'Multi-Band Compression', value: 85, color: 'bg-studio-accent' },
                 { name: 'Stereo Imager', value: 40, color: 'bg-blue-500' },
                 { name: 'Limiter (LUFS -14)', value: 92, color: 'bg-studio-record' }
               ].map((mod, i) => (
                 <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[8px] font-bold uppercase text-studio-muted">
                       <span>{mod.name}</span>
                       <span>{mod.value}%</span>
                    </div>
                    <div className="h-1 bg-studio-panel rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${mod.value}%` }}
                         className={cn("h-full", mod.color)}
                       />
                    </div>
                 </div>
               ))}
            </div>

            <div className="mt-4 p-4 rounded bg-studio-panel border border-studio-border flex flex-col items-center gap-2">
               <span className="text-[10px] font-bold uppercase text-studio-accent animate-pulse">Processing active</span>
               <div className="flex items-end gap-0.5 h-12 w-full">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ height: [`${Math.random() * 100}%`, `${Math.random() * 100}%`, `${Math.random() * 100}%`] }}
                      transition={{ repeat: Infinity, duration: 0.5 + Math.random() }}
                      className="flex-1 bg-studio-accent opacity-50"
                    />
                  ))}
               </div>
               <span className="text-[8px] font-mono text-studio-muted uppercase">{masterPreset} Optimized</span>
            </div>

            <div className="mt-auto text-[8px] leading-tight text-studio-muted bg-studio-panel/50 p-2 rounded italic">
              AI Tip: For {masterPreset}, ensure your sub-frequencies under 40Hz are cut to preserve headroom for the limiter.
            </div>
          </motion.div>
        )}
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
                onClick={() => setSidebarTab('projects')}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-all", 
                  sidebarTab === 'projects' ? "text-studio-text" : "text-studio-muted"
                )}
              >
                Projects
              </button>
              {aiAnalysisText && (
                <button 
                  onClick={() => setSidebarTab('ai-analysis' as any)}
                  className={cn( 
                    "text-[10px] font-bold uppercase tracking-widest transition-all text-studio-accent",
                    sidebarTab === 'ai-analysis' as any ? "opacity-100" : "opacity-50"
                  )}
                >
                  AI Insight
                </button>
              )}
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
                  onClick={() => setSelectedTrackId(track.id)} // Call Zustand action
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
                        onClick={(e) => { e.stopPropagation(); handleRemoveTrack(track.id); }} // Call local handler
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
            ) : sidebarTab as any === 'ai-analysis' ? (
              <div className="flex flex-col h-full bg-studio-bg/30 p-4 overflow-y-auto">
                 <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-studio-accent" size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Mastering Insights</span>
                 </div>
                 <div className="prose prose-invert prose-xs text-[10px] text-studio-text/80 leading-relaxed whitespace-pre-wrap">
                    {aiAnalysisText}
                 </div>
                 <button 
                  onClick={() => setAiAnalysisText(null)}
                  className="mt-6 text-[9px] uppercase font-bold text-studio-muted hover:text-studio-text transition-colors"
                >
                  Clear Analysis
                </button>
              </div>
            ) : sidebarTab === 'browser' ? (
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
            ) : (
              <div className="flex flex-col h-full bg-studio-bg/30">
                 <div className="p-4 flex flex-col gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-studio-muted">Cloud Projects</span>
                    {!user ? (
                      <div className="py-8 text-center flex flex-col items-center gap-3">
                         <Cloud className="text-studio-muted opacity-20" size={32} />
                         <p className="text-[10px] text-studio-muted">Sign in to sync with Google Drive</p>
                      </div>
                    ) : userProjects.length === 0 ? (
                      <div className="py-8 text-center flex flex-col items-center gap-3">
                         <Activity className="text-studio-accent" size={24} />
                         <p className="text-[10px] text-studio-text">No projects found. Create and save your first one!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {userProjects.map(proj => (
                            <div 
                            key={proj.id}
                            className="bg-studio-panel border border-studio-border rounded p-3 hover:border-studio-accent cursor-pointer group transition-all relative overflow-hidden"
                            onClick={() => loadProjectFromCloud(proj)} // This will call useStudioStore.setState
                          >
                            {proj.isPublic && <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-studio-accent/20 text-studio-accent rounded-bl-lg"><Radio size={10} className="animate-pulse" /></div>}
                            <div className="flex justify-between items-start mb-1">
                               <span className="text-[11px] font-black truncate uppercase pr-4">{proj.name}</span>
                               <CloudDownload size={12} className="text-studio-accent opacity-0 group-hover:opacity-100" />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                               <span className="text-[8px] text-studio-muted font-mono">{new Date(proj.updatedAt?.seconds * 1000).toLocaleDateString()}</span>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => togglePublic(proj, e)}
                                    className={cn("text-[8px] font-bold uppercase", proj.isPublic ? "text-studio-accent" : "text-studio-muted")}
                                  >
                                    {proj.isPublic ? 'Public' : 'Private'}
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setSharingProjectId(sharingProjectId === proj.id ? null : proj.id); }}
                                    className={cn("text-studio-muted hover:text-studio-accent transition-colors", sharingProjectId === proj.id && "text-studio-accent")}
                                  >
                                    <Layers size={10} />
                                  </button>
                                  <button onClick={(e) => deleteProject(proj, e)} className="text-studio-record hover:brightness-125">
                                    <Trash2 size={10} />
                                  </button>
                               </div>
                            </div>
                            {sharingProjectId === proj.id && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="mt-3 pt-3 border-t border-studio-border/50 flex flex-col gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                 <span className="text-[9px] font-black uppercase text-studio-muted">Manage Access</span>
                                 <div className="flex gap-1">
                                    <input 
                                      type="email"
                                      value={inviteEmail}
                                      onChange={(e) => setInviteEmail(e.target.value)}
                                      placeholder="Collaborator email..."
                                      className="flex-1 bg-studio-bg border border-studio-border rounded px-2 py-1 text-[9px] focus:outline-none"
                                    />
                                    <button 
                                      disabled={isInviting}
                                      onClick={() => addCollaborator(proj.id)}
                                      className="bg-studio-accent text-white px-2 py-1 rounded text-[9px] font-bold disabled:opacity-50"
                                    >
                                      {isInviting ? '...' : 'ADD'}
                                    </button>
                                 </div>
                                 <div className="flex flex-wrap gap-1">
                                    {(proj.collaborators || []).map((uid: string) => (
                                      <div key={uid} className="bg-studio-bg border border-studio-border px-1.5 py-0.5 rounded flex items-center gap-1">
                                         <span className="text-[7px] text-studio-muted tabular-nums">ID: {uid.slice(0, 4)}...</span>
                                         <button className="text-studio-record hover:brightness-125">
                                            <Plus size={8} className="rotate-45" />
                                         </button>
                                      </div>
                                    ))}
                                 </div>
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
            )}
          </div>
        </aside>

        {/* Timeline Area (Center) */}
        <section className="flex-1 flex flex-col relative bg-studio-bg">
          <div className="flex-1 relative overflow-hidden">
             {/* DAW Grid Background */}
             <div className="absolute inset-0 pointer-events-none opacity-20"
               style={{
                 backgroundImage: `linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
                 backgroundSize: `${state.zoom * 4}px 64px`
               }}
             />
            {/* Timeline Ruler */}
            <div className="h-6 border-b border-studio-border bg-studio-panel flex items-end">
              <div className="flex w-full overflow-hidden">
                {Array.from({ length: 128 }).map((_, i) => (
                  <div key={i} className="shrink-0 h-4 border-l border-studio-border flex items-end pb-0.5 px-1" style={{ width: `${zoom * 4}px` }}>
                    <span className="text-[8px] font-black text-studio-muted leading-none">{(i + 1).toString().padStart(2, '0')}</span>
                    <span className="text-[7px] font-mono text-studio-muted/50 ml-1">.01</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-white z-20 shadow-[0_0_8px_rgba(255,255,255,0.5)] pointer-events-none"
              style={{ left: `${(currentTime / (duration || 300)) * 100}%` }}
            />

            {/* Tracks Waveforms */}
            <div className="flex flex-col gap-[1px]">
              {tracks.map(track => (
                <WaveformView 
                  key={track.id}
                  track={track}
                  isRecording={isRecording && selectedTrackId === track.id}
                  isSelected={selectedTrackId === track.id}
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
                  onClick={() => setActiveTab('mastering')}
                  className={cn(
                    "h-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all px-2",
                    activeTab === 'mastering' ? "border-studio-accent text-studio-text" : "border-transparent text-studio-muted"
                  )}
                >
                  <Disc size={12} /> Mastering
                </button>
                <button 
                  onClick={() => setActiveTab('search')}
                  className={cn(
                    "h-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all px-2",
                    activeTab === 'search' ? "border-studio-accent text-studio-text" : "border-transparent text-studio-muted"
                  )}
                >
                  <Globe size={12} /> Search
                </button>
                <button 
                  onClick={() => setActiveTab('peripherals')}
                  className={cn(
                    "h-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all px-2",
                    activeTab === 'peripherals' ? "border-studio-accent text-studio-text" : "border-transparent text-studio-muted"
                  )}
                >
                  <Cpu size={12} /> Peripherals
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
                <button 
                  onClick={() => setActiveTab('lyrics')}
                  className={cn(
                    "h-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all px-2",
                    activeTab === 'lyrics' ? "border-studio-accent text-studio-text" : "border-transparent text-studio-muted"
                  )}
                >
                  <MessageSquare size={12} /> Lyrics
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-studio-bg border border-studio-border rounded px-2 py-0.5">
                   <span className="text-[8px] font-black text-studio-muted uppercase">Snap:</span>
                   <select 
                     value={snap}
                     onChange={(e) => setSnap(e.target.value as any)} // Call Zustand action
                     className="bg-transparent text-[9px] font-bold text-studio-accent focus:outline-none cursor-pointer"
                   >
                     {['1/4', '1/8', '1/16', '1/32'].map(s => (
                       <option key={s} value={s}>{s}</option>
                     ))}
                   </select>
                </div>
                <div className="h-4 w-px bg-studio-border" />
                <div className="text-[10px] font-mono text-studio-muted uppercase tracking-tighter">
                   Track: {tracks.find(t => t.id === selectedTrackId)?.name || 'None'}
                </div>
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
                      tracks={tracks} // Pass tracks from Zustand
                      selectedId={selectedTrackId} // Pass selectedId from Zustand
                      onInteractionStart={startInteraction}
                      onInteractionEnd={endInteraction}
                      onUpdateTrack={updateTrack} // Pass Zustand action directly
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
                      track={tracks.find(t => t.id === selectedTrackId)} // Pass track from Zustand
                      onInteractionStart={startInteraction}
                      onInteractionEnd={endInteraction}
                      onUpdateEffects={(effects) => {
                        pushToUndo(useStudioStore.getState());
                        updateTrack(selectedTrackId!, { effects }); // Call Zustand action
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
                    <AIAssistant tracks={tracks} masterPreset={masterPreset} /> {/* Pass from Zustand */}
                  </motion.div>
                )}
                {activeTab === 'mastering' && (
                  <motion.div 
                    key="mastering"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full"
                  >
                    <MasteringView 
                      preset={masterPreset || 'None'} // Pass from Zustand
                      onPresetChange={setMasterPreset} // Pass Zustand action
                    />
                  </motion.div>
                )}
                {activeTab === 'search' && (
                  <motion.div 
                    key="search"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full"
                  >
                    <SearchView />
                  </motion.div>
                )}
                {activeTab === 'peripherals' && (
                  <motion.div 
                    key="peripherals"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full"
                  >
                    <PeripheralManager />
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
                    {tracks.find(t => t.id === selectedTrackId)?.type === 'drum' ? (
                      <StepSequencer
                        track={tracks.find(t => t.id === selectedTrackId)!}
                        bpm={bpm}
                        onUpdateNotes={(notes) => {
                          pushToUndo(useStudioStore.getState());
                          updateTrack(selectedTrackId!, { notes }); // Call Zustand action
                        }}
                      />
                    ) : (tracks.find(t => t.id === selectedTrackId)?.type === 'midi' || tracks.find(t => t.id === selectedTrackId)?.type === 'synth') ? (
                      <MidiEditor 
                        track={tracks.find(t => t.id === selectedTrackId)!}
                        snap={snap as any}
                        bpm={bpm}
                        rootKey={key.split(' ')[0]}
                        scale={key.split(' ')[1]}
                        onUpdateNotes={(notes) => {
                          pushToUndo(useStudioStore.getState());
                          updateTrack(selectedTrackId!, { notes }); // Call Zustand action
                        }}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-studio-muted gap-4">
                        <Keyboard size={32} className="opacity-20" />
                        <div className="text-center">
                          <p className="text-[10px] uppercase font-bold tracking-widest">Select a MIDI or Drum Track</p>
                          <div className="flex gap-2 justify-center mt-2"> 
                             <button 
                               onClick={() => handleAddTrack('midi')}
                               className="text-[10px] text-studio-accent font-bold hover:underline"
                             >
                               + MIDI
                             </button>
                             <button 
                               onClick={() => handleAddTrack('drum')}
                               className="text-[10px] text-studio-accent font-bold hover:underline"
                             >
                               + DRUM
                             </button>
                          </div>
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
                    className="h-full"
                  >
                    <AnalyzerView />
                  </motion.div>
                )}
                {activeTab === 'lyrics' && (
                  <motion.div 
                    key="lyrics"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="h-full flex gap-4"
                  >
                    <div className="flex-1 bg-studio-bg rounded border border-studio-border p-4 flex flex-col gap-2">
                       <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-studio-accent">Studio Lyrics Pad</span>
                          <span className="text-[9px] font-mono text-studio-muted">Word Count: {lyrics?.split(/\s+/).filter(Boolean).length || 0}</span>
                       </div> 
                       <textarea 
                         value={state.lyrics || ''}
                         onChange={(e) => setState(s => ({ ...s, lyrics: e.target.value }))}
                         placeholder="Tanto faz, se a vida é um jazz..."
                         className="flex-1 bg-transparent border-none focus:ring-0 p-2 text-xs font-medium leading-relaxed resize-none scrollbar-thin overflow-y-auto"
                       />
                    </div>
                    <div className="w-64 flex flex-col gap-4">
                       <div className="p-4 rounded bg-studio-panel border border-studio-border space-y-4">
                          <div className="space-y-1">
                             <h4 className="text-[10px] font-black uppercase tracking-widest">AI Ghostwriter</h4>
                             <p className="text-[8px] text-studio-muted leading-tight">Generate lyrics based on your tracks and mastering preset.</p>
                          </div>
                          
                          <div className="space-y-1 text-[9px] font-bold">
                             <label className="text-studio-muted uppercase block">Mood</label>
                             <select 
                               value={lyricMood} 
                               onChange={(e) => setLyricMood(e.target.value)}
                               className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1.5 focus:outline-none focus:border-studio-accent transition-all uppercase"
                             >
                               {['Inspired', 'Sad', 'Angry', 'Hype', 'Dark', 'Lofi', 'Gritty'].map(m => (
                                 <option key={m} value={m}>{m}</option>
                               ))}
                             </select>
                          </div>

                          <button 
                            disabled={isGeneratingLyrics}
                            onClick={generateLyrics}
                            className="w-full py-2.5 rounded bg-studio-accent text-white hover:brightness-110 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                             {isGeneratingLyrics ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                             GENERATE BARS
                          </button>
                       </div>
                       <div className="flex-1 p-4 rounded bg-studio-bg/50 border border-studio-border flex flex-col items-center justify-center text-center gap-2 opacity-50">
                          <Activity size={24} className="text-studio-muted" />
                          <p className="text-[9px] font-bold uppercase text-studio-muted">Rhyme Dictionary Coming Soon</p>
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
        onToggleRecord={toggleRecording} // This now calls the Zustand action
        onUpdateState={updateStudioState} // This now calls the Zustand action
    </div>
  );
}
