import { useState, useCallback, useEffect } from 'react';
import { Language } from '../types';

interface SpeechSynthesisHook {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string, lang?: Language) => void;
  stop: () => void;
}

export function useSpeechSynthesis(rate: number = 0.9): SpeechSynthesisHook {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    return () => {
      if (isSupported && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const speak = useCallback(
    (text: string, lang: Language = 'en') => {
      if (!isSupported || !text) return;

      window.speechSynthesis.cancel(); // Stop prior speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate; // 0.85 - 0.9 for elder clarity
      utterance.pitch = 1.0;
      utterance.lang = lang === 'ml' ? 'ml-IN' : 'en-IN';

      // Pick best matching voice if available
      const voices = window.speechSynthesis.getVoices();
      if (lang === 'ml') {
        const mlVoice = voices.find(v => v.lang.startsWith('ml'));
        if (mlVoice) utterance.voice = mlVoice;
      } else {
        const enVoice = voices.find(v => v.lang.includes('IN') || v.lang.startsWith('en'));
        if (enVoice) utterance.voice = enVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, rate]
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return { isSpeaking, isSupported, speak, stop };
}
