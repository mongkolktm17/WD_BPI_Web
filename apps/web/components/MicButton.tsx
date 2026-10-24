'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface MicButtonProps {
  onResult: (transcript: string) => void;
  currentValue?: string;
  mode?: 'replace' | 'append';
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
}

export default function MicButton({
  onResult,
  currentValue = '',
  mode = 'append',
  className = '',
  label = 'กดเพื่อพูด (Speech-to-Text)',
  size = 'md',
}: MicButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSupported(false);
      }
    }
  }, []);

  const toggleRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    if (listening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setListening(true);
      };

      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          if (mode === 'append' && currentValue && currentValue.trim()) {
            onResult(`${currentValue.trim()} ${transcript}`);
          } else {
            onResult(transcript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        setListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition initiation error:', err);
      setListening(false);
    }
  };

  if (!supported) return null;

  const defaultPosition = className.includes('top-') || className.includes('relative')
    ? ''
    : 'absolute top-1/2 -translate-y-1/2 right-2.5';

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={toggleRecognition}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer select-none ${defaultPosition} ${
        listening
          ? 'text-rose-600 bg-rose-50 ring-2 ring-rose-400 ring-offset-1 animate-pulse'
          : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100 active:scale-95'
      } ${className}`}
    >
      {listening ? <MicOff className={iconSize} /> : <Mic className={iconSize} />}
    </button>
  );
}
