import { useCallback, useEffect, useRef, useState } from 'react';
import { Language } from '../types';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSarvamAudioRecorder } from './useSarvamAudioRecorder';

/**
 * One spoken turn. Prefers live browser recognition (words appear as you speak and it stops by itself on silence,
 * which continuous conversation needs); if that is unsupported or fails it switches to recording + Sarvam
 * transcription. Never pretends to hear anything: failures are reported in `problem`.
 */
export function useVoiceTurn(language: Language, onSpoken: (text: string) => void) {
  const live = useSpeechRecognition(language);
  const [mode, setMode] = useState<'live' | 'sarvam'>(live.isSupported ? 'live' : 'sarvam');
  const [problem, setProblem] = useState<string | null>(null);
  const onSpokenRef = useRef(onSpoken);
  onSpokenRef.current = onSpoken;
  const wasListening = useRef(false);
  const delivered = useRef(false);

  const rec = useSarvamAudioRecorder(language, (text) => {
    onSpokenRef.current(text);
  });

  useEffect(() => {
    if (wasListening.current && !live.isListening && !delivered.current) {
      const spoken = live.transcript.trim();
      if (spoken) {
        delivered.current = true;
        onSpokenRef.current(spoken);
      } else if (live.error) {
        setProblem(live.error);
        setMode('sarvam'); // browser recognition not usable here: tap again to use the recorder
      } else {
        setProblem(language === 'ml' ? 'ഒന്നും കേട്ടില്ല.' : 'I did not hear anything.');
      }
    }
    wasListening.current = live.isListening;
  }, [live.isListening, live.transcript, live.error, language]);

  const start = useCallback(() => {
    if (live.isListening || rec.isRecording || rec.isProcessing) return; // never two microphone sessions
    setProblem(null);
    delivered.current = false;
    if (mode === 'live') live.startListening();
    else void rec.startRecording();
  }, [live, rec, mode]);

  const stop = useCallback(() => {
    if (live.isListening) live.stopListening();
    if (rec.isRecording) rec.stopRecording();
  }, [live, rec]);

  const cancel = useCallback(() => {
    delivered.current = true; // drop whatever is in flight
    if (live.isListening) live.stopListening();
    if (rec.isRecording) rec.cancelRecording();
  }, [live, rec]);

  return {
    mode,
    listening: live.isListening || rec.isRecording,
    transcribing: rec.isProcessing,
    interim: live.isListening ? live.transcript : '',
    problem: problem ?? rec.errorMessage,
    start,
    stop,
    cancel,
  };
}
