import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Lightbulb, RotateCcw } from 'lucide-react';
import Canvas, { CanvasHandle } from './components/Canvas';
import Controls from './components/Controls';
import StrokeOrderHint from './components/StrokeOrderHint';
import ProgressStats from './components/ProgressStats';
import LoginScreen from './components/LoginScreen';
import ProfileModal from './components/ProfileModal';
import PaletteManager from './components/PaletteManager';
import Logo from './components/Logo';
import { HSKLevel, PracticeMode, HanziData, EvaluationResult, PracticeSource, CustomPalette } from './types';
import { fetchRandomCharacter, validateHandwriting, fetchCharacterDetails } from './services/gemini';

const App: React.FC = () => {
  // Auth State
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem('zenhanzi_current_user');
  });
  const [showProfile, setShowProfile] = useState(false);

  // App State
  const [source, setSource] = useState<PracticeSource>({ type: 'hsk', level: HSKLevel.HSK1 });
  const [mode, setMode] = useState<PracticeMode>(PracticeMode.COPY);
  const [currentHanzi, setCurrentHanzi] = useState<HanziData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [canvasHasContent, setCanvasHasContent] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isRetry, setIsRetry] = useState<boolean>(false);

  const canvasRef = useRef<CanvasHandle>(null);

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


  // Load new character logic
  const loadCharacter = useCallback(async () => {
    if (!username) return;

    setIsLoading(true);
    setResult(null);
    canvasRef.current?.clear();
    setCanvasHasContent(false);
    setShowHint(false);
    setIsRetry(false);
    
    // Retry Logic
    // We prioritize retries that match the current source if possible, 
    // but generalized spaced repetition might mix them. 
    // For now, let's keep retries separate or just pull from global queue if available.
    const shouldPickFromRetry = retryQueue.length > 0 && (Math.random() < 0.4 || retryQueue.length > 5);

    try {
      if (shouldPickFromRetry) {
        const nextChar = retryQueue[0];
        setCurrentHanzi(nextChar);
        setIsRetry(true);
      } else {
        if (source.type === 'hsk') {
           const data = await fetchRandomCharacter(source.level);
           setCurrentHanzi(data);
        } else {
           // Custom Palette Logic
           // Pick a random char from the palette that is NOT mastered yet?
           // Or just random to reinforce?
           // Strategy: Filter unmastered -> if empty, pick any.
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [source, retryQueue, username, masteredChars]);

  // Initial Load or Source Change
  useEffect(() => {
    if (username && !isLoading) {
       loadCharacter();
    }
  }, [source]); 


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
  };

  const handleCheck = async () => {
    if (!canvasRef.current || !currentHanzi) return;
    
    setIsChecking(true);
    const imageData = canvasRef.current.getImageData();
    const strokeCount = canvasRef.current.getStrokeCount();
    
    try {
      const evaluation = await validateHandwriting(imageData, currentHanzi.char, strokeCount);
      setResult(evaluation);

      if (evaluation.isCorrect && evaluation.score >= 80) {
        // Success
        setMasteredChars(prev => ({
          ...prev,
          [currentHanzi.char]: source.type === 'hsk' ? source.level : 99 // 99 for custom
        }));
        setRetryQueue(prev => prev.filter(c => c.char !== currentHanzi.char));
      } else {
        // Failure
        const alreadyInQueue = retryQueue.some(c => c.char === currentHanzi.char);
        if (!alreadyInQueue && evaluation.score < 80) {
          setRetryQueue(prev => [...prev, currentHanzi]);
        }
      }

    } catch (err) {
      console.error(err);
      setResult({ isCorrect: false, score: 0, feedback: "Error checking. Try again." });
    } finally {
      setIsChecking(false);
    }
  };

  const handleClear = () => {
    canvasRef.current?.clear();
    setCanvasHasContent(false);
    setResult(null);
  };

  const handleCreatePalette = (name: string, rawChars: string) => {
    // Extract unique Chinese characters
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

  // Render Login if no user
  if (!username) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Calculate stats for current view
  const getCurrentMasteredCount = () => {
    if (source.type === 'hsk') {
       return Object.values(masteredChars).filter(l => l <= source.level).length; 
    } else {
       return source.palette.chars.filter(c => masteredChars[c]).length;
    }
  };
  
  const masteredCount = source.type === 'hsk' 
    ? Object.keys(masteredChars).length 
    : source.palette.chars.filter(c => masteredChars[c]).length;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col items-center py-6 px-4 selection:bg-red-100">
      
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
      <PaletteManager 
        currentSource={source}
        customPalettes={customPalettes}
        onSelectSource={setSource}
        onCreatePalette={handleCreatePalette}
        onDeletePalette={handleDeletePalette}
      />

      {/* Main Content */}
      <main className="w-full max-w-md relative">
        
        {/* Character Display */}
        <div className="mb-6 text-center h-28 flex flex-col items-center justify-center relative">
          {isLoading ? (
             <div className="flex flex-col items-center gap-2 text-stone-400">
               <Loader2 className="animate-spin" size={28} />
             </div>
          ) : currentHanzi ? (
            <>
               {isRetry && (
                 <div className="absolute top-0 right-0 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-orange-100">
                   Review
                 </div>
               )}
               {mode === PracticeMode.COPY ? (
                 <>
                   <div className="text-6xl font-serif hanzi-font mb-2 text-stone-800">{currentHanzi.char}</div>
                   <div className="text-stone-500 font-medium">{currentHanzi.pinyin}</div>
                 </>
               ) : (
                 <>
                   <div className="text-6xl font-serif hanzi-font mb-2 text-stone-200 select-none">?</div>
                   <div className="text-stone-800 font-bold text-lg">{currentHanzi.pinyin}</div>
                   <div className="text-stone-600">{currentHanzi.meaning}</div>
                   {/* Reveal if correct */}
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
            <div className="text-red-500 text-sm">Tap next to start</div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="relative mx-auto w-full aspect-square max-w-[320px]">
           {mode === PracticeMode.COPY && currentHanzi && !isLoading && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10">
                <span className="text-[200px] font-serif hanzi-font leading-none text-stone-900">
                  {currentHanzi.char}
                </span>
             </div>
           )}

           <Canvas 
             ref={canvasRef} 
             width={320} 
             height={320} 
             className="w-full h-full shadow-xl bg-white rounded-xl"
             onInteract={() => setCanvasHasContent(true)}
           />

            {currentHanzi && !isLoading && (!result || result.score < 80) && (
              <button 
                onClick={() => setShowHint(true)}
                className="absolute top-2 right-2 p-2 bg-stone-100/80 hover:bg-stone-200 text-stone-600 rounded-full shadow-sm backdrop-blur-sm transition-colors z-20"
              >
                <Lightbulb size={20} />
              </button>
            )}

           {/* Feedback */}
           {result && (
             <div className={`absolute bottom-4 left-4 right-4 p-4 rounded-lg shadow-lg border backdrop-blur-sm animate-in slide-in-from-bottom-2
               ${result.isCorrect && result.score >= 80
                 ? 'bg-green-50/90 border-green-200 text-green-800' 
                 : 'bg-red-50/90 border-red-200 text-red-800'
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
        </div>

        <Controls
          onClear={handleClear}
          onCheck={handleCheck}
          onNext={loadCharacter}
          isChecking={isChecking}
          canCheck={canvasHasContent && !isLoading && !isChecking && (!result || result.score < 80)}
          canNext={!!(result?.isCorrect && result.score >= 80)}
        />
        
        {(!result || result.score < 80) && (
             <div className="mt-4 text-center">
               <button onClick={loadCharacter} className="text-stone-400 text-xs hover:text-stone-600 underline decoration-stone-300 underline-offset-4">
                 Skip
               </button>
             </div>
        )}

        {/* Modals */}
        {showHint && currentHanzi && (
          <StrokeOrderHint 
            char={currentHanzi.char} 
            onClose={() => setShowHint(false)} 
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