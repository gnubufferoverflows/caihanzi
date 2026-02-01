import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { HSKLevel, HanziData, EvaluationResult } from "../types";

// Helper to get AI instance with fresh key if needed
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Utility to wait for a specified duration
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Offline Fallback Data
const OFFLINE_DATA: Record<number, HanziData[]> = {
  [HSKLevel.HSK1]: [
    { char: '我', pinyin: 'wǒ', meaning: 'I; me' },
    { char: '你', pinyin: 'nǐ', meaning: 'you' },
    { char: '他', pinyin: 'tā', meaning: 'he; him' },
    { char: '好', pinyin: 'hǎo', meaning: 'good' },
    { char: '的', pinyin: 'de', meaning: 'possessive particle' },
    { char: '是', pinyin: 'shì', meaning: 'to be' },
    { char: '不', pinyin: 'bù', meaning: 'no; not' },
    { char: '人', pinyin: 'rén', meaning: 'person' },
    { char: '大', pinyin: 'dà', meaning: 'big' },
    { char: '有', pinyin: 'yǒu', meaning: 'have' },
  ],
  [HSKLevel.HSK2]: [
    { char: '红', pinyin: 'hóng', meaning: 'red' },
    { char: '吃', pinyin: 'chī', meaning: 'eat' },
    { char: '书', pinyin: 'shū', meaning: 'book' },
    { char: '水', pinyin: 'shuǐ', meaning: 'water' },
    { char: '手', pinyin: 'shǒu', meaning: 'hand' },
  ],
  [HSKLevel.HSK3]: [
    { char: '爱', pinyin: 'ài', meaning: 'love' },
    { char: '心', pinyin: 'xīn', meaning: 'heart' },
    { char: '做', pinyin: 'zuò', meaning: 'do' },
    { char: '想', pinyin: 'xiǎng', meaning: 'think/want' },
  ],
  // Fallback for higher levels (using a mix)
  [HSKLevel.HSK4]: [{ char: '网', pinyin: 'wǎng', meaning: 'network/net' }, { char: '梦', pinyin: 'mèng', meaning: 'dream' }],
  [HSKLevel.HSK5]: [{ char: '龙', pinyin: 'lóng', meaning: 'dragon' }, { char: '魂', pinyin: 'hún', meaning: 'soul' }],
  [HSKLevel.HSK6]: [{ char: '疆', pinyin: 'jiāng', meaning: 'border/frontier' }, { char: '巅', pinyin: 'diān', meaning: 'peak/summit' }],
};

const getRandomOfflineChar = (level: HSKLevel): HanziData => {
  const list = OFFLINE_DATA[level] || OFFLINE_DATA[HSKLevel.HSK1];
  return list[Math.floor(Math.random() * list.length)];
};

// Retry wrapper for API calls
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Check for rate limit errors (429) or temporary server errors (503)
    // The error object might be nested inside 'error' property depending on the client response
    const isRateLimit = 
      error?.status === 429 || 
      error?.code === 429 || 
      error?.message?.includes('429') || 
      error?.message?.includes('quota') ||
      error?.error?.code === 429 || 
      error?.error?.status === 'RESOURCE_EXHAUSTED';
      
    const isServerOverload = error?.status === 503 || error?.code === 503 || error?.error?.code === 503;

    if (retries > 0 && (isRateLimit || isServerOverload)) {
      console.warn(`API request failed (Status: ${error?.status || error?.error?.code || 'Unknown'}). Retrying in ${delay}ms... (${retries} retries left)`);
      await wait(delay);
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const fetchRandomCharacter = async (level: HSKLevel): Promise<HanziData> => {
  const ai = getAI();
  
  const prompt = `Generate a single random Chinese character (Hanzi) appropriate for HSK Level ${level}. 
  Return a JSON object with the character, its pinyin (with tone marks), and a concise English meaning.
  Ensure the character is commonly used in that level.`;

  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            char: { type: Type.STRING, description: "The Chinese character" },
            pinyin: { type: Type.STRING, description: "Pinyin with tone marks" },
            meaning: { type: Type.STRING, description: "Concise English meaning" },
          },
          required: ["char", "pinyin", "meaning"],
        },
      },
    }));

    if (response.text) {
      return JSON.parse(response.text) as HanziData;
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Error fetching character (Using offline fallback):", error);
    return getRandomOfflineChar(level);
  }
};

export const fetchCharacterDetails = async (char: string): Promise<HanziData> => {
  const ai = getAI();
  
  const prompt = `Provide the pinyin (with tone marks) and a concise English meaning for the Chinese character: "${char}".
  Return a JSON object.`;

  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            char: { type: Type.STRING, description: "The Chinese character input" },
            pinyin: { type: Type.STRING, description: "Pinyin with tone marks" },
            meaning: { type: Type.STRING, description: "Concise English meaning" },
          },
          required: ["char", "pinyin", "meaning"],
        },
      },
    }));

    if (response.text) {
      return JSON.parse(response.text) as HanziData;
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Error fetching character details:", error);
    // Minimal fallback if details fetch fails
    return { char: char, pinyin: '...', meaning: 'Offline mode' };
  }
};

export const validateHandwriting = async (
  imageBase64: string,
  targetChar: string,
  strokeCount: number
): Promise<EvaluationResult> => {
  const ai = getAI();
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  const prompt = `Analyze this handwritten image. The user is attempting to write the Chinese character "${targetChar}".
  The user used ${strokeCount} strokes.
  
  IMPORTANT - COLOR CODING FOR STROKE ORDER:
  The strokes in the image are color-coded to indicate the order they were written:
  - The FIRST stroke is very dark red (almost black).
  - Subsequent strokes become progressively LIGHTER red.
  - The LAST stroke is the lightest/brightest red.
  
  Please evaluate:
  1. Is the handwriting recognizable as "${targetChar}"?
  2. Is the stroke count roughly correct?
  3. Does the stroke order (indicated by the dark-to-light gradient) follow the standard stroke order rules for this character?
  
  Ignore minor aesthetic imperfections, but penalize incorrect stroke order if clearly visible via the colors.`;

  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN, description: "True if legible, stroke count matches, and stroke order (colors) looks reasonably correct." },
            score: { type: Type.INTEGER, description: "0-100 rating. Deduct points for wrong stroke order (wrong color sequence)." },
            feedback: { type: Type.STRING, description: "Specific feedback on shape, stroke count, or stroke order (max 15 words)" },
          },
          required: ["isCorrect", "score", "feedback"],
        },
      },
    }));

    if (response.text) {
        return JSON.parse(response.text) as EvaluationResult;
    }
    throw new Error("Empty response from Gemini");

  } catch (error) {
    console.error("Error validating handwriting:", error);
    return {
      isCorrect: false,
      score: 0,
      feedback: "API Quota Exceeded. Please wait a moment or try again later.",
    };
  }
};