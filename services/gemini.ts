import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { HSKLevel, HanziData, EvaluationResult, PracticeSource, SentenceData, AudioEvaluationResult } from "../types";

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

export const fetchRandomSentence = async (source: PracticeSource): Promise<SentenceData> => {
  const ai = getAI();
  
  let promptContext = "";
  if (source.type === 'hsk') {
    promptContext = `appropriate for HSK Level ${source.level}. Use simple vocabulary from this level.`;
  } else {
    // Palette
    const chars = source.palette.chars.slice(0, 100).join(''); // Limit context to avoid token limits if list is huge
    promptContext = `using a mix of these characters: "${chars}". You may use basic connecting words (like 的, 是, 在) even if not in the list.`;
  }

  const prompt = `Generate a single short Chinese sentence (4-8 characters) ${promptContext}.
  Return a JSON object with:
  - text: the simplified chinese sentence
  - pinyin: full pinyin sentence
  - meaning: english translation
  - breakdown: an array of objects for each character in the sentence, containing {char, pinyin, meaning}.
  `;

  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The full sentence in Simplified Chinese" },
            pinyin: { type: Type.STRING, description: "Full sentence pinyin" },
            meaning: { type: Type.STRING, description: "English translation of the sentence" },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                   char: { type: Type.STRING },
                   pinyin: { type: Type.STRING },
                   meaning: { type: Type.STRING },
                },
                required: ["char", "pinyin", "meaning"]
              }
            }
          },
          required: ["text", "pinyin", "meaning", "breakdown"],
        },
      },
    }));

    if (response.text) {
      return JSON.parse(response.text) as SentenceData;
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Error fetching sentence:", error);
    // Fallback stub
    return {
      text: "你好",
      pinyin: "nǐ hǎo",
      meaning: "Hello (Offline)",
      breakdown: [
        { char: "你", pinyin: "nǐ", meaning: "you" },
        { char: "好", pinyin: "hǎo", meaning: "good" }
      ]
    };
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
  
  CRITICAL - STROKE ORDER INDICATORS:
  The image has explicitly generated annotations to show the user's stroke order:
  1. GREEN CIRCLES with NUMBERS (1, 2, 3...) indicate the START position of each stroke.
  2. RED DOTS indicate the END position of each stroke.
  
  Please evaluate:
  1. Is the handwriting recognizable as "${targetChar}"?
  2. Is the stroke count roughly correct?
  3. Using the numbered start points and red end points, does the stroke order follow the standard rules? (e.g. Top to bottom, Left to right, Outside before inside).
  
  Ignore minor aesthetic imperfections, but penalize incorrect stroke order if the numbers clearly show a violation of standard rules.`;

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
            isCorrect: { type: Type.BOOLEAN, description: "True if legible, stroke count matches, and stroke order (verified by numbers) looks reasonably correct." },
            score: { type: Type.INTEGER, description: "0-100 rating. Deduct points for wrong stroke order." },
            feedback: { type: Type.STRING, description: "Specific feedback on shape or stroke order (max 15 words)" },
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

export const adjudicateHandwriting = async (
  imageBase64: string,
  targetChar: string,
  originalFeedback: string,
  userExplanation: string
): Promise<EvaluationResult> => {
  const ai = getAI();
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  const prompt = `The user is appealing a grading result for the Chinese character "${targetChar}".
  
  Original Feedback: "${originalFeedback}"
  User's Explanation: "${userExplanation}"
  
  The image shows the user's handwriting with numbered start points (green circles) and end points (red dots) for each stroke.
  
  Task:
  Review the image and the user's explanation. 
  If the user's explanation implies a valid alternative stroke order, a stylistic choice (e.g., cursive/running script), or if the original grading was simply too harsh regarding the geometry, GRANT the appeal.
  If the character is still fundamentally wrong or unrecognizable, DENY the appeal.`;

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
            isCorrect: { type: Type.BOOLEAN, description: "True if appeal is granted." },
            score: { type: Type.INTEGER, description: "New score (should be > 80 if granted, or kept low if denied)." },
            feedback: { type: Type.STRING, description: "Reason for decision (max 15 words)" },
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
    console.error("Error adjudicating:", error);
    return {
      isCorrect: false,
      score: 0,
      feedback: "Unable to process appeal.",
    };
  }
};

export const validatePronunciation = async (
  audioBase64: string,
  targetText: string,
  targetPinyin: string
): Promise<AudioEvaluationResult> => {
  const ai = getAI();
  
  // Clean base64 string if it contains data URI prefix
  const cleanAudio = audioBase64.includes('base64,') 
    ? audioBase64.split('base64,')[1] 
    : audioBase64;

  const prompt = `Analyze the audio recording. The user is attempting to say the Chinese sentence: "${targetText}" (${targetPinyin}).
  
  Please evaluate:
  1. Is the pronunciation accurate and understandable?
  2. Are the tones generally correct?
  3. Is the pacing natural?
  4. What did it actually sound like? Provide the pinyin of what you heard.
  
  Provide a score from 0-100 and specific feedback.`;

  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/webm", // Common browser recording format
              data: cleanAudio,
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
            isCorrect: { type: Type.BOOLEAN, description: "True if the sentence is clearly understood." },
            score: { type: Type.INTEGER, description: "0-100 rating based on clarity and tones." },
            feedback: { type: Type.STRING, description: "General encouragement or critique (max 15 words)." },
            pronunciationTips: { type: Type.STRING, description: "Specific tips on tones or sounds to improve." },
            heardPinyin: { type: Type.STRING, description: "The pinyin of what the audio actually sounded like. If perfectly correct, return the target pinyin." },
          },
          required: ["isCorrect", "score", "feedback", "pronunciationTips", "heardPinyin"],
        },
      },
    }));

    if (response.text) {
        return JSON.parse(response.text) as AudioEvaluationResult;
    }
    throw new Error("Empty response from Gemini");

  } catch (error) {
    console.error("Error validating pronunciation:", error);
    return {
      isCorrect: false,
      score: 0,
      feedback: "Audio processing error. Please try again.",
      pronunciationTips: "",
    };
  }
};