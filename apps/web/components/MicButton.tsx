'use client';

import React, { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface MicButtonProps {
  onResult: (transcript: string) => void;
  className?: string;
  label?: string;
}

export default function MicButton({ onResult, className = '', label }: MicButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const toggleRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการแปลงเสียงเป็นข้อความ (ใช้ Chrome เท่านั้น)');
      setSupported(false);
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setListening(false);
      recognitionRef.current = null;
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        alert('เกิดข้อผิดพลาดในการจดจำเสียง: ' + event.error);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggleRecognition}
      title={label || 'กดเพื่อพูด'}
      className={`absolute top-1/2 -translate-y-1/2 right-3 p-1.5 rounded-lg transition-all ${
        listening
          ? 'text-red-500 bg-red-50 animate-pulse'
          : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
      } ${className}`}
    >
      {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}
