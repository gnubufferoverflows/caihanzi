import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Lightbulb, RotateCcw, SlidersHorizontal, Minus, Plus, AlignLeft, Type, Brain, Eye, Trash2, Volume2, Mic } from 'lucide-react';
import Canvas, { CanvasHandle } from './components/Canvas';
import Controls from './components/Controls';
import AudioRecorder from './components/AudioRecorder';
import StrokeOrderHint from './components/StrokeOrderHint';
import ProgressStats from './components/ProgressStats';
import LoginScreen from './components/LoginScreen';
import ProfileModal from './components/ProfileModal';
import AppealModal from './components/AppealModal';
import PaletteManager from './components/PaletteManager';
import Logo from './components/Logo';
import { HSKLevel, PracticeMode, PracticeScope, HanziData, EvaluationResult, PracticeSource, CustomPalette, SentenceData, AudioEvaluationResult } from './types';
import { fetchRandomCharacter, validateHandwriting, fetchCharacterDetails, adjudicateHandwriting, fetchRandomSentence, validatePronunciation } from './services/gemini';

const App: React.FC = () => {
  // Auth State
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem('zenhanzi_current_user');
  });
  const [showProfile, setShowProfile] = useState(false);

  // App State
  const [source, setSource] = useState<PracticeSource>({ type: 'hsk', level: HSKLevel.HSK1 });
  const [mode, setMode] = useState<PracticeMode>(PracticeMode.COPY);
  const [scope, setScope] = useState<PracticeScope>('CHAR');
  
  const [currentHanzi, setCurrentHanzi] = useState<HanziData | null>(null);
  const [currentSentence, setCurrentSentence] = useState<SentenceData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  
  // Single Char Result
  const [result, setResult] = useState<EvaluationResult | null>(null);
  
  // Sentence Results (Key: index of char in sentence)
  const [sentenceResults, setSentenceResults] = useState<Record<number, EvaluationResult>>({});
  
  // Audio Results
  const [audioResult, setAudioResult] = useState<AudioEvaluationResult | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  const [canvasHasContent, setCanvasHasContent] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [hintChar, setHintChar] = useState<string | null>(null); // Track which char needs hint
  const [isRetry, setIsRetry] = useState<boolean>(false);
  
  // Settings State
  const [canvasSize, setCanvasSize] = useState<number>(() => {
    const saved = localStorage.getItem('zenhanzi_canvas_size');
    return saved ? parseInt(saved, 10) : 320;
  });
  const [showSettings, setShowSettings] = useState(false);

  // Adjudication State
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealTarget, setAppealTarget] = useState<{char: string, index?: number} | null>(null);
  const [isAdjudicating, setIsAdjudicating] = useState(false);

  // Refs
  const singleCanvasRef = useRef<CanvasHandle>(null);
  const sentenceCanvasRefs = useRef<(CanvasHandle | null)[]>([]);

  // Persistence Key Helpers
  const getKey = (key: string) => username ? `zenhanzi_${username}_${key}` : null;

  // Data State
  const [masteredChars, setMasteredChars] = useState<Record<string, number>>({});
  const [retryQueue, setRetryQueue] = useState<HanziData[]>([]);
  const [customPalettes, setCustomPalettes] = useState<CustomPalette[]>([]);

  // Load User Data
  useEffect(() => {
    if (!username) return;

    const masteredKey = getKey('mastered');
    const retryKey = getKey('retry');
    const palettesKey = getKey('palettes');

    if (masteredKey) {
      const saved = localStorage.getItem(masteredKey);
      setMasteredChars(saved ? JSON.parse(saved) : {});
    }

    if (retryKey) {
      const saved = localStorage.getItem(retryKey);
      setRetryQueue(saved ? JSON.parse(saved) : []);
    }

    if (palettesKey) {
      const saved = localStorage.getItem(palettesKey);
      setCustomPalettes(saved ? JSON.parse(saved) : []);
    }
  }, [username]);

  // Persist Data
  useEffect(() => {
    if (username) {
      localStorage.setItem(getKey('mastered')!, JSON.stringify(masteredChars));
      localStorage.setItem(getKey('retry')!, JSON.stringify(retryQueue));
      localStorage.setItem(getKey('palettes')!, JSON.stringify(customPalettes));
    }
  }, [masteredChars, retryQueue, customPalettes, username]);

  // Persist Canvas Size
  useEffect(() => {
    localStorage.setItem('zenhanzi_canvas_size', canvasSize.toString());
  }, [canvasSize]);


  // Load Content Logic (Char or Sentence)
  const loadContent = useCallback(async () => {
    if (!username) return;

    setIsLoading(true);
    setResult(null);
    setSentenceResults({});
    setAudioResult(null);
    singleCanvasRef.current?.clear();
    // Clear sentence canvas refs implicitly by unmounting/remounting, or manually if needed
    
    setCanvasHasContent(false);
    setShowHint(false);
    setIsRetry(false);
    setShowAppeal(false);
    
    try {
      if (scope === 'SENTENCE') {
         const sentData = await fetchRandomSentence(source);
         setCurrentSentence(sentData);
         // Reset Refs array size
         sentenceCanvasRefs.current = new Array(sentData.breakdown.length).fill(null);
      } else {
        // CHAR Mode
        setCurrentSentence(null);
        
        const shouldPickFromRetry = retryQueue.length > 0 && (Math.random() < 0.4 || retryQueue.length > 5);
        if (shouldPickFromRetry) {
          const nextChar = retryQueue[0];
          setCurrentHanzi(nextChar);
          setIsRetry(true);
        } else {
          if (source.type === 'hsk') {
             const data = await fetchRandomCharacter(source.level);
             setCurrentHanzi(data);
          } else {
             const { chars } = source.palette;
             if (chars.length === 0) {
               alert("This palette is empty!");
               return;
             }
             const unmastered = chars.filter(c => !masteredChars[c]);
             const pool = unmastered.length > 0 ? unmastered : chars;
             const randomChar = pool[Math.floor(Math.random() * pool.length)];
             const data = await fetchCharacterDetails(randomChar);
             setCurrentHanzi(data);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [source, retryQueue, username, masteredChars, scope]);

  // Trigger load on init or source/scope change
  useEffect(() => {
    if (username && !isLoading) {
      loadContent();
    }
  }, [source, username, scope]); 

  // Handlers
  const handleLogin = (name: string) => {
    localStorage.setItem('zenhanzi_current_user', name);
    setUsername(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('zenhanzi_current_user');
    setUsername(null);
    setShowProfile(false);
    setMasteredChars({});
    setRetryQueue([]);
    setCustomPalettes([]);
    setCurrentHanzi(null);
    setCurrentSentence(null);
  };

  const markMastery = (char: string) => {
    setMasteredChars(prev => ({
      ...prev,
      [char]: source.type === 'hsk' ? source.level : 99 
    }));
    setRetryQueue(prev => prev.filter(c => c.char !== char));
  };

  const markFailure = (charData: HanziData) => {
    const alreadyInQueue = retryQueue.some(c => c.char === charData.char);
    if (!alreadyInQueue) {
      setRetryQueue(prev => [...prev, charData]);
    }
  };

  const handleAudioRecordingComplete = async (audioBlob: Blob) => {
    if (!currentSentence) return;
    
    setIsProcessingAudio(true);
    setAudioResult(null);

    // Convert Blob to Base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      if (base64Audio) {
        try {
          const result = await validatePronunciation(base64Audio, currentSentence.text, currentSentence.pinyin);
          setAudioResult(result);
        } catch (error) {
          console.error("Audio validation failed", error);
        } finally {
          setIsProcessingAudio(false);
        }
      }
    };
  };

  const handleCheck = async () => {
    setIsChecking(true);

    if (scope === 'SENTENCE' && currentSentence) {
      // BATCH CHECK LOGIC
      const checksToRun: Promise<{ index: number, result: EvaluationResult }>[] = [];
      
      // Identify which canvases need checking (not empty, not already correct)
      currentSentence.breakdown.forEach((charData, idx) => {
        const canvas = sentenceCanvasRefs.current[idx];
        const existingResult = sentenceResults[idx];
        
        // Skip if already correct
        if (existingResult && existingResult.isCorrect && existingResult.score >= 80) return;
        
        // Skip if empty
        if (!canvas || canvas.isEmpty()) return;

        const annotatedImageData = canvas.getAnnotatedImageData();
        const strokeCount = canvas.getStrokeCount();

        const checkPromise = validateHandwriting(annotatedImageData, charData.char, strokeCount)
          .then(res => ({ index: idx, result: res }))
          .catch(err => ({ index: idx, result: { isCorrect: false, score: 0, feedback: "Error" } as EvaluationResult }));
        
        checksToRun.push(checkPromise);
      });

      if (checksToRun.length > 0) {
        const results = await Promise.all(checksToRun);
        
        setSentenceResults(prev => {
           const next = { ...prev };
           results.forEach(({ index, result }) => {
             next[index] = result;
             // Update Mastery or Queue
             const charData = currentSentence.breakdown[index];
             if (result.isCorrect && result.score >= 80) {
               markMastery(charData.char);
             } else {
               markFailure(charData);
             }
           });
           return next;
        });
      }

    } else if (currentHanzi && singleCanvasRef.current) {
      // SINGLE CHAR CHECK
      const annotatedImageData = singleCanvasRef.current.getAnnotatedImageData();
      const strokeCount = singleCanvasRef.current.getStrokeCount();
      
      try {
        const evaluation = await validateHandwriting(annotatedImageData, currentHanzi.char, strokeCount);
        setResult(evaluation);

        if (evaluation.isCorrect && evaluation.score >= 80) {
          markMastery(currentHanzi.char);
        } else {
          markFailure(currentHanzi);
        }

      } catch (err) {
        console.error(err);
        setResult({ isCorrect: false, score: 0, feedback: "Error checking. Try again." });
      }
    }
    
    setIsChecking(false);
  };

  const handleTryAgain = () => {
    if (scope === 'CHAR') {
      singleCanvasRef.current?.clear();
      setCanvasHasContent(false);
      setResult(null);
    } else {
      // In sentence mode, clear all that are incorrect
      currentSentence?.breakdown.forEach((_, idx) => {
        const res = sentenceResults[idx];
        const canvas = sentenceCanvasRefs.current[idx];
        // If it exists but is not mastered, clear it
        if (canvas && (!res || res.score < 80)) {
           canvas.clear();
        }
      });
      // Remove failed results from state to reset UI
      setSentenceResults(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          const k = Number(key);
          if (next[k].score < 80) delete next[k];
        });
        return next;
      });
      // Clear audio result
      setAudioResult(null);
    }
  };

  const handleAppealSubmit = async (reasoning: string) => {
    if (!appealTarget) return;

    const { char, index } = appealTarget;
    let originalResult: EvaluationResult | null = null;
    let canvas: CanvasHandle | null = null;

    if (index !== undefined) {
      // Sentence Mode Appeal
      originalResult = sentenceResults[index];
      canvas = sentenceCanvasRefs.current[index];
    } else {
      // Single Mode Appeal
      originalResult = result;
      canvas = singleCanvasRef.current;
    }

    if (!canvas || !originalResult) return;
    
    setIsAdjudicating(true);
    const annotatedImageData = canvas.getAnnotatedImageData();

    try {
      const newResult = await adjudicateHandwriting(
        annotatedImageData, 
        char, 
        originalResult.feedback, 
        reasoning
      );
      
      if (index !== undefined) {
        setSentenceResults(prev => ({ ...prev, [index]: newResult }));
      } else {
        setResult(newResult);
      }
      
      setShowAppeal(false);
      setAppealTarget(null);
      
      if (newResult.isCorrect && newResult.score >= 80) {
        setRetryQueue(prev => prev.filter(c => c.char !== char));
        markMastery(char);
      }

    } catch (err) {
      console.error(err);
      alert("Failed to submit appeal. Please try again.");
    } finally {
      setIsAdjudicating(false);
    }
  };

  const handleClear = () => {
    if (scope === 'CHAR') {
      singleCanvasRef.current?.clear();
      setCanvasHasContent(false);
      setResult(null);
    } else {
      // Clear all non-mastered canvases
      sentenceCanvasRefs.current.forEach((ref, idx) => {
         const res = sentenceResults[idx];
         if (ref && (!res || res.score < 80)) {
           ref.clear();
         }
      });
      // Clear results for non-mastered
      setSentenceResults(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          const k = Number(key);
          if (next[k].score < 80) delete next[k];
        });
        return next;
      });
    }
  };

  const handleCreatePalette = (name: string, rawChars: string) => {
    const chars = Array.from(new Set(rawChars.match(/[\u4e00-\u9fa5]/g) || []));
    if (chars.length === 0) {
      alert("No valid Chinese characters found.");
      return;
    }
    const newPalette: CustomPalette = {
      id: Date.now().toString(),
      name,
      chars
    };
    setCustomPalettes(prev => [...prev, newPalette]);
    setSource({ type: 'palette', palette: newPalette });
  };

  const handleDeletePalette = (id: string) => {
    setCustomPalettes(prev => prev.filter(p => p.id !== id));
    if (source.type === 'palette' && source.palette.id === id) {
      setSource({ type: 'hsk', level: HSKLevel.HSK1 });
    }
  };

  const openHint = (char: string) => {
    setHintChar(char);
    setShowHint(true);
  };

  if (!username) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const masteredCount = source.type === 'hsk' 
    ? Object.keys(masteredChars).length 
    : source.palette.chars.filter(c => masteredChars[c]).length;

  const needsWork = scope === 'CHAR' ? !!(result && result.score < 80) : false; // handled differently for sentences

  const isSentenceComplete = scope === 'SENTENCE' && currentSentence && 
    currentSentence.breakdown.every((_, idx) => sentenceResults[idx]?.isCorrect && sentenceResults[idx]?.score >= 80);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col items-center py-6 px-4 selection:bg-red-100 overflow-x-hidden">
      
      {/* Header */}
      <header className="w-full max-w-md flex flex-col items-center mb-2">
        <h1 className="text-2xl font-bold font-serif tracking-tight mb-4 flex items-center gap-2 text-stone-900">
          <Logo className="w-8 h-8" />
          彩汉字
        </h1>
        
        <ProgressStats 
          username={username}
          masteredCount={masteredCount} 
          retryCount={retryQueue.length}
          source={source}
          onOpenProfile={() => setShowProfile(true)}
        />
      </header>

      {/* Palette / Source Manager */}
      <div className="w-full max-w-md">
        <PaletteManager 
          currentSource={source}
          customPalettes={customPalettes}
          onSelectSource={setSource}
          onCreatePalette={handleCreatePalette}
          onDeletePalette={handleDeletePalette}
        />
      </div>
      
      {/* Practice Settings Toggles */}
      <div className="w-full max-w-md flex gap-2 mb-4">
        {/* Scope Toggle */}
        <div className="flex-1 bg-white border border-stone-200 rounded-lg p-1 flex shadow-sm">
           <button 
             onClick={() => setScope('CHAR')}
             className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${scope === 'CHAR' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-50'}`}
           >
             <Type size={14} /> Single
           </button>
           <button 
             onClick={() => setScope('SENTENCE')}
             className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${scope === 'SENTENCE' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-50'}`}
           >
             <AlignLeft size={14} /> Sentences
           </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex-1 bg-white border border-stone-200 rounded-lg p-1 flex shadow-sm">
           <button 
             onClick={() => setMode(PracticeMode.COPY)}
             className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${mode === PracticeMode.COPY ? 'bg-indigo-600 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-50'}`}
           >
             <Eye size={14} /> Copy
           </button>
           <button 
             onClick={() => setMode(PracticeMode.RECALL)}
             className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${mode === PracticeMode.RECALL ? 'bg-indigo-600 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-50'}`}
           >
             <Brain size={14} /> Recall
           </button>
        </div>
      </div>

      {/* Main Content */}
      <main 
        className="w-full relative flex flex-col items-center"
        style={{ maxWidth: Math.max(448, scope === 'CHAR' ? canvasSize + 32 : 600) }}
      >
        
        {/* Header Display (Character or Sentence Info) */}
        <div className="mb-4 text-center min-h-[60px] flex flex-col items-center justify-center relative w-full max-w-md">
          {isLoading ? (
             <div className="flex flex-col items-center gap-2 text-stone-400">
               <Loader2 className="animate-spin" size={28} />
             </div>
          ) : scope === 'SENTENCE' && currentSentence ? (
             <div className="flex flex-col items-center w-full animate-in fade-in">
                <div className="text-sm font-medium text-stone-600 mb-1">{currentSentence.meaning}</div>
                <div className="text-xs text-stone-400 mb-2">{currentSentence.pinyin}</div>
                
                {/* Audio Recorder */}
                <div className="mt-2">
                   <AudioRecorder 
                      onRecordingComplete={handleAudioRecordingComplete} 
                      isProcessing={isProcessingAudio}
                   />
                </div>
                
                {/* Audio Feedback */}
                {audioResult && (
                  <div className={`mt-3 p-3 rounded-lg text-sm w-full max-w-xs animate-in slide-in-from-top-1 ${
                    audioResult.score >= 80 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-orange-50 text-orange-800 border border-orange-200'
                  }`}>
                     <div className="flex items-center justify-between font-bold mb-1">
                        <span>Pronunciation</span>
                        <span>{audioResult.score}/100</span>
                     </div>
                     <p className="mb-1 leading-snug">{audioResult.feedback}</p>
                     
                     {/* Show what was heard if score is not good */}
                     {audioResult.heardPinyin && audioResult.score < 80 && (
                       <div className="my-2 p-2 bg-white/60 rounded border border-orange-100 text-xs">
                         <span className="block text-orange-900/70 text-[10px] uppercase font-bold tracking-wider">I heard:</span>
                         <span className="font-mono font-bold text-orange-900">{audioResult.heardPinyin}</span>
                       </div>
                     )}

                     {audioResult.pronunciationTips && (
                        <p className="text-xs opacity-80 mt-1 border-t border-current/20 pt-1">
                           <span className="font-bold">Tip:</span> {audioResult.pronunciationTips}
                        </p>
                     )}
                  </div>
                )}
             </div>
          ) : currentHanzi ? (
            /* Single Char Mode Display */
            <>
               {isRetry && (
                 <div className="absolute top-0 right-0 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-orange-100">
                   Review
                 </div>
               )}
               {mode === PracticeMode.COPY ? (
                 <>
                   <div className="text-6xl font-serif hanzi-font mb-1 text-stone-800">{currentHanzi.char}</div>
                   <div className="text-stone-500 font-medium">{currentHanzi.pinyin}</div>
                 </>
               ) : (
                 <>
                   <div className="text-6xl font-serif hanzi-font mb-1 text-stone-200 select-none">?</div>
                   <div className="text-stone-800 font-bold text-lg">{currentHanzi.pinyin}</div>
                   <div className="text-stone-600">{currentHanzi.meaning}</div>
                   {result?.isCorrect && result.score >= 80 && (
                     <div className="absolute inset-0 bg-stone-50/95 flex flex-col items-center justify-center animate-fade-in z-20">
                        <div className="text-green-600 font-bold mb-1">Correct!</div>
                        <div className="text-6xl font-serif hanzi-font text-stone-900">{currentHanzi.char}</div>
                     </div>
                   )}
                 </>
               )}
            </>
          ) : (
            <button 
              onClick={() => loadContent()}
              className="px-6 py-2 bg-stone-900 text-white rounded-full text-sm font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200"
            >
              Start Practice
            </button>
          )}
        </div>

        {/* Canvas Area - Conditional Rendering based on Scope */}
        {scope === 'SENTENCE' && currentSentence && !isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full justify-items-center mb-4">
                {currentSentence.breakdown.map((charData, idx) => {
                    const res = sentenceResults[idx];
                    const isMastered = res && res.isCorrect && res.score >= 80;
                    const isWrong = res && res.score < 80;
                    // In sentence mode, limit canvas size to fit grid, max 160px
                    const itemSize = Math.min(canvasSize, 160);

                    return (
                        <div key={idx} className="flex flex-col items-center gap-1 relative">
                            {/* Char Info - Display based on mode */}
                            <div className="h-8 flex items-end justify-center mb-1">
                                {isMastered ? (
                                    <span className="text-2xl font-serif text-stone-800 leading-none">{charData.char}</span>
                                ) : mode === PracticeMode.COPY ? (
                                    <span className="text-2xl font-serif text-stone-800 leading-none">{charData.char}</span>
                                ) : (
                                    <span className="text-sm font-medium text-stone-500">{charData.pinyin}</span>
                                )}
                            </div>

                            <div 
                                className="relative transition-all duration-300 ease-out"
                                style={{ width: itemSize, height: itemSize }}
                            >
                                {/* Watermark */}
                                {mode === PracticeMode.COPY && !isMastered && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10">
                                        <span className="font-serif hanzi-font leading-none text-stone-900 select-none" style={{ fontSize: `${itemSize * 0.6}px` }}>
                                            {charData.char}
                                        </span>
                                    </div>
                                )}
                                
                                {/* Mastered Overlay */}
                                {isMastered && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-green-50/90 rounded-xl border-2 border-green-500 animate-in fade-in">
                                         <span className="font-serif hanzi-font text-4xl text-green-900">{charData.char}</span>
                                    </div>
                                )}

                                <Canvas
                                    ref={el => sentenceCanvasRefs.current[idx] = el}
                                    width={itemSize}
                                    height={itemSize}
                                    readOnly={!!isMastered}
                                    className={`w-full h-full shadow-md bg-white rounded-xl ${isWrong ? 'ring-2 ring-red-300' : ''}`}
                                    onInteract={() => setCanvasHasContent(true)}
                                />
                                
                                {/* Tools for this canvas */}
                                {!isMastered && (
                                    <>
                                        <button 
                                            onClick={() => openHint(charData.char)}
                                            className="absolute top-1 right-1 p-1.5 bg-stone-100/80 hover:bg-stone-200 text-stone-600 rounded-full shadow-sm z-20"
                                            title="Hint"
                                        >
                                            <Lightbulb size={14} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                sentenceCanvasRefs.current[idx]?.clear();
                                                setSentenceResults(prev => {
                                                    const n = {...prev};
                                                    delete n[idx];
                                                    return n;
                                                });
                                            }}
                                            className="absolute bottom-1 right-1 p-1.5 bg-stone-100/80 hover:bg-stone-200 text-stone-600 rounded-full shadow-sm z-20"
                                            title="Clear"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Mini Feedback */}
                            {isWrong && (
                                <div className="absolute -bottom-12 left-0 right-0 z-30 bg-white border border-red-200 shadow-lg p-2 rounded-lg text-[10px] leading-tight text-red-700 animate-in zoom-in-95">
                                    <div className="font-bold mb-0.5">Needs Work</div>
                                    <div className="line-clamp-2">{res.feedback}</div>
                                    <button 
                                        onClick={() => {
                                            setAppealTarget({ char: charData.char, index: idx });
                                            setShowAppeal(true);
                                        }}
                                        className="mt-1 text-xs underline decoration-red-300"
                                    >
                                        Appeal
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        ) : scope === 'CHAR' && currentHanzi && !isLoading ? (
            /* Single Canvas Area */
            <div 
                className="relative mx-auto aspect-square transition-all duration-300 ease-out mb-4"
                style={{ width: '100%', maxWidth: `${canvasSize}px` }}
            >
                {mode === PracticeMode.COPY && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10">
                        <span className="font-serif hanzi-font leading-none text-stone-900 select-none" style={{ fontSize: `${canvasSize * 0.6}px` }}>
                        {currentHanzi.char}
                        </span>
                    </div>
                )}

                <Canvas 
                    ref={singleCanvasRef} 
                    width={canvasSize} 
                    height={canvasSize} 
                    className="w-full h-full shadow-xl bg-white rounded-xl"
                    onInteract={() => setCanvasHasContent(true)}
                />

                {!result || result.score < 80 ? (
                    <button 
                        onClick={() => openHint(currentHanzi.char)}
                        className="absolute top-2 right-2 p-2 bg-stone-100/80 hover:bg-stone-200 text-stone-600 rounded-full shadow-sm backdrop-blur-sm transition-colors z-20"
                    >
                        <Lightbulb size={20} />
                    </button>
                ) : null}
            </div>
        ) : null}

        <div className="w-full max-w-md">
           {/* Single Mode Feedback */}
           {scope === 'CHAR' && result && (
             <div className={`mt-4 p-4 rounded-lg shadow-lg border animate-in slide-in-from-top-2 mb-4
               ${result.isCorrect && result.score >= 80
                 ? 'bg-green-50 border-green-200 text-green-800' 
                 : 'bg-red-50 border-red-200 text-red-800'
               }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold flex items-center gap-2">
                       {result.isCorrect && result.score >= 80 ? 'Excellent!' : 'Needs Work'}
                       <span className="text-xs px-2 py-0.5 rounded-full border border-current opacity-60">
                         {result.score}/100
                       </span>
                    </div>
                    <p className="text-sm mt-1 leading-snug opacity-90">{result.feedback}</p>
                  </div>
                </div>
             </div>
           )}

          <Controls
            onClear={handleClear}
            onCheck={handleCheck}
            onNext={loadContent}
            onTryAgain={handleTryAgain}
            onAppeal={() => {
                if (scope === 'CHAR' && currentHanzi) {
                    setAppealTarget({ char: currentHanzi.char });
                    setShowAppeal(true);
                }
            }}
            isChecking={isChecking}
            canCheck={!isLoading && !isChecking && (!scope || (scope === 'CHAR' && (!result || result.score < 80)) || (scope === 'SENTENCE' && !isSentenceComplete))}
            canNext={scope === 'SENTENCE' ? !!isSentenceComplete : !!(result?.isCorrect && result.score >= 80)}
            needsWork={needsWork} // Only used for single char flow logic
          />
          
          {(!result || result.score < 80) && !isSentenceComplete && (
               <div className="mt-4 text-center">
                 <button onClick={() => loadContent()} className="text-stone-400 text-xs hover:text-stone-600 underline decoration-stone-300 underline-offset-4">
                   Skip
                 </button>
               </div>
          )}
        </div>

        {/* Canvas Size Slider Section - Only relevant for Single Char Mode mostly, but affects max size of grid items */}
        {scope === 'CHAR' && (
            <div className="mt-8 w-full max-w-md px-4">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors mx-auto mb-2"
            >
                <SlidersHorizontal size={14} />
                <span>Adjust Canvas Size</span>
            </button>
            
            {showSettings && (
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-600">Canvas Size</span>
                    <span className="text-xs text-stone-400">{canvasSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setCanvasSize(s => Math.max(280, s - 10))} className="p-1 text-stone-400 hover:text-stone-900">
                        <Minus size={16} />
                    </button>
                    <input 
                        type="range" 
                        min="280" 
                        max="600" 
                        step="10"
                        value={canvasSize}
                        onChange={(e) => setCanvasSize(Number(e.target.value))}
                        className="flex-1 h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-900"
                    />
                    <button onClick={() => setCanvasSize(s => Math.min(600, s + 10))} className="p-1 text-stone-400 hover:text-stone-900">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="text-[10px] text-stone-400 mt-2 text-center">
                    Resizing will clear the current canvas.
                </div>
                </div>
            )}
            </div>
        )}

        {/* Modals */}
        {showAppeal && appealTarget && (
          <AppealModal
            char={appealTarget.char}
            isSubmitting={isAdjudicating}
            onClose={() => {
                setShowAppeal(false);
                setAppealTarget(null);
            }}
            onSubmit={handleAppealSubmit}
          />
        )}

        {showHint && hintChar && (
          <StrokeOrderHint 
            char={hintChar} 
            onClose={() => {
                setShowHint(false);
                setHintChar(null);
            }} 
          />
        )}
        
        {showProfile && (
          <ProfileModal 
            username={username}
            masteredChars={masteredChars}
            onClose={() => setShowProfile(false)}
            onLogout={handleLogout}
          />
        )}

      </main>
    </div>
  );
};

export default App;