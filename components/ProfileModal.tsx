import React from 'react';
import { X, LogOut, Trophy, User } from 'lucide-react';
import { HSKLevel, HSK_GOALS } from '../types';

interface ProfileModalProps {
  username: string;
  masteredChars: Record<string, number>;
  onClose: () => void;
  onLogout: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ username, masteredChars, onClose, onLogout }) => {
  
  // Calculate stats per level
  const getStatsForLevel = (level: number) => {
    // Show total unique characters mastered.
    // Show progress bars for each level based on that total count.
    // e.g. if I have 200 chars, I am 100% done with HSK 1 (150) and 66% done with HSK 2 (300).
    // This assumes efficient learning (learning HSK 1 before 2).
    
    const uniqueCount = Object.keys(masteredChars).length;
    const goal = HSK_GOALS[level as HSKLevel];
    const percent = Math.min(100, Math.round((uniqueCount / goal) * 100));
    const isCompleted = uniqueCount >= goal;
    
    return { uniqueCount, goal, percent, isCompleted };
  };

  const totalMastered = Object.keys(masteredChars).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-stone-200 p-2 rounded-full">
               <User className="text-stone-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">{username}</h2>
              <p className="text-xs text-stone-500 uppercase tracking-wider font-bold">Scholar</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="text-yellow-600" size={20} />
            <h3 className="font-bold text-stone-800">Progress Overview</h3>
          </div>
          
          <div className="space-y-6">
            {Object.values(HSKLevel).filter(k => typeof k === 'number').map((levelVal) => {
              const level = levelVal as HSKLevel;
              const { uniqueCount, goal, percent, isCompleted } = getStatsForLevel(level);
              
              return (
                <div key={level} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-sm text-stone-700">HSK {level}</span>
                    <span className="text-xs font-medium text-stone-500">
                      {Math.min(uniqueCount, goal)} / {goal}
                    </span>
                  </div>
                  <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-green-500' : 'bg-stone-800'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  {isCompleted && (
                    <div className="text-[10px] text-green-600 font-bold flex items-center gap-1 justify-end">
                      Complete <Trophy size={10} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50">
          <button
            onClick={onLogout}
            className="w-full py-3 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
