import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface StrokeOrderHintProps {
  char: string;
  onClose: () => void;
}

const StrokeOrderHint: React.FC<StrokeOrderHintProps> = ({ char, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current && window.HanziWriter) {
      // Clear previous content
      containerRef.current.innerHTML = '';

      try {
        writerRef.current = window.HanziWriter.create(containerRef.current, char, {
          width: 200,
          height: 200,
          padding: 5,
          showOutline: true,
          strokeAnimationSpeed: 1, // 1x speed
          delayBetweenStrokes: 200, // ms
          strokeColor: '#1c1917', // stone-900
          radicalColor: '#b91c1c', // red-700
        });

        writerRef.current.loopCharacterAnimation();
      } catch (e) {
        console.error("Failed to initialize HanziWriter", e);
        // Fallback text if writer fails (e.g. offline or missing char data)
        if (containerRef.current) {
            containerRef.current.innerText = "Animation unavailable";
        }
      }
    }
  }, [char]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative flex flex-col items-center">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors"
        >
          <X size={24} />
        </button>
        
        <h3 className="text-xl font-bold font-serif mb-6 text-stone-800">Stroke Order Hint</h3>
        
        <div ref={containerRef} className="border-2 border-stone-100 rounded-xl bg-stone-50 mb-6" />

        <p className="text-sm text-stone-500 text-center">
          Watch the animation to learn the correct stroke order.
        </p>
      </div>
    </div>
  );
};

export default StrokeOrderHint;
