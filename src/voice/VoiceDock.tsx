import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSarvamAudioRecorder } from '../hooks/useSarvamAudioRecorder';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { routeVoiceCommand, VoiceCommand } from './commandRouter';

interface Props {
  onCommand: (cmd: VoiceCommand) => void;
}

/**
 * Always-available voice control for the senior app. Tap once and speak:
 *  1. Live mode (browser speech recognition): your words appear as you speak and it stops by itself when you finish.
 *  2. If that is unsupported or fails, it falls back to recording + Sarvam transcription.
 * It is tap-to-talk, not an always-on wake word (that would need the microphone open all the time).
 */
export const VoiceDock: React.FC<Props> = ({ onCommand }) => {
  const { language, settings } = useLanguage();
  const { speak } = useSpeechSynthesis(settings.speechRate);
  const live = useSpeechRecognition(language);
  const [mode, setMode] = useState<'live' | 'sarvam'>(live.isSupported ? 'live' : 'sarvam');
  const [heard, setHeard] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasListening = useRef(false);

  const flash = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setHeard(null);
      setSaid(null);
      setProblem(null);
    }, 7000);
  }, []);

  const handleSpoken = useCallback(
    (spoken: string) => {
      const cmd = routeVoiceCommand(spoken);
      const reply = language === 'ml' ? cmd.say.ml : cmd.say.en;
      setProblem(null);
      setHeard(spoken);
      setSaid(reply);
      if (settings.autoSpeak) speak(reply, language);
      onCommand(cmd);
      flash();
    },
    [flash, language, onCommand, settings.autoSpeak, speak]
  );

  const rec = useSarvamAudioRecorder(language, handleSpoken);

  // Live mode finished (the browser stops on silence): act on what was heard, or fall back to Sarvam.
  useEffect(() => {
    if (wasListening.current && !live.isListening) {
      const spoken = live.transcript.trim();
      if (spoken) {
        handleSpoken(spoken);
      } else if (live.error) {
        setProblem(live.error);
        setMode('sarvam'); // browser recognition unavailable here: use the recorder next time
        flash();
      } else {
        setProblem(language === 'ml' ? 'ഒന്നും കേട്ടില്ല. വീണ്ടും ശ്രമിക്കൂ.' : 'I did not hear anything. Please try again.');
        flash();
      }
    }
    wasListening.current = live.isListening;
  }, [live.isListening, live.transcript, live.error, handleSpoken, flash, language]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const listening = live.isListening || rec.isRecording;
  const busy = rec.isProcessing;
  const label = listening
    ? language === 'ml' ? 'കേൾക്കുന്നു… പറയൂ' : 'Listening… speak now'
    : busy
      ? language === 'ml' ? 'മനസ്സിലാക്കുന്നു…' : 'Understanding…'
      : language === 'ml' ? 'കൂടെ, ഒന്ന് പറയൂ' : 'Tap and speak';

  const onTap = () => {
    setProblem(null);
    if (mode === 'live') {
      if (live.isListening) live.stopListening();
      else live.startListening();
    } else if (rec.isRecording) {
      rec.stopRecording();
    } else {
      void rec.startRecording();
    }
  };

  const shownProblem = problem ?? rec.errorMessage;

  return (
    <div className="fixed left-0 right-0 bottom-[84px] z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {(live.isListening && live.transcript) || heard || shownProblem ? (
        <div role="status" aria-live="polite" className="pointer-events-auto max-w-md rounded-2xl bg-brand-ink text-white px-4 py-3 shadow-xl animate-riseIn text-center">
          {live.isListening && live.transcript ? (
            <p className="text-lg [overflow-wrap:anywhere]">“{live.transcript}”</p>
          ) : heard ? (
            <>
              <p className="text-base opacity-80 [overflow-wrap:anywhere]">“{heard}”</p>
              {said && <p className="text-lg font-bold">{said}</p>}
            </>
          ) : (
            <p className="text-base [overflow-wrap:anywhere]">{shownProblem}</p>
          )}
        </div>
      ) : null}
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-white/95 border-2 border-brand-line shadow-xl pl-5 pr-2 py-2">
        <span role="status" aria-live="polite" className="text-lg font-bold text-brand-forest">{label}</span>
        <span className="relative">
          {listening && <span className="absolute inset-0 rounded-full bg-brand-coral animate-pulseRing" aria-hidden="true" />}
          <button
            type="button"
            disabled={busy}
            onClick={onTap}
            aria-label={listening ? (language === 'ml' ? 'നിർത്തുക' : 'Stop') : language === 'ml' ? 'ശബ്ദ നിർദ്ദേശം നൽകുക' : 'Give a voice command'}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-95 disabled:opacity-70 cursor-pointer ${
              listening ? 'bg-brand-sos' : 'bg-brand-coral hover:bg-brand-coralDark'
            }`}
          >
            {busy ? <Loader2 className="w-8 h-8 animate-spin" aria-hidden="true" /> : listening ? <Square className="w-7 h-7" aria-hidden="true" /> : <Mic className="w-8 h-8" aria-hidden="true" />}
          </button>
        </span>
      </div>
    </div>
  );
};
