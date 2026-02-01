import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

interface AppealModalProps {
  char: string;
  onClose: () => void;
  onSubmit: (reasoning: string) => void;
  isSubmitting: boolean;
}

const AppealModal: React.FC<AppealModalProps> = ({ char, onClose, onSubmit, isSubmitting }) => {
  const [reasoning, setReasoning] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reasoning.trim()) {
      onSubmit(reasoning);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative">
        <button 
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <h3 className="text-xl font-bold font-serif mb-2 text-stone-900">Adjudication Appeal</h3>
          <p className="text-sm text-stone-500 mb-4">
            Explain to the AI why your writing of "{char}" is correct.
          </p>

          <form onSubmit={handleSubmit}>
            <textarea
              className="w-full h-32 p-3 rounded-lg border border-stone-200 text-sm focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50 text-stone-900 placeholder-stone-400 resize-none"
              placeholder="e.g., I used a cursive stroke order, or the angle is just slightly off..."
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              required
            />
            
            <button
              type="submit"
              disabled={isSubmitting || !reasoning.trim()}
              className="w-full mt-4 bg-stone-900 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              <span>Submit Appeal</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppealModal;