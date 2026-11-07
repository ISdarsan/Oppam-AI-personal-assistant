import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSarvamAudioRecorder } from '../hooks/useSarvamAudioRecorder';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { routeVoiceCommand, VoiceCommand } from './commandRouter';

interface Props {
  onCommand: (cmd: VoiceCommand) => void;
}

/**
 * Always-available voice control for the senior app: tap once, say what you want ("open reminders", "ask for help",
 * "emergency"), and the app acts and answers back. It is tap-to-talk, not an always-on wake word (that would need
 * the microphone open all the time).
 */
export const VoiceDock: React.FC<Props> = ({ onCommand }) => {
  const { language, settings } = useLanguage();
  const { speak } = useSpeechSynthesis(settings.speechRate);
  const [heard, setHeard] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rec = useSarvamAudioRecorder(language, (spoken) => {
    const cmd = routeVoiceCommand(spoken);
    const reply = language === 'ml' ? cmd.say.ml : cmd.say.en;
    setHeard(spoken);
    setSaid(reply);
    if (settings.autoSpeak) speak(reply, language);
    onCommand(cmd);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setHeard(null);
      setSaid(null);
    }, 6000);
  });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const listening = rec.isRecording;
  const busy = rec.isProcessing;
  const label = listening
    ? language === 'ml' ? 'കേൾക്കുന്നു… പറയൂ' : 'Listening… speak now'
    : busy
      ? language === 'ml' ? 'മനസ്സിലാക്കുന്നു…' : 'Understanding…'
      : language === 'ml' ? 'കൂടെ, ഒന്ന് പറയൂ' : 'Tap and speak';

  return (
    <div className="fixed left-0 right-0 bottom-[84px] z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {(heard || rec.errorMessage) && (
        <div role="status" aria-live="polite" className="pointer-events-auto max-w-md rounded-2xl bg-brand-ink text-white px-4 py-3 shadow-xl animate-riseIn text-center">
          {heard ? (
            <>
              <p className="text-base opacity-80 [overflow-wrap:anywhere]">“{heard}”</p>
              {said && <p className="text-lg font-bold">{said}</p>}
            </>
          ) : (
            <p className="text-base">{language === 'ml' ? 'ശബ്ദം മനസ്സിലായില്ല. വീണ്ടും ശ്രമിക്കൂ.' : 'Could not hear that. Please try again.'}</p>
          )}
        </div>
      )}
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-white/95 border-2 border-brand-line shadow-xl pl-5 pr-2 py-2">
        <span role="status" aria-live="polite" className="text-lg font-bold text-brand-forest">{label}</span>
        <span className="relative">
          {listening && <span className="absolute inset-0 rounded-full bg-brand-coral animate-pulseRing" aria-hidden="true" />}
          <button
            type="button"
            disabled={busy}
            onClick={() => (listening ? rec.stopRecording() : rec.startRecording())}
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
