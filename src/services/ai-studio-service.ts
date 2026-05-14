import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const aiStudioService = {
  async getChatResponse(userMessage: string, history: any[] = []) {
    const response = await ai.models.generateContent({ 
      model: "gemini-1.5-flash", 
      contents: [
        { role: "user", parts: [{ text: "SYSTEM: You are AURA, an advanced AI music production assistant. You help users with vocal processing, mixing, mastering, and lyric writing. Be technical but encouraging. Use markdown for better readability. If asked about technical settings like EQ or Compression, give specific Hz and Ratio values. You have deep knowledge of Rap, Hip Hop, Trap, and Urban music production, including vocal tuning, sidechain techniques, and parallel saturation." }] },
        { role: "model", parts: [{ text: "Understood. I am ready to assist you with your music production needs as AURA." }] },
        ...history.map(h => ({
          role: h.role,
          parts: h.parts
        })),
        { role: "user", parts: [{ text: userMessage }] }
      ]
    });
    
    return response.text;
  },

  async generateLyrics(genre: string, theme: string, mood: string) {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: `Generate professional lyrics for a ${genre} song about ${theme} with a ${mood} mood. Include structure like [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro]. Use poetic devices and catchy rhythms.` }] }]
    });
    return response.text;
  },

  async analyzeStructure(tracks: any[]) {
    const trackInfo = tracks.map(t => `${t.name} (${t.type})`).join(", ");
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: `My project has these tracks: ${trackInfo}. Suggest a creative arrangement and specific vocal processing chain for the vocal tracks.` }] }]
    });
    return response.text;
  }
};
