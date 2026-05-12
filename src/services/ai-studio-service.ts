import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const aiStudioService = {
  async getAnalysis(audioDescription: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert music producer. Analyze this track description and provide specific suggestions for mixing and mastering: ${audioDescription}. Return a JSON with suggestions for EQ, Compression, and Reverb.`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text);
  },

  async suggestLyrics(genre: string, theme: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate emotional lyrics for a ${genre} song about ${theme}. Include Verse, Chorus, and Bridge.`,
    });
    return response.text;
  },

  async getMasteringAdvice(preset: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a brief technical guide on how to master a track in the style of ${preset}. Mention specific frequency ranges and dynamic targets.`,
    });
    return response.text;
  }
};
