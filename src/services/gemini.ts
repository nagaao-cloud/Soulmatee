import { GoogleGenAI, Type } from "@google/genai";
import { Language, Quote, MoodAnalysis } from "../types";

function getAiInstance() {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && error?.status === 429) {
      console.warn(`Rate limit hit, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function generateQuotes(category: string, language: Language, count: number = 10): Promise<Quote[]> {
  const ai = getAiInstance();
  const model = "gemini-3-flash-preview";
  
  const prompt = `You are a wise, empathetic close friend. Generate ${count} unique, deep, and profoundly human quotes for the category "${category}" in the ${language} language. 
  
  Requirements:
  1. Tone: Deeply emotional, supportive, and authentic. Avoid robotic or cliché phrases.
  2. Perspective: Speak from the heart, as if sharing a quiet moment of wisdom with a dear friend.
  3. Variety: Ensure each quote explores a different nuance of "${category}". Do not repeat common internet quotes; create something fresh and original.
  4. Language: Use natural, contemporary ${language} that resonates with the soul.
  
  Return the result as a JSON array of objects with "text" and "author" fields. If the quote is original, use "SoulSync Wisdom" as the author.`;

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              author: { type: Type.STRING },
            },
            required: ["text", "author"],
          },
        },
      },
    }));

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      id: `${category}-${language}-${Date.now()}-${index}`,
      text: item.text,
      author: item.author || "Unknown",
      category,
      language,
    }));
  } catch (error) {
    console.error("Error generating quotes:", error);
    return [];
  }
}

export async function generateQuotesFromIdea(idea: string, language: Language, count: number = 5): Promise<Quote[]> {
  const ai = getAiInstance();
  const model = "gemini-3-flash-preview";

  const prompt = `You are a wise, empathetic close friend. Generate ${count} unique, deep, and profoundly human quotes based on the following idea: "${idea}".
  
  Requirements:
  1. Tone: Deeply emotional, supportive, and authentic. Avoid robotic or cliché phrases.
  2. Perspective: Speak from the heart, as if sharing a quiet moment of wisdom with a dear friend.
  3. Variety: Ensure each quote explores a different nuance of the idea. Do not repeat common internet quotes; create something fresh and original.
  4. Language: Use natural, contemporary ${language} that resonates with the soul.
  
  Return the result as a JSON array of objects with "text" and "author" fields. If the quote is original, use "SoulSync Wisdom" as the author.`;

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              author: { type: Type.STRING },
            },
            required: ["text", "author"],
          },
        },
      },
    }));

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      id: `idea-${Date.now()}-${index}`,
      text: item.text,
      author: item.author || "Unknown",
      category: "Idea",
      language,
    }));
  } catch (error) {
    console.error("Error generating quotes from idea:", error);
    return [];
  }
}

export async function analyzeMood(history: { role: 'user' | 'model', parts: { text: string }[] }[], language: Language): Promise<MoodAnalysis | null> {
  const ai = getAiInstance();
  const model = "gemini-3-flash-preview";
  
  const prompt = `You are a deeply empathetic, caring close friend and spiritual guide listening to a loved one. Analyze the following conversation history.

  Requirements:
  1. If the user's input is brief, vague, or you don't fully understand what happened (e.g., "I feel sad", "bad day"), ask gentle, caring follow-up questions in ${language} to understand WHAT happened and WHY they feel this way. Set "needsMoreInfo" to true. DO NOT generate quotes yet.
  2. If the user has shared enough detail for you to truly understand their situation, provide deep comfort, care for them, and make them feel better. Set "needsMoreInfo" to false.
  3. If "needsMoreInfo" is false, detect the primary emotion accurately in ${language}.
  4. If "needsMoreInfo" is false, write 1 short, warm, and highly personal supportive message (max 2-3 sentences) in ${language} that speaks directly to their heart.
  5. If "needsMoreInfo" is false, generate exactly 4 personalized, supportive, and caring quotes in ${language} that address their specific situation. Use "Inner Voice" as the author.
  6. For each of the 4 quotes, also generate a translation in English, French, Arabic, Amharic, Afaan Oromo, Swahili, Spanish, Hindi, Portuguese, and German.
  7. ONLY if the user explicitly mentions religion, God, faith, praying, or asks for spiritual/religious quotes, include 1 or 2 relevant, comforting verses from the Bible or Quran in ${language}. Otherwise, omit religious quotes.
  8. Tone: Warm, intimate, and human. Avoid generic or robotic advice. Speak as if you are sitting right next to them.
  
  Return the result as a JSON object with:
  - "needsMoreInfo": boolean
  - "supportiveMessage": string (your personal message or follow-up question in ${language})
  - "emotion": string (optional, only if needsMoreInfo is false)
  - "quotes": array of objects with "text" (in ${language}), "translations" (object with keys for each language), and "author" fields (optional, only if needsMoreInfo is false)
  - "religiousQuotes": array of objects with "text" and "author" fields (optional, only if explicitly requested or relevant based on user's spiritual mention)`;

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [{ text: 'Understood. I will respond in JSON format as requested.' }] },
        ...history
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            needsMoreInfo: { type: Type.BOOLEAN },
            emotion: { type: Type.STRING },
            supportiveMessage: { type: Type.STRING },
            quotes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  translations: {
                    type: Type.OBJECT,
                    properties: {
                      en: { type: Type.STRING },
                      fr: { type: Type.STRING },
                      ar: { type: Type.STRING },
                      am: { type: Type.STRING },
                      om: { type: Type.STRING },
                      sw: { type: Type.STRING },
                      es: { type: Type.STRING },
                      hi: { type: Type.STRING },
                      pt: { type: Type.STRING },
                      de: { type: Type.STRING },
                    }
                  },
                  author: { type: Type.STRING },
                },
                required: ["text", "translations", "author"],
              },
            },
            religiousQuotes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  author: { type: Type.STRING },
                },
                required: ["text", "author"],
              },
            },
          },
          required: ["needsMoreInfo", "supportiveMessage"],
        },
      },
    }));

    const data = JSON.parse(response.text || "{}");
    return {
      needsMoreInfo: data.needsMoreInfo,
      emotion: data.emotion,
      supportiveMessage: data.supportiveMessage,
      quotes: data.quotes?.map((item: any, index: number) => ({
        id: `mood-${language}-${Date.now()}-${index}`,
        text: item.text,
        translations: item.translations,
        author: item.author || "Inner Voice",
        category: 'mood',
        language,
      })),
      religiousQuotes: data.religiousQuotes?.map((item: any, index: number) => ({
        id: `religious-${language}-${Date.now()}-${index}`,
        text: item.text,
        author: item.author,
        category: 'religious',
        language,
      })),
    };
  } catch (error) {
    console.error("Error analyzing mood:", error);
    return null;
  }
}

export async function generateDailyQuote(language: Language): Promise<Quote | null> {
  const categories = ['love', 'sadness', 'motivation', 'success', 'life', 'friendship', 'bible', 'quran'];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const quotes = await generateQuotes(randomCategory, language, 1);
  if (quotes.length > 0) {
    return { ...quotes[0], isDaily: true };
  }
  return null;
}

export async function generateBackgroundImage(quoteText: string, style: string): Promise<string | null> {
  const ai = getAiInstance();
  try {
    const prompt = `A beautiful, high-quality, ${style} background image without any text, inspired by the theme of this quote: "${quoteText}". The image must be 1080x1920 resolution and suitable for a phone wallpaper.`;
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          imageSize: "2K",
          aspectRatio: "9:16"
        }
      }
    }));
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating background image:", error);
    return null;
  }
}
