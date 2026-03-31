import { GoogleGenAI, Type } from "@google/genai";
import { Language, Quote, MoodAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateQuotes(category: string, language: Language, count: number = 10): Promise<Quote[]> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `You are a wise, empathetic close friend. Generate ${count} unique, deep, and profoundly human quotes for the category "${category}" in the ${language} language. 
  
  Requirements:
  1. Tone: Deeply emotional, supportive, and authentic. Avoid robotic or cliché phrases.
  2. Perspective: Speak from the heart, as if sharing a quiet moment of wisdom with a dear friend.
  3. Variety: Ensure each quote explores a different nuance of "${category}". Do not repeat common internet quotes; create something fresh and original.
  4. Language: Use natural, contemporary ${language} that resonates with the soul.
  
  Return the result as a JSON array of objects with "text" and "author" fields. If the quote is original, use "EthioQuotes AI" as the author.`;

  try {
    const response = await ai.models.generateContent({
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
    });

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

export async function analyzeMood(userInput: string, language: Language, includeReligious: boolean = false): Promise<MoodAnalysis | null> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `You are a deeply empathetic and caring close friend listening to a loved one. Analyze the following user input and detect the primary emotion (e.g., sadness, stress, loneliness, love, confusion, discouragement, fear).
  
  User Input: "${userInput}"
  
  Requirements:
  1. Detect the emotion accurately in the ${language} language.
  2. Write 1 short, warm, and highly personal supportive message (max 2 sentences) in ${language} that speaks directly to the user's heart.
  3. Generate exactly 4 personalized, supportive, and caring quotes in ${language} that address this specific emotion.
  4. Tone: Warm, intimate, and human. Avoid generic or robotic advice. Speak as if you are sitting right next to them.
  ${includeReligious ? `5. Since the user has enabled religious wisdom, if the detected emotion is one that could benefit from spiritual comfort (like sadness, stress, fear, or discouragement), include 2 relevant, comforting, and hopeful verses from the Bible or the Quran in ${language}. Ensure they are respectful and accurately reflect the scripture.` : ''}
  
  Return the result as a JSON object with:
  - "emotion": string (the detected emotion in ${language})
  - "supportiveMessage": string (your personal message in ${language})
  - "quotes": array of objects with "text" and "author" fields (in ${language})
  ${includeReligious ? '- "religiousQuotes": array of objects with "text" and "author" fields (e.g., "Bible - Psalm 23:1" or "Quran - 2:286")' : ''}
  
  Use "Your AI Friend" as the author for the general quotes.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotion: { type: Type.STRING },
            supportiveMessage: { type: Type.STRING },
            quotes: {
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
          required: ["emotion", "supportiveMessage", "quotes"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return {
      emotion: data.emotion,
      supportiveMessage: data.supportiveMessage,
      quotes: data.quotes.map((item: any, index: number) => ({
        id: `mood-${language}-${Date.now()}-${index}`,
        text: item.text,
        author: item.author || "Your AI Friend",
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
