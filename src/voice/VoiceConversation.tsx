import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Repeat, Square, Volume2, VolumeX, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useVoiceTurn } from '../hooks/useVoiceTurn';
import { api, ApiError } from '../services/api';
import { AssistantResponse } from '../types';
import { routeVoiceCommand } from './commandRouter';
import type { PageView } from '../components/Navigation';

type Phase = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'ERROR';
interface Turn {
  id: number;
  role: 'user' | 'koode';
  text: string;
}

const T = {
  ml: {
    idle: 'സംസാരിക്കാൻ അമർത്തൂ',
    listening: 'ഞാൻ കേൾക്കുന്നുണ്ട്...',
    processing: 'ഒരു നിമിഷം...',
    speaking: 'കൂടെ സംസാരിക്കുന്നു...',
    ack: 'ശരി, ഞാൻ മനസ്സിലാക്കാൻ ശ്രമിക്കുകയാണ്.',
    stopSpeaking: 'സംസാരം നിർത്തുക',
    repeat: 'വീണ്ടും കേൾക്കുക',
    end: 'സംഭാഷണം അവസാനിപ്പിക്കുക',
    continuous: 'തുടർച്ചയായ സംഭാഷണം',
    noVoice: 'ഈ ഉപകരണത്തിൽ മലയാളം ശബ്ദം ലഭ്യമല്ല. മറുപടി എഴുത്തായി കാണിക്കുന്നു.',
    you: 'നിങ്ങൾ',
    koode: 'കൂടെ',
    empty: 'മൈക്ക് അമർത്തി സംസാരിക്കൂ. ഉദാ: "ഇന്ന് എനിക്ക് എന്തൊക്കെ ചെയ്യാനുണ്ട്?"',
    aiDown: 'കൂടെ AI ഇപ്പോൾ ലഭ്യമല്ല. ടൈപ്പ് ചെയ്ത് ശ്രമിക്കാം.',
    helpReply: 'ശരി, സഹായം ചോദിക്കാം. താഴെയുള്ള ബട്ടൺ അമർത്തി ശരിയാണോ എന്ന് നോക്കൂ.',
    helpBtn: 'സഹായം ചോദിക്കുക',
    familyReply: 'കുടുംബത്തെ വിളിക്കാൻ കുടുംബ പേജ് തുറക്കാം. അത്യാവശ്യമെങ്കിൽ അടിയന്തര ബട്ടൺ അമർത്തുക.',
    familyBtn: 'കുടുംബ പേജ് തുറക്കുക',
  },
  en: {
    idle: 'Tap to speak',
    listening: 'I am listening...',
    processing: 'One moment...',
    speaking: 'Koode is speaking...',
    ack: 'Okay, let me think about that.',
    stopSpeaking: 'Stop speaking',
    repeat: 'Hear again',
    end: 'End conversation',
    continuous: 'Continuous conversation',
    noVoice: 'No voice for this language is available on this device. The reply is shown as text.',
    you: 'You',
    koode: 'Koode',
    empty: 'Tap the mic and speak. For example: "What do I have to do today?"',
    aiDown: 'Koode AI is not available right now. You can type instead.',
    helpReply: 'Okay, let us ask for help. Press the button below and check the details.',
    helpBtn: 'Ask for help',
    familyReply: 'Let me open the family page so you can call. In an emergency, press the emergency button.',
    familyBtn: 'Open family page',
  },
} as const;

interface Props {
  /** Lets the host page show the reminder confirmation card etc. */
  onResponse: (resp: AssistantResponse) => void;
  onRequestHelp?: (text: string) => void;
  onNavigate?: (page: PageView) => void;
}

export const VoiceConversation: React.FC<Props> = ({ onResponse, onRequestHelp, onNavigate }) => {
  const { language, settings } = useLanguage();
  const c = language === 'ml' ? T.ml : T.en;
  const { speak, stop: stopSpeech, isSpeaking, voiceUnavailable } = useSpeechSynthesis(settings.speechRate);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [continuous, setContinuous] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState('');
  const [action, setAction] = useState<{ label: string; run: () => void } | null>(null);
  const busy = useRef(false); // blocks duplicate submissions while one request is in flight
  const idRef = useRef(0);
  const endedSpeaking = useRef(false);
  const continuousRef = useRef(continuous);
  continuousRef.current = continuous;
  const listRef = useRef<HTMLDivElement>(null);

  const addTurn = useCallback((role: Turn['role'], text: string) => {
    idRef.current += 1;
    const id = idRef.current; // capture now: the updater below runs later, after more turns may have been added
    setTurns((t) => [...t.slice(-9), { id, role, text }]);
  }, []);

  const handleSpoken = useCallback(
    async (text: string) => {
      const said = text.trim();
      if (!said || busy.current) return;
      busy.current = true;
      setError(null);
      addTurn('user', said); // the original transcription is kept exactly as heard
      setAction(null);

      // Help needs and "call my daughter" are NOT reminders: answer with a verified template and an explicit button
      // (nothing is created by voice alone; the senior still reviews and confirms in the help flow).
      const cmd = routeVoiceCommand(said);
      if ((cmd.type === 'help' && onRequestHelp) || (cmd.type === 'navigate' && cmd.page === 'family' && onNavigate)) {
        const isHelp = cmd.type === 'help';
        const reply = isHelp ? c.helpReply : c.familyReply;
        addTurn('koode', reply);
        setLastReply(reply);
        setContinuous(false); // a button press is needed next; do not keep listening
        setAction(isHelp ? { label: c.helpBtn, run: () => onRequestHelp!(said) } : { label: c.familyBtn, run: () => onNavigate!('family') });
        if (settings.autoSpeak) speak(reply, language);
        busy.current = false;
        return;
      }

      setThinking(true);
      speak(c.ack, language); // immediate verified acknowledgement; the real answer replaces it when ready
      try {
        const resp = await api.interpretAssistant(said, language, new Date().toISOString());
        onResponse(resp);
        addTurn('koode', resp.spoken_response);
        setLastReply(resp.spoken_response);
        endedSpeaking.current = false;
        if (settings.autoSpeak) speak(resp.spoken_response, language);
      } catch (e) {
        setError(e instanceof ApiError && e.code !== 'CONNECTION_ERROR' && e.code !== 'AI_UNAVAILABLE' ? e.message : c.aiDown);
        setContinuous(false); // never loop on errors
        stopSpeech();
      } finally {
        setThinking(false);
        busy.current = false;
      }
    },
    [addTurn, c, language, onNavigate, onRequestHelp, onResponse, settings.autoSpeak, speak, stopSpeech]
  );

  const turn = useVoiceTurn(language, (t) => void handleSpoken(t));

  // Continuous mode: listen again only AFTER Koode has finished speaking (so it never hears its own voice).
  const wasSpeaking = useRef(false);
  useEffect(() => {
    if (wasSpeaking.current && !isSpeaking && !busy.current && continuousRef.current && lastReply) {
      const id = setTimeout(() => {
        if (continuousRef.current && !busy.current) turn.start();
      }, 700);
      wasSpeaking.current = isSpeaking;
      return () => clearTimeout(id);
    }
    wasSpeaking.current = isSpeaking;
  }, [isSpeaking, lastReply, turn]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [turns]);

  const phase: Phase = error || turn.problem ? 'ERROR' : turn.listening ? 'LISTENING' : thinking || turn.transcribing ? 'PROCESSING' : isSpeaking ? 'SPEAKING' : 'IDLE';
  const label = { IDLE: c.idle, LISTENING: c.listening, PROCESSING: c.processing, SPEAKING: c.speaking, ERROR: c.idle }[phase];

  const onOrb = () => {
    if (phase === 'LISTENING') turn.stop();
    else if (phase === 'SPEAKING') stopSpeech();
    else if (phase === 'IDLE' || phase === 'ERROR') {
      stopSpeech(); // the mic must never be open while Koode is talking
      turn.start();
    }
  };

  const endAll = () => {
    setContinuous(false);
    turn.cancel();
    stopSpeech();
    busy.current = false;
    setThinking(false);
  };

  const orbColor = phase === 'LISTENING' ? 'bg-brand-sos' : phase === 'SPEAKING' ? 'bg-brand-forest' : 'bg-brand-coral';

  return (
    <section aria-label="Voice conversation" className="rounded-[2rem] bg-white border-2 border-brand-line p-5 sm:p-7 shadow-md space-y-5">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {(phase === 'LISTENING' || phase === 'SPEAKING') && (
            <>
              <span className={`absolute inset-0 rounded-full ${orbColor} animate-pulseRing`} aria-hidden="true" />
              <span className={`absolute -inset-3 rounded-full ${orbColor} opacity-20 animate-pulseRing`} style={{ animationDelay: '0.5s' }} aria-hidden="true" />
            </>
          )}
          <button
            type="button"
            onClick={onOrb}
            disabled={phase === 'PROCESSING'}
            aria-label={label}
            className={`relative w-32 h-32 rounded-full ${orbColor} text-white flex items-center justify-center shadow-xl transition-colors duration-300 active:scale-95 disabled:opacity-70 cursor-pointer`}
          >
            {phase === 'LISTENING' ? <Square className="w-12 h-12" aria-hidden="true" /> : phase === 'SPEAKING' ? <Volume2 className="w-14 h-14" aria-hidden="true" /> : <Mic className="w-14 h-14" aria-hidden="true" />}
          </button>
        </div>
        <p role="status" aria-live="polite" className="text-2xl font-bold text-brand-ink text-center min-h-[2rem]">{label}</p>
        {turn.interim && <p className="text-xl text-brand-muted text-center [overflow-wrap:anywhere]">“{turn.interim}”</p>}
      </div>

      {(error || turn.problem) && (
        <p role="alert" className="rounded-2xl bg-brand-sosSoft border-2 border-brand-sos px-4 py-3 text-lg font-semibold text-brand-sos [overflow-wrap:anywhere]">
          {error ?? turn.problem}
        </p>
      )}
      {voiceUnavailable && (
        <p role="note" className="rounded-2xl bg-brand-coralSoft border-2 border-brand-coral px-4 py-3 text-lg text-brand-coralDark">{c.noVoice}</p>
      )}

      <div ref={listRef} className="max-h-72 overflow-y-auto space-y-3" aria-live="polite" aria-label="Conversation">
        {turns.length === 0 ? (
          <p className="text-lg text-brand-muted text-center">{c.empty}</p>
        ) : (
          turns.map((t) => (
            <div key={t.id} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-3xl px-5 py-3 ${t.role === 'user' ? 'bg-brand-sage text-brand-ink' : 'bg-brand-forest text-white'}`}>
                <p className="text-sm opacity-75">{t.role === 'user' ? c.you : c.koode}</p>
                <p className="text-xl leading-snug [overflow-wrap:anywhere]">{t.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {action && (
        <button type="button" onClick={action.run} className="w-full min-h-[64px] rounded-2xl bg-brand-coral hover:bg-brand-coralDark text-white text-xl font-bold cursor-pointer animate-riseIn">
          {action.label}
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={stopSpeech} disabled={!isSpeaking} className="min-h-[56px] rounded-2xl border-2 border-brand-forest text-brand-forest font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer hover:bg-brand-sage">
          <VolumeX className="w-6 h-6" aria-hidden="true" /> {c.stopSpeaking}
        </button>
        <button type="button" onClick={() => lastReply && speak(lastReply, language)} disabled={!lastReply || phase === 'LISTENING'} className="min-h-[56px] rounded-2xl border-2 border-brand-forest text-brand-forest font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer hover:bg-brand-sage">
          <Repeat className="w-6 h-6" aria-hidden="true" /> {c.repeat}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-lg font-semibold text-brand-ink cursor-pointer min-h-[48px]">
          <input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} className="w-6 h-6 accent-[#1F4D3A]" />
          {c.continuous}
        </label>
        {(continuous || phase !== 'IDLE') && (
          <button type="button" onClick={endAll} className="min-h-[48px] px-4 rounded-2xl bg-brand-sosSoft text-brand-sos font-bold flex items-center gap-2 cursor-pointer">
            <X className="w-5 h-5" aria-hidden="true" /> {c.end}
          </button>
        )}
      </div>
    </section>
  );
};
