import { useState, useCallback, useEffect, useRef } from 'react';
import { Language } from '../types';

interface SpeechSynthesisHook {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string, lang?: Language) => void;
  stop: () => void;
  /** true when no voice for the language could be used on this device (the text is still shown) */
  voiceUnavailable: boolean;
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

// Sarvam voices exist for Malayalam and English. Most browsers/Windows installs have NO Malayalam voice, so the
// server-generated audio is what actually lets the app talk back in Malayalam.
const SERVER_VOICE: Language[] = ['ml', 'en'];
const audioCache = new Map<string, string>(); // "lang|text" -> object URL (short phrases repeat a lot)

export function useSpeechSynthesis(rate: number = 0.9): SpeechSynthesisHook {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceUnavailable, setVoiceUnavailable] = useState<boolean>(false);
  const browserSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const audioSupported = typeof window !== 'undefined' && typeof Audio !== 'undefined';
  const isSupported = browserSupported || audioSupported;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0); // lets a newer speak()/stop() cancel an older in-flight one

  const stop = useCallback(() => {
    token.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (browserSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [browserSupported]);

  useEffect(() => () => stop(), [stop]);

  const speakWithBrowser = useCallback(
    (text: string, lang: Language) => {
      if (!browserSupported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate; // 0.85 - 0.9 for elder clarity
      utterance.pitch = 1.0;
      const locale = TTS_LOCALE_MAP[lang] || 'en-US';
      utterance.lang = locale;
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) => v.lang.startsWith(lang) || v.lang.startsWith(locale));
      if (matchedVoice) utterance.voice = matchedVoice;
      // Malayalam with no installed voice would be silent: say so instead of pretending it was spoken.
      if (!matchedVoice && lang === 'ml') {
        setVoiceUnavailable(true);
        return;
      }
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [browserSupported, rate]
  );

  const speak = useCallback(
    (text: string, lang: Language = 'en') => {
      if (!text) return;
      stop();
      setVoiceUnavailable(false);
      const mine = token.current;

      const run = async () => {
        if (audioSupported && SERVER_VOICE.includes(lang)) {
          try {
            const key = `${lang}|${text}`;
            let url = audioCache.get(key);
            if (!url) {
              const res = await fetch('/api/speech/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, language: lang }),
              });
              if (!res.ok) throw new Error(`speak HTTP ${res.status}`);
              url = URL.createObjectURL(await res.blob());
              audioCache.set(key, url);
            }
            if (mine !== token.current) return; // a newer request replaced this one
            const audio = new Audio(url);
            audio.playbackRate = Math.min(1.1, Math.max(0.8, rate + 0.1));
            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => setIsSpeaking(false);
            audioRef.current = audio;
            await audio.play();
            return;
          } catch {
            if (mine !== token.current) return;
            /* server voice unavailable or autoplay blocked: fall back to the browser voice */
          }
        }
        speakWithBrowser(text, lang);
      };
      void run();
    },
    [audioSupported, rate, speakWithBrowser, stop]
  );

  return { isSpeaking, isSupported, speak, stop, voiceUnavailable };
}
