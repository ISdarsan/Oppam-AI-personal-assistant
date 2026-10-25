import { useState, useCallback, useEffect } from 'react';
import { Language } from '../types';

interface SpeechSynthesisHook {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string, lang?: Language) => void;
  stop: () => void;
}

const TTS_LOCALE_MAP: Record<Language, string> = {
  en: 'en-US',
  ml: 'ml-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-PT',
  it: 'it-IT',
  ar: 'ar-SA',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

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
      const locale = TTS_LOCALE_MAP[lang] || 'en-US';
      utterance.lang = locale;

      // Pick best matching voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang.startsWith(lang) || v.lang.startsWith(locale));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
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
