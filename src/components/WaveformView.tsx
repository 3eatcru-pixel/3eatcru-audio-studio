import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Upload, Mic, Loader2 } from 'lucide-react';
import { Track } from '../types';
import { cn } from '../lib/utils';

interface WaveformViewProps {
  key?: React.Key;
  track: Track;
  isRecording: boolean;
  isSelected: boolean;
  zoom: number;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShift: (delta: number) => void;
}

const NOTES_SIMPLE = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];

export function WaveformView({ track, isRecording, isSelected, zoom, onUpload, onShift }: WaveformViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (containerRef.current && track.url) {
      wavesurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: track.color === '#ef4444' ? '#991b1b' : '#1e3a8a',
        progressColor: track.color,
        cursorColor: 'transparent',
        barWidth: 2,
        barRadius: 3,
        height: 100,
        normalize: true,
        interact: false,
        minPxPerSec: zoom,
      });

      wavesurferRef.current.load(track.url);

      return () => {
        wavesurferRef.current?.destroy();
      };
    }
  }, [track.url, track.color, zoom]);

  return (
    <div className={cn(
      "h-[100px] border-bottom border-studio-border relative transition-colors overflow-hidden waveform-container",
      isSelected ? "bg-studio-panel/20" : "bg-transparent",
      isRecording && "bg-studio-record/5"
    )}>
      <div 
        className="absolute inset-y-0 flex h-full"
        style={{ left: `${track.startTime}px`, width: '10000px' }}
      >
        {track.type === 'midi' ? (
          <div className="w-full h-full relative opacity-60">
            {track.notes?.map(note => (
              <div 
                key={note.id}
                className="absolute bg-studio-accent/30 border border-studio-accent/50 rounded-sm"
                style={{
                  left: `${note.time * 160}px`,
                  top: `${(NOTES_SIMPLE.indexOf(note.pitch.slice(0, -1)) * 4)}px`,
                  width: `${note.duration * 160}px`,
                  height: '4px'
                }}
              />
            ))}
            {!track.notes?.length && (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase font-bold tracking-[0.2em] text-studio-muted/30">
                Empty MIDI Region
              </div>
            )}
          </div>
        ) : track.url ? (
          <div ref={containerRef} className="w-full h-full" />
        ) : (
          <div className="w-full flex items-center justify-center gap-6">
            {track.type === 'instrumental' ? (
              <label className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-studio-border flex items-center justify-center group-hover:border-studio-accent transition-colors">
                  <Upload size={18} className="text-studio-muted group-hover:text-studio-accent" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-studio-muted group-hover:text-studio-text">Upload Instrumental</span>
                <input type="file" className="hidden" accept="audio/*" onChange={onUpload} />
              </label>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full border-2 border-studio-border flex items-center justify-center transition-all",
                  isRecording ? "border-studio-record bg-studio-record/10 recording-glow" : ""
                )}>
                  <Mic size={18} className={isRecording ? "text-studio-record" : "text-studio-muted"} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">
                  {isRecording ? "Listening..." : "Ready to Record"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Track Label Overlay */}
      <div className="absolute top-2 left-4 z-10">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] py-0.5 px-1.5 rounded bg-studio-panel/80 border border-studio-border text-studio-muted">
          {track.name}
        </span>
      </div>

      {isRecording && (
        <div className="absolute top-2 right-4 z-10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-studio-record recording-glow" />
          <span className="text-[9px] font-bold text-studio-record uppercase tracking-widest">Recording</span>
        </div>
      )}
    </div>
  );
}
