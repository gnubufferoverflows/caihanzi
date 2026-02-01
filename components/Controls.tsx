import React from 'react';
import { RefreshCw, Check, Trash2, ArrowRight } from 'lucide-react';

interface ControlsProps {
  onClear: () => void;
  onCheck: () => void;
  onNext: () => void;
  isChecking: boolean;
  canCheck: boolean;
  canNext: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  onClear, 
  onCheck, 
  onNext, 
  isChecking, 
  canCheck,
  canNext 
}) => {
  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      <button
        onClick={onClear}
        disabled={isChecking}
        className="p-3 rounded-full text-stone-500 hover:bg-stone-200 transition-colors disabled:opacity-50"
        title="Clear Canvas"
      >
        <Trash2 size={24} />
      </button>

      {canNext ? (
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
