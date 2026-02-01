export enum HSKLevel {
  HSK1 = 1,
  HSK2 = 2,
  HSK3 = 3,
  HSK4 = 4,
  HSK5 = 5,
  HSK6 = 6,
}

export const HSK_GOALS: Record<HSKLevel, number> = {
  [HSKLevel.HSK1]: 150,
  [HSKLevel.HSK2]: 300,
  [HSKLevel.HSK3]: 600,
  [HSKLevel.HSK4]: 1200,
  [HSKLevel.HSK5]: 2500,
  [HSKLevel.HSK6]: 5000,
};

export interface CustomPalette {
  id: string;
  name: string;
  chars: string[];
}

export type PracticeSource = 
  | { type: 'hsk'; level: HSKLevel } 
  | { type: 'palette'; palette: CustomPalette };

export enum PracticeMode {
  COPY = 'COPY', // Show character, user copies
  RECALL = 'RECALL', // Show pinyin/meaning, user recalls
}

export interface HanziData {
  char: string;
  pinyin: string;
  meaning: string;
}

export interface EvaluationResult {
  isCorrect: boolean;
  score: number;
  feedback: string;
}

export interface DrawingPoint {
  x: number;
  y: number;
}

declare global {
  interface Window {
    HanziWriter: any;
  }
}
