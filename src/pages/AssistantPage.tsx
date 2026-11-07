import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  AlertTriangle,
  Radio,
  Pill,
  Stethoscope,
  Phone,
  Droplet,
  ClipboardList,
  Cloud,
  Edit3,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSarvamAudioRecorder } from '../hooks/useSarvamAudioRecorder';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api, ApiError } from '../services/api';
import { storage } from '../services/storage';
import { AssistantResponse, ReminderIntentData, ReminderCategory } from '../types';
import { formatFriendlyDate, formatFriendlyTime, getTodayDateString } from '../utils/dateUtils';
import { triggerHapticFeedback } from '../utils/communication';

interface AssistantPageProps {
  onReminderSaved?: () => void;
  /** Offered when the senior's words sound like a request for community help; never sent automatically. */
  onRequestHelp?: (text: string) => void;
  /** Sentence spoken to the global voice control; sent as soon as the page opens. */
  initialText?: string;
}

const HELP_HINT =
  /(buy|bring|fetch|pick up|take me|take her|take him|someone to|help me|need help|groceries|medicine|hospital|bank|ration|ride|taxi)|(വാങ്ങ|സഹായം|ആശുപത്രി|മരുന്ന്|പലചരക്ക്|ബാങ്ക്|യാത്ര|കൊണ്ടുപോ|റേഷൻ)/i;

export const AssistantPage: React.FC<AssistantPageProps> = ({ onReminderSaved, onRequestHelp, initialText }) => {
  const { language, settings, t, tx } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<AssistantResponse | null>(null);
  const [pendingReminder, setPendingReminder] = useState<ReminderIntentData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [transcribedWithSarvam, setTranscribedWithSarvam] = useState(false);

  // Sarvam AI Voice Hook
  const {
    recordingDuration,
    transcript: sarvamTranscript,
    errorMessage: recorderError,
    errorSuggestion: recorderSuggestion,
    isRecording,
    isProcessing: isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording,
    reset: resetRecorder,
  } = useSarvamAudioRecorder(language, (transcribed) => {
    setInputText(transcribed);
    setTranscribedWithSarvam(true);
  });

  const { speak } = useSpeechSynthesis(settings.speechRate);

  useEffect(() => {
    if (initialText) {
      setInputText(initialText);
      void handleAskKoode(initialText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync Sarvam transcript to input box when ready
  useEffect(() => {
    if (sarvamTranscript) {
      setInputText(sarvamTranscript);
      // Voice-first: answer straight after the words are recognised (a reminder still needs the senior's confirmation).
      void handleAskKoode(sarvamTranscript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sarvamTranscript]);

  const handleMicClick = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setErrorMessage(null);
      setErrorSuggestion(null);
      setSuccessNotice(null);
      setPendingReminder(null);
      setTranscribedWithSarvam(false);
      await startRecording();
    }
  };

  const handleAskKoode = async (textToSubmit?: string) => {
    const query = (textToSubmit || inputText).trim();
    if (!query) return;

    if (isRecording) {
      stopRecording();
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setErrorSuggestion(null);
    setSuccessNotice(null);
    setPendingReminder(null);

    try {
      const response = await api.interpretAssistant(query, language, new Date().toISOString());
      setLastResponse(response);

      if (settings.autoSpeak && response.spoken_response) {
        speak(response.spoken_response, language);
      }

      if (response.intent === 'create_reminder' && response.reminder_data) {
        setPendingReminder(response.reminder_data);
      }
    } catch (err) {
      console.error('Assistant interpretation error:', err);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        setErrorSuggestion(err.suggestion || null);
      } else {
        setErrorMessage(t('assistantAIUnavailable'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSaveReminder = () => {
    if (!pendingReminder) return;

    triggerHapticFeedback(80);

    const reminderDate = pendingReminder.date || getTodayDateString();
    const reminderTime = pendingReminder.time || '18:00';
    const category: ReminderCategory = pendingReminder.category || 'general';

    storage.saveReminder({
      title: pendingReminder.title,
      date: reminderDate,
      time: reminderTime,
      description: pendingReminder.description || undefined,
      category,
      completed: false,
    });

    const successMsg =
      language === 'ml'
        ? `"${pendingReminder.title}" ഓർമ്മപ്പെടുത്തൽ വിജയകരമായി സൂക്ഷിച്ചു!`
        : `Reminder for "${pendingReminder.title}" saved successfully!`;

    setSuccessNotice(successMsg);
    setPendingReminder(null);
    setInputText('');
    setTranscribedWithSarvam(false);
    resetRecorder();

    if (settings.autoSpeak) {
      speak(successMsg, language);
    }

    if (onReminderSaved) {
      onReminderSaved();
    }
  };

  const handleCancelReminder = () => {
    triggerHapticFeedback(40);
    setPendingReminder(null);
    const cancelMsg =
      language === 'ml' ? 'ഓർമ്മപ്പെടുത്തൽ ഒഴിവാക്കി.' : 'Reminder discarded.';
    setSuccessNotice(cancelMsg);
    if (settings.autoSpeak) {
      speak(cancelMsg, language);
    }
  };

  const getCategoryIcon = (category?: ReminderCategory) => {
    switch (category) {
      case 'medicine':
        return <Pill className="w-6 h-6 text-rose-600" />;
      case 'doctor':
        return <Stethoscope className="w-6 h-6 text-blue-600" />;
      case 'call':
        return <Phone className="w-6 h-6 text-emerald-600" />;
      case 'water':
        return <Droplet className="w-6 h-6 text-cyan-600" />;
      default:
        return <ClipboardList className="w-6 h-6 text-amber-600" />;
    }
  };

  const getCategoryLabel = (category?: ReminderCategory) => {
    if (language === 'ml') {
      switch (category) {
        case 'medicine':
          return 'മരുന്ന്';
        case 'doctor':
          return 'ഡോക്ടർ / ആശുപത്രി';
        case 'call':
          return 'ഫോൺ കോൾ';
        case 'water':
          return 'വെള്ളം കുടിക്കുക';
        default:
          return 'ഓർമ്മപ്പെടുത്തൽ';
      }
    }
    switch (category) {
      case 'medicine':
        return 'Medicine';
      case 'doctor':
        return 'Doctor Visit';
      case 'call':
        return 'Phone Call';
      case 'water':
        return 'Hydration';
      default:
        return 'Reminder';
    }
  };

  const samplePrompts =
    language === 'ml'
      ? [
          'വൈകുന്നേരം 6 മണിക്ക് മകൾ ലക്ഷ്മിയെ വിളിക്കാൻ ഓർമ്മിപ്പിക്കുക',
          'നാളെ രാവിലെ 9 മണിക്ക് ഡോക്ടറെ കാണാൻ ഓർമ്മിപ്പിക്കുക',
          'രാത്രി 8 മണിക്ക് ബി.പി ഗുളിക കഴിക്കാൻ ഓർമ്മപ്പെടുത്തുക',
        ]
      : [
          'Remind me to call my daughter at six this evening',
          'Remind me to take my heart medicine tonight at 8',
          'Remind me about doctor appointment tomorrow at 10 AM',
        ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Title & Introduction */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
          {t('assistantTitle')}
        </h2>
        <p className="text-lg sm:text-xl text-emerald-900/80 mt-1 font-medium">{t('assistantSubtitle')}</p>
      </div>

      {/* Cloud Voice Privacy & Consent Disclosure */}
      <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
        <Cloud className="w-6 h-6 text-emerald-800 flex-shrink-0 mt-0.5" />
        <div className="text-sm sm:text-base text-emerald-950 leading-relaxed font-medium">
          <span className="font-black text-emerald-950">
            {language === 'ml' ? 'ശബ്ദ തിരിച്ചറിയൽ വിവരണം:' : 'Voice Transcription Notice:'}
          </span>{' '}
          {language === 'ml'
            ? 'നിങ്ങളുടെ ശബ്ദം സർവം AI (Sarvam AI Saaras) ക്ലൗഡ് സേവനം വഴി കൃത്യമായി മലയാളം / ഇംഗ്ലീഷ് അക്ഷരങ്ങളിലേക്ക് മാറ്റുന്നു. നിങ്ങൾ മൈക്രോഫോൺ ബട്ടൺ അമർത്തുമ്പോൾ മാത്രമേ ശബ്ദം റെക്കോർഡ് ചെയ്യുകയുള്ളൂ.'
            : 'Spoken audio is securely transcribed into text using Sarvam AI Saaras (cloud model optimized for Indian languages & English). Audio is recorded only when you tap the microphone.'}
        </div>
      </div>

      {/* Main Voice & Text Interaction Card */}
      <Card className="flex flex-col items-center gap-7 p-6 sm:p-10 bg-gradient-to-b from-white to-[#FBF9F5] border-2 border-stone-200 shadow-md">
        {/* Large Accessible Microphone Action Area */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Microphone Button */}
          <div className="relative">
            {isRecording && (
              <span className="absolute -inset-3 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
            )}
            <button
              onClick={handleMicClick}
              disabled={isTranscribing}
              className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-xl focus:outline-none focus:ring-8 focus:ring-emerald-700/30 cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-8 ring-rose-200 scale-105'
                  : isTranscribing
                  ? 'bg-amber-600 text-white cursor-wait'
                  : 'bg-emerald-800 hover:bg-emerald-900 text-white hover:scale-105 active:scale-95 border-4 border-emerald-900/40'
              }`}
              aria-label={isRecording ? t('assistantMicStop') : t('assistantMicStart')}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-14 h-14 sm:w-16 sm:h-16" strokeWidth={2.5} />
                  <span className="text-xs font-black uppercase mt-1 tracking-wider">Stop</span>
                </>
              ) : isTranscribing ? (
                <>
                  <Radio className="w-14 h-14 sm:w-16 sm:h-16 animate-spin" strokeWidth={2.5} />
                  <span className="text-xs font-black uppercase mt-1 tracking-wider">Transcribing</span>
                </>
              ) : (
                <>
                  <Mic className="w-14 h-14 sm:w-16 sm:h-16" strokeWidth={2.5} />
                  <span className="text-xs font-black uppercase mt-1 tracking-wider">Speak</span>
                </>
              )}
            </button>
          </div>

          {/* Recording Timer & Status Label */}
          <div className="text-center">
            {isRecording ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-rose-600 font-black text-2xl animate-pulse">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-600" />
                  <span>
                    00:{recordingDuration < 10 ? `0${recordingDuration}` : recordingDuration} / 00:30
                  </span>
                </div>
                <p className="text-lg font-bold text-rose-700">
                  {language === 'ml' ? 'ശ്രദ്ധയോടെ കേൾക്കുന്നു... (Sarvam AI)' : 'Listening... Tap Stop when done'}
                </p>
                <button
                  onClick={cancelRecording}
                  className="mt-2 text-sm text-stone-500 hover:text-rose-700 underline font-semibold cursor-pointer"
                >
                  {language === 'ml' ? 'റദ്ദാക്കുക' : 'Cancel recording'}
                </button>
              </div>
            ) : isTranscribing ? (
              <p className="text-xl font-black text-amber-800 animate-pulse">
                {language === 'ml'
                  ? 'സർവം AI ശബ്ദം മാറ്റിക്കൊണ്ടിരിക്കുന്നു...'
                  : 'Transcribing speech with Sarvam AI...'}
              </p>
            ) : (
              <p className="text-2xl font-black text-emerald-950 tracking-tight">
                {t('assistantMicStart')}
              </p>
            )}
          </div>
        </div>

        {/* Audio Recorder Error Banner */}
        {recorderError && (
          <div
            role="alert"
            className="w-full bg-rose-50 border-2 border-rose-400 rounded-3xl p-5 flex items-start gap-4 shadow-sm"
          >
            <AlertTriangle className="w-7 h-7 text-rose-700 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-lg text-rose-950">
                {language === 'ml' ? 'ശബ്ദ റെക്കോർഡിംഗ് അറിയിപ്പ്' : 'Voice Recording Notice'}
              </h4>
              <p className="text-base text-rose-900 mt-0.5 font-medium">{recorderError}</p>
              {recorderSuggestion && (
                <p className="text-sm text-rose-800 mt-1 font-semibold">{recorderSuggestion}</p>
              )}
            </div>
          </div>
        )}

        {/* Transcribed Badge if populated via Sarvam */}
        {transcribedWithSarvam && inputText && (
          <div className="w-full bg-emerald-50 border-2 border-emerald-400 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-emerald-900 text-sm sm:text-base font-bold">
            <CheckCircle className="w-5 h-5 text-emerald-700 flex-shrink-0" />
            <span>
              {language === 'ml'
                ? 'സർവം AI വഴി ശബ്ദം മാറ്റി നൽകി. അയയ്ക്കുന്നതിന് മുൻപ് മാറ്റങ്ങൾ വരുത്താം:'
                : 'Transcribed by Sarvam AI. Review or edit below before sending:'}
            </span>
          </div>
        )}

        {/* Editable Transcript Textarea */}
        <div className="w-full flex flex-col gap-3">
          <label htmlFor="assistant-input" className="text-lg sm:text-xl font-black text-emerald-950 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-800" />
            <span>
              {language === 'ml' ? 'നിങ്ങളുടെ ചോദ്യം അല്ലെങ്കിൽ ഓർമ്മപ്പെടുത്തൽ:' : 'Your request:'}
            </span>
          </label>
          <div className="relative">
            <textarea
              id="assistant-input"
              rows={3}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setTranscribedWithSarvam(false);
              }}
              placeholder={t('assistantPlaceholder')}
              className="w-full p-4 sm:p-5 text-xl rounded-2xl border-2 border-stone-300 focus:border-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 bg-white text-emerald-950 placeholder:text-stone-400 resize-none font-medium leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-base text-emerald-900/80 font-medium">
              {language === 'ml'
                ? 'എഴുതി നൽകുകയോ മാറ്റങ്ങൾ വരുത്തുകയോ ചെയ്യാം'
                : 'You can type or edit your words freely'}
            </span>
            <Button
              size="lg"
              onClick={() => handleAskKoode()}
              disabled={!inputText.trim() || isProcessing}
              loading={isProcessing}
              icon={<Send className="w-5 h-5" />}
              className="text-lg font-black"
            >
              {isProcessing ? t('assistantProcessing') : t('assistantSend')}
            </Button>
          </div>
        </div>

        {/* Quick Tap Suggested Prompts */}
        <div className="w-full pt-5 border-t-2 border-stone-200">
          <p className="text-base font-black text-emerald-950 mb-3">
            {language === 'ml' ? 'ഉദാഹരണങ്ങൾ (തൊടുക):' : 'Try saying (Tap to ask):'}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  triggerHapticFeedback(30);
                  setInputText(p);
                  handleAskKoode(p);
                }}
                className="text-left text-base sm:text-lg bg-white hover:bg-emerald-50 border-2 border-stone-300 hover:border-emerald-700 px-4 py-2.5 rounded-2xl text-emerald-950 font-bold transition-all min-h-[50px] shadow-xs cursor-pointer active:scale-98"
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Error Notice */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-6 flex items-start gap-4 shadow-sm"
        >
          <AlertTriangle className="w-7 h-7 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-black text-xl text-amber-950">
              {language === 'ml' ? 'AI സഹായം ലഭ്യമല്ല' : 'AI Service Notice'}
            </h4>
            <p className="text-lg text-amber-900 mt-1 font-medium">{errorMessage}</p>
            {errorSuggestion && (
              <p className="text-sm text-amber-800 mt-1 font-bold">{errorSuggestion}</p>
            )}
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successNotice && (
        <div
          role="status"
          className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 flex items-center gap-4 text-emerald-950 font-black text-xl animate-fadeIn shadow-sm"
        >
          <CheckCircle className="w-8 h-8 text-emerald-700 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Structured Confirmation Card for Reminders */}
      {pendingReminder && (
        <Card highlight className="bg-emerald-50/70 border-2 border-emerald-600 flex flex-col gap-6 animate-slideDown shadow-lg">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-emerald-800 flex-shrink-0" />
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">
              {t('assistantConfirmReminderTitle')}
            </h3>
          </div>

          <div className="bg-white rounded-3xl p-6 border-2 border-emerald-200 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200">
                {getCategoryIcon(pendingReminder.category)}
              </div>
              <div>
                <span className="text-xs font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {getCategoryLabel(pendingReminder.category)}
                </span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-0.5">
                  {pendingReminder.title}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xl font-bold text-emerald-950 mt-1">
              {pendingReminder.date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-emerald-700" />
                  <span>{formatFriendlyDate(pendingReminder.date, language)}</span>
                </div>
              )}
              {pendingReminder.time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-6 h-6 text-emerald-700" />
                  <span className="font-mono">{formatFriendlyTime(pendingReminder.time, language)}</span>
                </div>
              )}
            </div>

            {pendingReminder.description && (
              <p className="text-lg text-stone-600 font-medium mt-1">{pendingReminder.description}</p>
            )}

            {/* Elder Medical Reassurance Note */}
            {pendingReminder.category === 'medicine' && (
              <p className="text-xs text-stone-500 font-medium border-t border-stone-100 pt-2">
                {language === 'ml'
                  ? '* ഡോക്ടറുടെ കുറിപ്പടി പ്രകാരം മാത്രം മരുന്ന് കഴിക്കുക.'
                  : '* Please always follow the official prescription and dosage prescribed by your doctor.'}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button
              size="xl"
              variant="primary"
              onClick={handleConfirmSaveReminder}
              className="w-full sm:w-auto flex-1 font-black text-xl"
              icon={<CheckCircle className="w-6 h-6" />}
            >
              {t('assistantConfirmAction')}
            </Button>
            <Button
              size="xl"
              variant="secondary"
              onClick={handleCancelReminder}
              className="w-full sm:w-auto font-black text-xl"
              icon={<XCircle className="w-6 h-6" />}
            >
              {t('assistantCancelAction')}
            </Button>
          </div>
        </Card>
      )}

      {/* Spoken Response Card if conversational */}
      {lastResponse && !pendingReminder && (
        <Card className="bg-white border-2 border-stone-200 p-6 sm:p-8 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-black text-xl">
            <Sparkles className="w-6 h-6" />
            <span>Koode AI</span>
          </div>
          <p className="text-2xl text-emerald-950 font-bold leading-relaxed">
            {lastResponse.spoken_response}
          </p>
          {lastResponse.clarification_prompt && (
            <p className="text-xl text-amber-900 font-black bg-amber-50 p-4 rounded-2xl border border-amber-300">
              {lastResponse.clarification_prompt}
            </p>
          )}
        </Card>
      )}

      {/* Handoff: offer (never auto-send) a community help request */}
      {onRequestHelp && lastResponse && !pendingReminder && lastResponse.intent !== 'create_reminder' && HELP_HINT.test(inputText) && (
        <div className="rounded-3xl bg-brand-sage border-2 border-brand-forest p-5 flex flex-col gap-3">
          <p className="text-xl font-bold text-brand-forest">{tx('handoffQ')}</p>
          <button
            type="button"
            onClick={() => onRequestHelp(inputText.trim())}
            className="min-h-[56px] rounded-2xl bg-brand-coral hover:bg-brand-coralDark text-white text-lg font-bold px-6 cursor-pointer"
          >
            {tx('handoffBtn')}
          </button>
        </div>
      )}
    </div>
  );
};
