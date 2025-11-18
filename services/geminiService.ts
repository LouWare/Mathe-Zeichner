import { GoogleGenAI } from "@google/genai";
import { Point } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeGraph = async (points: Point[]): Promise<string> => {
  // Downsample points to save tokens and reduce noise
  const sampledPoints = points.filter((_, i) => i % 2 === 0).map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`).join(", ");

  const prompt = `
    Du bist ein freundlicher und präziser Mathe-Tutor für Analysis (Calculus).
    Ein Schüler hat eine Funktion f(x) durch Ziehen von Punkten auf einem Graphen erstellt.
    
    Hier sind die ungefähren Koordinaten der Funktion f(x): [${sampledPoints}].
    
    Deine Aufgabe:
    1. Beschreibe kurz den Verlauf von f(x) (z.B. Nullstellen, Extremstellen).
    2. Erkläre, wie sich dieser Verlauf auf die Ableitung f'(x) auswirkt (z.B. "Wo f(x) steigt, ist f'(x) positiv").
    3. Erkläre, wie sich dieser Verlauf auf die Stammfunktion F(x) auswirkt (z.B. "Die Fläche unter f(x) sammelt sich an...").
    
    Formatiere die Antwort in validem Markdown. Sei prägnant, ermutigend und lehrreich. Nutze maximal 3 Absätze. Sprich den Nutzer direkt an ("Du siehst...").
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });
    return response.text || "Konnte keine Analyse generieren.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Entschuldigung, beim Analysieren des Graphen ist ein Fehler aufgetreten. Bitte überprüfe deinen API-Schlüssel.";
  }
};