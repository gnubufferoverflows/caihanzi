import React from 'react';
import { RotateCcw, User } from 'lucide-react';
import { HSKLevel, HSK_GOALS, PracticeSource } from '../types';

interface ProgressStatsProps {
  username: string;
  masteredCount: number; // This is raw count of mastered chars relevant to current source
  retryCount: number;
  source: PracticeSource;
  onOpenProfile: () => void;
}

const ProgressStats: React.FC<ProgressStatsProps> = ({ 
  username, 
  masteredCount, 
  retryCount, 
  source,
  onOpenProfile
}) => {
  let goal = 0;
  let label = '';

  if (source.type === 'hsk') {
    goal = HSK_GOALS[source.level];
    label = `HSK ${source.level}`;
  } else {
    goal = source.palette.chars.length;
    label = source.palette.name;
  }

  // Calculate percentage, capped at 100 for display
  const percentage = goal > 0 ? Math.min(100, Math.round((masteredCount / goal) * 100)) : 0;

  return (
    <div className="w-full flex flex-col gap-3 mb-2">
      {/* Top Row: User & Retry Badge */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onOpenProfile}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 group-hover:bg-stone-300 transition-colors">
            <span className="font-bold text-xs">{username.slice(0, 2).toUpperCase()}</span>
          </div>
          <span className="text-xs font-medium text-stone-500 group-hover:text-stone-800 transition-colors">My Progress</span>
        </button>

        {retryCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-100 shadow-sm text-xs font-medium">
            <RotateCcw size={12} />
            <span>{retryCount} to Review</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-stone-500">
          <span>{label} Mastery</span>
          <span>{Math.min(masteredCount, goal)} / {goal}</span>
        </div>
        <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
           <div 
             className={`h-full rounded-full transition-all duration-500 ease-out ${source.type === 'hsk' ? 'bg-stone-800' : 'bg-indigo-600'}`}
             style={{ width: `${percentage}%` }}
           />
        </div>
      </div>
    </div>
  );
};

export default ProgressStats;
