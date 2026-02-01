import React, { useState } from 'react';
import { Plus, Trash2, Book, ChevronDown, Check } from 'lucide-react';
import { HSKLevel, CustomPalette, PracticeSource } from '../types';

interface PaletteManagerProps {
  currentSource: PracticeSource;
  customPalettes: CustomPalette[];
  onSelectSource: (source: PracticeSource) => void;
  onCreatePalette: (name: string, chars: string) => void;
  onDeletePalette: (id: string) => void;
}

const PaletteManager: React.FC<PaletteManagerProps> = ({
  currentSource,
  customPalettes,
  onSelectSource,
  onCreatePalette,
  onDeletePalette,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPaletteName, setNewPaletteName] = useState('');
  const [newPaletteChars, setNewPaletteChars] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPaletteName && newPaletteChars) {
      onCreatePalette(newPaletteName, newPaletteChars);
      setNewPaletteName('');
      setNewPaletteChars('');
      setShowCreateForm(false);
    }
  };

  const isCurrent = (source: PracticeSource) => {
    if (source.type === 'hsk' && currentSource.type === 'hsk') {
      return source.level === currentSource.level;
    }
    if (source.type === 'palette' && currentSource.type === 'palette') {
      return source.palette.id === currentSource.palette.id;
    }
    return false;
  };

  const getLabel = () => {
    if (currentSource.type === 'hsk') {
      return `HSK Level ${currentSource.level}`;
    }
    return currentSource.palette.name;
  };

  return (
    <div className="relative w-full max-w-md z-30 mb-6">
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-stone-200 p-3 rounded-xl shadow-sm flex items-center justify-between text-left hover:border-stone-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${currentSource.type === 'hsk' ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>
            <Book size={20} />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">Current Collection</div>
            <div className="font-bold text-stone-900">{getLabel()}</div>
          </div>
        </div>
        <ChevronDown size={20} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-transparent z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-100 p-2 z-40 max-h-[60vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            
            {!showCreateForm ? (
              <>
                {/* HSK Section */}
                <div className="mb-2">
                  <div className="text-xs font-bold text-stone-400 px-3 py-2 uppercase">Official HSK</div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.values(HSKLevel).filter(k => typeof k === 'number').map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          onSelectSource({ type: 'hsk', level: l as HSKLevel });
                          setIsOpen(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isCurrent({ type: 'hsk', level: l as HSKLevel }) 
                            ? 'bg-stone-900 text-white' 
                            : 'hover:bg-stone-100 text-stone-700'
                        }`}
                      >
                        <span>HSK {l}</span>
                        {isCurrent({ type: 'hsk', level: l as HSKLevel }) && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Palettes Section */}
                <div className="border-t border-stone-100 pt-2 mb-2">
                   <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-xs font-bold text-stone-400 uppercase">My Palettes</div>
                      <button 
                        onClick={() => setShowCreateForm(true)}
                        className="p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-900 transition-colors"
                        title="Create Palette"
                      >
                        <Plus size={16} />
                      </button>
                   </div>
                   
                   {customPalettes.length === 0 ? (
                     <div className="px-3 py-2 text-sm text-stone-400 italic text-center">
                       No custom palettes yet.
                     </div>
                   ) : (
                     <div className="space-y-1">
                       {customPalettes.map(palette => (
                         <div key={palette.id} className="flex items-center gap-1">
                           <button
                             onClick={() => {
                               onSelectSource({ type: 'palette', palette });
                               setIsOpen(false);
                             }}
                             className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                               isCurrent({ type: 'palette', palette }) 
                                 ? 'bg-indigo-600 text-white' 
                                 : 'hover:bg-indigo-50 text-stone-700'
                             }`}
                           >
                             <div className="truncate pr-2">
                               <span>{palette.name}</span>
                               <span className="ml-2 opacity-60 text-xs font-normal">({palette.chars.length})</span>
                             </div>
                             {isCurrent({ type: 'palette', palette }) && <Check size={14} />}
                           </button>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               if (confirm('Delete this palette?')) onDeletePalette(palette.id);
                             }}
                             className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                </div>
                
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-2 border-t border-stone-100 text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-b-lg"
                >
                  <Plus size={16} /> Create New Palette
                </button>
              </>
            ) : (
              /* Create Form */
              <div className="p-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-stone-900">New Palette</h3>
                  <button onClick={() => setShowCreateForm(false)} className="text-stone-400 hover:text-stone-600">Cancel</button>
                </div>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Name</label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50 text-stone-900 placeholder-stone-400"
                      placeholder="e.g., Food Words"
                      value={newPaletteName}
                      onChange={e => setNewPaletteName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Characters</label>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:ring-2 focus:ring-stone-900 outline-none h-24 bg-stone-50 text-stone-900 placeholder-stone-400"
                      placeholder="Paste Chinese characters here..."
                      value={newPaletteChars}
                      onChange={e => setNewPaletteChars(e.target.value)}
                      required
                    />
                    <p className="text-[10px] text-stone-400 mt-1 text-right">
                      {newPaletteChars.replace(/[^\u4e00-\u9fa5]/g, '').length} characters detected
                    </p>
                  </div>
                  <button type="submit" className="w-full bg-stone-900 text-white py-2 rounded-lg text-sm font-medium">
                    Save Palette
                  </button>
                </form>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PaletteManager;