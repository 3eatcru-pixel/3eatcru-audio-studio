import React, { useState } from 'react';
import { Send, Sparkles, MessageSquare, Wand2, Music, Loader2, Mic, Settings2 } from 'lucide-react';
import { aiStudioService } from '../services/ai-studio-service';
import { useStudioStore } from '../store/studioStore';

const AI_TIPS = [
  { 
    title: 'Vocal Presence', 
    text: 'Boost 3-5kHz for clarity, cut 250Hz slightly to remove boxiness.',
    icon: <Mic size={14} className="text-studio-record" />
  },
  { 
    title: 'Back Vocal Width', 
    text: 'Use Harmony Engine or Doubler, then pan L/R 100% for that modern wide sound.',
    icon: <Sparkles size={14} className="text-purple-400" />
  },
  { 
    title: 'Compression Style', 
    text: 'For modern pop vocals, use a 4:1 ratio with fast attack and medium release.',
    icon: <Settings2 size={14} className="text-cyan-400" />
  }
];

interface AIAssistantProps {
}

export function AIAssistant({ }: AIAssistantProps) {
  const { tracks, masterPreset } = useStudioStore(); // Get tracks and masterPreset from Zustand

  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', content: string }[]>([ 
    { role: 'ai', content: `Hello! I'm AURA. I see you're working on a session with ${tracks.length} tracks and ${masterPreset} mastering. I now have access to real-time web search for gear info, references, and tutorials. How can I help you today?` }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setPrompt('');
    setIsLoading(true);

    try {
      const context = `Session Context: ${tracks.length} tracks (${tracks.map(t => t.name).join(', ')}). Mastering: ${masterPreset}. Current User Goal: ${userMessage}`;
      
      const history = messages.map(m => ({
        role: m.role === 'ai' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }]
      }));

      const response = await aiStudioService.getChatResponse(context, history);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', content: "I encountered a technical glitch in the matrix. Could you try rephrasing that?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Suggestions Sidebar */}
      <div className="w-48 shrink-0 flex flex-col gap-2 overflow-y-auto pr-2 border-r border-studio-border/30">
        <span className="text-[9px] font-bold uppercase tracking-widest text-studio-muted mb-1">Quick Tasks</span>
        <button className="flex items-center gap-2 p-2 rounded bg-studio-accent/10 border border-studio-accent/20 hover:bg-studio-accent/20 transition-all text-left">
          <Wand2 size={12} className="text-studio-accent" />
          <span className="text-[10px] font-bold">Auto-Mix Session</span>
        </button>
        <button className="flex items-center gap-2 p-2 rounded bg-studio-border/30 border border-studio-border hover:bg-studio-border/50 transition-all text-left">
          <Music size={12} className="text-studio-muted" />
          <span className="text-[10px] font-bold">Stem Separation</span>
        </button>
        <button className="flex items-center gap-2 p-2 rounded bg-studio-border/30 border border-studio-border hover:bg-studio-border/50 transition-all text-left">
          <Sparkles size={12} className="text-studio-muted" />
          <span className="text-[10px] font-bold">Vocal Cleaning</span>
        </button>

        <div className="mt-4 flex flex-col gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-studio-accent mb-1 border-b border-studio-accent/20 pb-1 flex items-center gap-1">
            <Mic size={10} /> Vocal Pro Tips
          </span>
          {AI_TIPS.map((tip, i) => (
            <div key={i} className="p-2 bg-studio-panel/50 border border-studio-border/50 rounded hover:border-studio-accent/50 transition-all cursor-help group">
              <div className="flex items-center gap-1.5 mb-1">
                {tip.icon}
                <span className="text-[9px] font-black uppercase text-studio-text leading-tight">{tip.title}</span>
              </div>
              <p className="text-[8px] text-studio-muted leading-relaxed group-hover:text-studio-text transition-colors">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-studio-bg/50 rounded-lg border border-studio-border overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-studio-accent text-white rounded-br-none' 
                  : 'bg-studio-panel border border-studio-border rounded-bl-none text-studio-text whitespace-pre-wrap'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-studio-panel border border-studio-border p-3 rounded-xl flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-studio-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-studio-muted">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-studio-panel border-t border-studio-border flex gap-2">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your music..."
            className="flex-1 bg-studio-bg border border-studio-border rounded-full px-4 py-1.5 text-xs focus:outline-none focus:border-studio-accent transition-colors"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !prompt.trim()}
            className="w-10 h-10 rounded-full bg-studio-accent hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all text-white shadow-lg"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
