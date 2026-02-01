import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { DrawingPoint } from '../types';

interface CanvasProps {
  onInteract?: () => void;
  width?: number;
  height?: number;
  className?: string;
  readOnly?: boolean;
}

export interface CanvasHandle {
  clear: () => void;
  getImageData: () => string;
  getAnnotatedImageData: () => string;
  isEmpty: () => boolean;
  getStrokeCount: () => number;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(({ onInteract, width = 300, height = 300, className, readOnly = false }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const lastWidth = useRef<number>(6);
  
  // Store raw stroke data for generating AI annotations
  const strokesRef = useRef<DrawingPoint[][]>([]);
  const currentStrokeRef = useRef<DrawingPoint[]>([]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasContent(false);
        setStrokeCount(0);
        strokesRef.current = [];
        currentStrokeRef.current = [];
      }
    },
    getImageData: () => {
      return canvasRef.current?.toDataURL('image/png') || '';
    },
    getAnnotatedImageData: () => {
      if (!canvasRef.current) return '';
      
      // Create an offscreen canvas to draw annotations
      const offCanvas = document.createElement('canvas');
      offCanvas.width = width;
      offCanvas.height = height;
      const ctx = offCanvas.getContext('2d');
      
      if (!ctx) return '';

      // 1. Draw the user's original artwork
      ctx.drawImage(canvasRef.current, 0, 0);

      // 2. Overlay annotations (Numbers at start, Dots at end)
      strokesRef.current.forEach((stroke, index) => {
        if (stroke.length === 0) return;
        
        const start = stroke[0];
        const end = stroke[stroke.length - 1];

        // Draw Start Number (Green Circle with Number)
        ctx.beginPath();
        ctx.arc(start.x, start.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#16a34a'; // green-600
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), start.x, start.y);

        // Draw End Indicator (Red Dot)
        if (stroke.length > 1) {
            ctx.beginPath();
            ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#dc2626'; // red-600
            ctx.fill();
            ctx.stroke();
        }
      });

      return offCanvas.toDataURL('image/png');
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
    if (readOnly) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    lastPos.current = { x, y };
    
    // Start tracking new stroke path
    currentStrokeRef.current = [{ x, y }];
    
    // Calculate initial width
    const pressure = e.pressure !== undefined ? e.pressure : 0.5;
    const initialWidth = Math.max(3, pressure * 14);
    lastWidth.current = initialWidth;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const lightness = Math.min(70, 20 + (strokeCount * 5));
      const color = `hsl(0, 85%, ${lightness}%)`;
      
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = initialWidth;
      
      ctx.beginPath();
      ctx.arc(x, y, initialWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    setStrokeCount(prev => prev + 1);

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    if (!hasContent) setHasContent(true);
    if (onInteract) onInteract();
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();
    if (!isDrawing || !lastPos.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCoordinates(e);

    // Record point
    currentStrokeRef.current.push({ x, y });

    if (ctx) {
      const pressure = e.pressure !== undefined ? e.pressure : 0.5;
      const targetWidth = Math.max(3, pressure * 14);
      
      const smoothedWidth = lastWidth.current * 0.7 + targetWidth * 0.3;
      lastWidth.current = smoothedWidth;
      
      ctx.lineWidth = smoothedWidth;

      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPos.current = { x, y };
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    if (isDrawing) {
        // Commit the completed stroke to history
        if (currentStrokeRef.current.length > 0) {
            strokesRef.current.push([...currentStrokeRef.current]);
        }
    }

    setIsDrawing(false);
    lastPos.current = null;
    currentStrokeRef.current = [];
    
    const target = e.target as HTMLElement;
    try {
      if (target.hasPointerCapture && target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // Ignore errors
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [width, height]);

  return (
    <div className={`relative ${className} select-none touch-none ${readOnly ? 'cursor-default' : ''}`}>
       {/* Background Grid for Hanzi - Tian Zi Ge */}
       <div className={`absolute inset-0 pointer-events-none border-2 ${readOnly ? 'border-green-500 bg-green-50/20' : 'border-stone-300 bg-white'} shadow-sm rounded-xl overflow-hidden transition-colors`}>
          <div className="absolute w-full h-[1px] bg-red-100 top-1/2 transform -translate-y-1/2 dashed-line"></div>
          <div className="absolute h-full w-[1px] bg-red-100 left-1/2 transform -translate-x-1/2 dashed-line"></div>
          <div className="absolute w-full h-full border-4 border-stone-100 opacity-50"></div>
       </div>
      
      <canvas
        ref={canvasRef}
        className={`relative z-10 w-full h-full rounded-xl ${readOnly ? 'pointer-events-none' : 'cursor-crosshair'}`}
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