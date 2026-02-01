import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface CanvasProps {
  onInteract?: () => void;
  width?: number;
  height?: number;
  className?: string;
}

export interface CanvasHandle {
  clear: () => void;
  getImageData: () => string;
  isEmpty: () => boolean;
  getStrokeCount: () => number;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(({ onInteract, width = 300, height = 300, className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasContent(false);
        setStrokeCount(0);
      }
    },
    getImageData: () => {
      return canvasRef.current?.toDataURL('image/png') || '';
    },
    isEmpty: () => !hasContent,
    getStrokeCount: () => strokeCount
  }));

  const getCoordinates = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    lastPos.current = { x, y };
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      // Dynamic Stroke Color for Order Tracking
      // Dark red (hue 0, lightness 20%) -> Lighter red (hue 0, lightness ~70%)
      // Step: 5% lightness per stroke.
      const lightness = Math.min(70, 20 + (strokeCount * 5));
      ctx.strokeStyle = `hsl(0, 85%, ${lightness}%)`;
      
      ctx.beginPath();
      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Increment stroke count on start of new stroke
    setStrokeCount(prev => prev + 1);

    // Capture pointer to track movement even if it leaves canvas
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    if (!hasContent) setHasContent(true);
    if (onInteract) onInteract();
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !lastPos.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCoordinates(e);

    if (ctx) {
      // Ensure the color persists during the stroke (it should, as context state persists until changed)
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPos.current = { x, y };
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    lastPos.current = null;
    
    const target = e.target as HTMLElement;
    try {
      if (target.hasPointerCapture && target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // Ignore errors if pointer capture was already lost
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set actual canvas size to match display size for retina sharpness
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Initial defaults
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // StrokeStyle is now set dynamically in startDrawing
      }
    }
  }, [width, height]);

  return (
    <div className={`relative ${className} select-none touch-none`}>
       {/* Background Grid for Hanzi - Tian Zi Ge */}
       <div className="absolute inset-0 pointer-events-none border-2 border-stone-300 bg-white shadow-sm rounded-xl overflow-hidden">
          <div className="absolute w-full h-[1px] bg-red-100 top-1/2 transform -translate-y-1/2 dashed-line"></div>
          <div className="absolute h-full w-[1px] bg-red-100 left-1/2 transform -translate-x-1/2 dashed-line"></div>
          <div className="absolute w-full h-full border-4 border-stone-100 opacity-50"></div>
          <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
             <line x1="0" y1="0" x2="100" y2="100" stroke="red" strokeWidth="0.5" strokeDasharray="2" />
             <line x1="100" y1="0" x2="0" y2="100" stroke="red" strokeWidth="0.5" strokeDasharray="2" />
          </svg>
       </div>
      
      <canvas
        ref={canvasRef}
        className="relative z-10 w-full h-full touch-none cursor-crosshair rounded-xl"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
    </div>
  );
});

Canvas.displayName = "Canvas";

export default Canvas;