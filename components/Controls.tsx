import React from 'react';
import { RefreshCw, Check, Trash2, ArrowRight, RotateCcw, MessageCircleQuestion } from 'lucide-react';

interface ControlsProps {
  onClear: () => void;
  onCheck: () => void;
  onNext: () => void;
  onTryAgain: () => void;
  onAppeal: () => void;
  isChecking: boolean;
  canCheck: boolean;
  canNext: boolean;
  needsWork: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  onClear, 
  onCheck, 
  onNext, 
  onTryAgain,
  onAppeal,
  isChecking, 
  canCheck,
  canNext,
  needsWork
}) => {
  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      
      {/* Clear Button - Hide during 'Needs Work' to focus on choice */}
      {!needsWork && (
        <button
          onClick={onClear}
          disabled={isChecking}
          className="p-3 rounded-full text-stone-500 hover:bg-stone-200 transition-colors disabled:opacity-50"
          title="Clear Canvas"
        >
          <Trash2 size={24} />
        </button>
      )}

      {/* Main Action Buttons */}
      {needsWork ? (
        <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
          <button
            onClick={onTryAgain}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-stone-300 text-stone-700 rounded-full font-medium hover:bg-stone-50 transition-transform active:scale-95 shadow-sm"
          >
            <RotateCcw size={18} />
            <span>Try Again</span>
          </button>
          
          <button
            onClick={onAppeal}
            className="flex items-center gap-2 px-5 py-3 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 transition-transform active:scale-95 shadow-lg shadow-stone-300"
          >
             <MessageCircleQuestion size={18} />
             <span>I was right</span>
          </button>
        </div>
      ) : canNext ? (
         <button
         onClick={onNext}
         className="flex items-center gap-2 px-8 py-3 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 transition-transform active:scale-95 shadow-lg shadow-stone-300"
       >
         <span>Next Character</span>
         <ArrowRight size={20} />
       </button>
      ) : (
        <button
          onClick={onCheck}
          disabled={!canCheck || isChecking}
          className={`flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all shadow-lg active:scale-95 
            ${!canCheck ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none' : 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-300'}
          `}
        >
          {isChecking ? (
             <RefreshCw className="animate-spin" size={20} />
          ) : (
             <Check size={20} />
          )}
          <span>{isChecking ? 'Checking...' : 'Check'}</span>
        </button>
      )}
    </div>
  );
};

export default Controls;