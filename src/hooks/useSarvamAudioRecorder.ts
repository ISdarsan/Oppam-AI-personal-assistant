import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioRecordingState, Language } from '../types';
import { api, ApiError } from '../services/api';
import { triggerHapticFeedback } from '../utils/communication';

interface SarvamAudioRecorderHook {
  state: AudioRecordingState;
  recordingDuration: number;
  transcript: string;
  errorMessage: string | null;
  errorSuggestion: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  reset: () => void;
  supportedMimeType: string | null;
}

const MAX_RECORDING_SECONDS = 30;

function getSupportedAudioMimeType(): string | null {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return null;
  }
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];
  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export function useSarvamAudioRecorder(
  language: Language,
  onTranscriptReady?: (transcript: string) => void
): SarvamAudioRecorderHook {
  const [state, setState] = useState<AudioRecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string | null>(null);

  useEffect(() => {
    mimeTypeRef.current = getSupportedAudioMimeType();
  }, []);

  const cleanupStream = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  const cancelRecording = useCallback(() => {
    triggerHapticFeedback(30);
    cleanupStream();
    setState('idle');
    setRecordingDuration(0);
  }, [cleanupStream]);

  const reset = useCallback(() => {
    cleanupStream();
    setState('idle');
    setRecordingDuration(0);
    setTranscript('');
    setErrorMessage(null);
    setErrorSuggestion(null);
  }, [cleanupStream]);

  const startRecording = useCallback(async () => {
    triggerHapticFeedback(60);
    setErrorMessage(null);
    setErrorSuggestion(null);
    setTranscript('');
    setRecordingDuration(0);

    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState('error');
      setErrorMessage(
        language === 'ml'
          ? 'ഈ ബ്രൗസറിൽ മൈക്രോഫോൺ റെക്കോർഡിംഗ് ലഭ്യമല്ല. ദയവായി എഴുതി നൽകുക.'
          : 'Audio recording is not supported in this browser. Please type your request.'
      );
      return;
    }

    try {
      setState('requesting_permission');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = mimeTypeRef.current || 'audio/webm';
      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        cleanupStream();
        setState('error');
        setErrorMessage(
          language === 'ml'
            ? 'ശബ്ദം റെക്കോർഡ് ചെയ്യുന്നതിൽ പിശക് സംഭവിച്ചു.'
            : 'An error occurred during audio recording.'
        );
      };

      recorder.onstop = async () => {
        const streamTracks = mediaStreamRef.current?.getTracks() || [];
        streamTracks.forEach((t) => t.stop());

        if (audioChunksRef.current.length === 0) {
          setState('error');
          setErrorMessage(
            language === 'ml'
              ? 'ശബ്ദമൊന്നും കേൾക്കാൻ കഴിഞ്ഞില്ല. മൈക്രോഫോണിലേക്ക് വ്യക്തമായി സംസാരിക്കുക.'
              : 'No audio was recorded. Please speak clearly into the microphone.'
          );
          return;
        }

        const effectiveMime = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: effectiveMime });

        if (audioBlob.size < 500) {
          setState('error');
          setErrorMessage(
            language === 'ml'
              ? 'റെക്കോർഡിംഗ് വളരെ ചെറുതാണ്. ദയവായി വീണ്ടും ശ്രമിക്കുക.'
              : 'The audio recording was too brief. Please try speaking again.'
          );
          return;
        }

        // Upload and transcribe with Sarvam AI
        setState('transcribing');
        try {
          const extension = effectiveMime.includes('mp4') ? 'mp4' : 'webm';
          const result = await api.transcribeAudio(audioBlob, language, `voice.${extension}`);
          const recognizedText = result.transcript.trim();

          if (!recognizedText) {
            setState('error');
            setErrorMessage(
              language === 'ml'
                ? 'സംസാരം തിരിച്ചറിയാനായില്ല. ദയവായി വ്യക്തമായി സംസാരിക്കുക.'
                : 'No clear speech was recognized. Please speak distinctly into the microphone.'
            );
            return;
          }

          setTranscript(recognizedText);
          setState('ready');
          if (onTranscriptReady) {
            onTranscriptReady(recognizedText);
          }
        } catch (err) {
          console.error('Sarvam STT transcription failed:', err);
          setState('error');
          if (err instanceof ApiError) {
            setErrorMessage(err.message);
            setErrorSuggestion(err.suggestion || null);
          } else {
            setErrorMessage(
              language === 'ml'
                ? 'സർവം AI വോയ്‌സ് ട്രാൻസ്ക്രിപ്ഷൻ ഇപ്പോൾ ലഭ്യമല്ല. ദയവായി എഴുതി നൽകുക.'
                : 'Sarvam AI speech transcription is currently unavailable. Please type your request.'
            );
          }
        }
      };

      recorder.start(250); // Collect in 250ms chunks
      setState('recording');

      // Live seconds counter
      let seconds = 0;
      durationTimerRef.current = setInterval(() => {
        seconds += 1;
        setRecordingDuration(seconds);
        if (seconds >= MAX_RECORDING_SECONDS) {
          // Auto-stop at 30 seconds
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      }, 1000);
    } catch (err: any) {
      cleanupStream();
      setState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          language === 'ml'
            ? 'മൈക്രോഫോൺ അനുമതി നിഷേധിക്കപ്പെട്ടു. ബ്രൗസറിൽ മൈക്രോഫോൺ അനുമതി നൽകുക അല്ലെങ്കിൽ താഴെ എഴുതി നൽകുക.'
            : 'Microphone permission was denied. Please allow microphone access in your browser or type your request.'
        );
        setErrorSuggestion('Click the lock or camera/mic icon in your browser address bar to allow microphone access.');
      } else {
        setErrorMessage(
          language === 'ml'
            ? 'മൈക്രോഫോൺ ആക്സസ് ചെയ്യാൻ കഴിഞ്ഞില്ല.'
            : `Could not access microphone: ${err.message || 'Unknown device error'}`
        );
      }
    }
  }, [cleanupStream, language, onTranscriptReady]);

  const stopRecording = useCallback(() => {
    triggerHapticFeedback(50);
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setState('uploading');
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    state,
    recordingDuration,
    transcript,
    errorMessage,
    errorSuggestion,
    isRecording: state === 'recording',
    isProcessing: state === 'requesting_permission' || state === 'uploading' || state === 'transcribing',
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    supportedMimeType: mimeTypeRef.current,
  };
}
