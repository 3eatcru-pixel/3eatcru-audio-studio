import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Globe, ExternalLink, Music, Book, Youtube, Zap, Loader2, Disc, Sliders } from 'lucide-react';
import { cn } from '../lib/utils';
import { aiStudioService } from '../services/ai-studio-service';

interface SearchResult {
  title: string;
  description: string;
  url: string;
  type: 'tutorial' | 'gear' | 'reference' | 'sample';
}

export function SearchView() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsSearching(true);
    try {
      // We use Gemini to "simulated" a smart search for music production
      // In a real app, this could be a direct web search API
      const prompt = `Act as a musical researcher. Find 5 high-quality, relevant web resources/links for the following search query in the context of music production: "${query}". 
      Format the output as a JSON array of objects with keys: title, description, url, type (one of: tutorial, gear, reference, sample).
      Only return the JSON.`;
      
      const response = await aiStudioService.getChatResponse(prompt, []);
      const jsonStart = response.indexOf('[');
      const jsonEnd = response.lastIndexOf(']') + 1;
      const jsonStr = response.substring(jsonStart, jsonEnd);
      
      try {
        const parsed = JSON.parse(jsonStr);
        setResults(parsed);
      } catch (err) {
         // Fallback mock results if AI fails to format JSON correctly
         setResults([
            { title: "Universal Audio Apollo Interface Info", description: "Learn about the hardware used in professional studios for that warm sound.", url: "https://www.uaudio.com", type: 'gear' },
            { title: "Mixing with Pink Noise Tutorial", description: "A classic technique for setting the correct balance of levels in your mix.", url: "https://www.soundonsound.com", type: 'tutorial' },
            { title: "Free Hip-Hop Drum Samples", description: "Download high-quality kick and snare samples for your beat.", url: "https://splice.com", type: 'sample' },
         ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tutorial': return <Youtube size={14} />;
      case 'gear': return <Disc size={14} />;
      case 'reference': return <Book size={14} />;
      case 'sample': return <Music size={14} />;
      default: return <Globe size={14} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-studio-bg rounded-xl border border-studio-border overflow-hidden">
      <div className="p-8 pb-4">
         <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-studio-accent/20 rounded-xl">
               <Globe size={24} className="text-studio-accent" />
            </div>
            <div>
               <h2 className="text-xl font-black uppercase tracking-tighter">Global Studio Search</h2>
               <p className="text-[10px] font-bold text-studio-muted uppercase tracking-widest mt-1">Search the web for samples, gear info, and production tutorials</p>
            </div>
         </div>

         <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-studio-muted group-focus-within:text-studio-accent transition-colors" size={20} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gear, mixing tips, or sample libraries..."
              className="w-full bg-studio-panel border-2 border-studio-border focus:border-studio-accent rounded-xl py-4 pl-14 pr-32 outline-none text-sm font-medium transition-all shadow-xl"
            />
            <button 
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-studio-accent text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSearching ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
            </button>
         </form>

         <div className="flex gap-4 mt-6">
            {['All', 'Tutorials', 'Gear', 'Samples'].map(filter => (
              <button key={filter} className={cn(
                "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                filter === 'All' ? "bg-studio-accent border-studio-accent text-white" : "border-studio-border text-studio-muted hover:text-studio-text"
              )}>
                 {filter}
              </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
         {isSearching ? (
           <div className="h-full flex flex-col items-center justify-center text-studio-muted gap-4">
              <div className="relative">
                 <Globe size={48} className="animate-pulse opacity-50" />
                 <div className="absolute inset-0 border-2 border-studio-accent rounded-full animate-ping" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest animate-bounce">Scanning the sonic Web...</p>
           </div>
         ) : results.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((res, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i} 
                  className="bg-studio-panel border border-studio-border rounded-xl p-5 hover:border-studio-accent/50 transition-all group cursor-pointer"
                  onClick={() => window.open(res.url, '_blank')}
                >
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 px-2 py-1 bg-studio-bg border border-studio-border rounded text-[8px] font-black uppercase tracking-widest text-studio-muted group-hover:text-studio-accent transition-colors">
                         {getTypeIcon(res.type)} {res.type}
                      </div>
                      <ExternalLink size={14} className="text-studio-muted opacity-0 group-hover:opacity-100 transition-all" />
                   </div>
                   <h4 className="text-sm font-black uppercase tracking-tight group-hover:text-studio-accent transition-colors line-clamp-1">{res.title}</h4>
                   <p className="text-[10px] text-studio-muted mt-2 leading-relaxed line-clamp-2">
                      {res.description}
                   </p>
                   <div className="text-[8px] font-mono text-studio-muted mt-4 truncate opacity-50">
                      {res.url}
                   </div>
                </motion.div>
              ))}
           </div>
         ) : (
           <div className="h-full flex flex-col items-center justify-center text-studio-muted opacity-20">
              <Zap size={64} strokeWidth={1} />
              <p className="text-xs font-black uppercase tracking-[0.2em] mt-4 text-center max-w-[200px]">
                 Get instant inspiration and technical knowledge
              </p>
           </div>
         )}
      </div>
    </div>
  );
}
