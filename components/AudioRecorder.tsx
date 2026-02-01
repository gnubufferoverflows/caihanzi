import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Volume2 } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isProcessing: boolean;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onRecordingComplete, 
  isProcessing,
  disabled 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Check permission status on mount
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        setHasPermission(true);
        // Important: Stop the tracks immediately to turn off the mic indicator until actually recording
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(() => {
        setHasPermission(false);
      });
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
        
        // Cleanup stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setHasPermission(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (hasPermission === false) {
    return (
      <div className="text-xs text-red-500 flex items-center gap-1">
        <Mic size={14} /> Mic Access Denied
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing || disabled}
        className={`
          relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 shadow-md
          ${isProcessing 
            ? 'bg-stone-100 text-stone-400 cursor-wait' 
            : isRecording 
              ? 'bg-red-500 text-white shadow-red-200 scale-110' 
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={isRecording ? "Stop Recording" : "Record Pronunciation"}
      >
        {isProcessing ? (
          <Loader2 className="animate-spin" size={20} />
        ) : isRecording ? (
          <>
            <span className="absolute w-full h-full rounded-full bg-red-400 opacity-20 animate-ping"></span>
            <Square size={20} fill="currentColor" />
          </>
        ) : (
          <Mic size={20} />
        )}
      </button>
      
      <div className="h-4 text-[10px] font-medium text-stone-400 uppercase tracking-wide">
        {isRecording ? (
          <span className="text-red-500 animate-pulse">Recording...</span>
        ) : isProcessing ? (
          <span className="text-stone-500">Evaluating...</span>
        ) : (
          <span>Practice Speaking</span>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;