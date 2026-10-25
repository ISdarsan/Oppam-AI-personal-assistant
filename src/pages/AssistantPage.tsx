import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
  Volume2,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api, ApiError } from '../services/api';
import { storage } from '../services/storage';
import { AssistantResponse, ReminderIntentData } from '../types';
import { formatFriendlyDate, formatFriendlyTime, getTodayDateString } from '../utils/dateUtils';
import { triggerHapticFeedback } from '../utils/communication';

interface AssistantPageProps {
  onReminderSaved?: () => void;
}

export const AssistantPage: React.FC<AssistantPageProps> = ({ onReminderSaved }) => {
  const { language, settings, t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<AssistantResponse | null>(null);
  const [pendingReminder, setPendingReminder] = useState<ReminderIntentData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const {
    isListening,
    transcript,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition(language);

  const { speak, isSupported: isTtsSupported } = useSpeechSynthesis(settings.speechRate);

  // Sync transcription to input field
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  const handleMicToggle = () => {
    triggerHapticFeedback(50);
    if (isListening) {
      stopListening();
    } else {
      setErrorMessage(null);
      setSuccessNotice(null);
      setPendingReminder(null);
      startListening();
    }
  };

  const handleAskKoode = async (textToSubmit?: string) => {
    const query = (textToSubmit || inputText).trim();
    if (!query) return;

    if (isListening) {
      stopListening();
    }

    setIsProcessing(true);
    setErrorMessage(null);
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
      console.error('Assistant error:', err);
      if (err instanceof ApiError) {
        setErrorMessage(`${err.message} ${err.suggestion ? `(${err.suggestion})` : ''}`);
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

    storage.saveReminder({
      title: pendingReminder.title,
      date: reminderDate,
      time: reminderTime,
      description: pendingReminder.description || undefined,
      category: 'general',
      completed: false,
    });

    const successMsg =
      language === 'ml'
        ? `"${pendingReminder.title}" ഓർമ്മപ്പെടുത്തൽ വിജയകരമായി സൂക്ഷിച്ചു!`
        : `Reminder for "${pendingReminder.title}" saved successfully!`;

    setSuccessNotice(successMsg);
    setPendingReminder(null);
    setInputText('');
    resetTranscript();

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

      {/* Main Voice & Text Interaction Card */}
      <Card className="flex flex-col items-center gap-7 p-6 sm:p-10 bg-gradient-to-b from-white to-[#FBF9F5] border-2 border-stone-200">
        {/* Large Glowing Microphone Button for Elderly Accessibility */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleMicToggle}
            className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl focus:outline-none focus:ring-8 focus:ring-emerald-700/30 cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-200 scale-105'
                : 'bg-emerald-800 hover:bg-emerald-900 text-white hover:scale-105 active:scale-95 border-4 border-emerald-900/40'
            }`}
            aria-label={isListening ? t('assistantMicStop') : t('assistantMicStart')}
          >
            {isListening ? (
              <MicOff className="w-16 h-16 sm:w-18 sm:h-18" strokeWidth={2.5} />
            ) : (
              <Mic className="w-16 h-16 sm:w-18 sm:h-18" strokeWidth={2.5} />
            )}
          </button>

          <p className="text-2xl font-black text-emerald-950 text-center tracking-tight">
            {isListening ? (
              <span className="text-rose-600 animate-pulse">{t('assistantListening')}</span>
            ) : (
              t('assistantMicStart')
            )}
          </p>

          {!isSpeechSupported && (
            <p className="text-base text-stone-600 text-center max-w-md font-medium">
              {t('assistantVoiceNotSupported')}
            </p>
          )}
        </div>

        {/* Text Input & Review Box */}
        <div className="w-full flex flex-col gap-3">
          <label htmlFor="assistant-input" className="text-lg sm:text-xl font-black text-emerald-950">
            {language === 'ml' ? 'നിങ്ങളുടെ ചോദ്യം അല്ലെങ്കിൽ ഓർമ്മപ്പെടുത്തൽ:' : 'Your request:'}
          </label>
          <div className="relative">
            <textarea
              id="assistant-input"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('assistantPlaceholder')}
              className="w-full p-4 sm:p-5 text-xl rounded-2xl border-2 border-stone-300 focus:border-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 bg-white text-emerald-950 placeholder:text-stone-400 resize-none font-medium leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-base text-emerald-900/80 font-medium">
              {language === 'ml'
                ? 'സംസാരിച്ചതിന് ശേഷം മാറ്റങ്ങൾ വരുത്താം'
                : 'You can edit the text before sending'}
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

          <div className="bg-white rounded-3xl p-6 border-2 border-emerald-200 flex flex-col gap-3 shadow-xs">
            <p className="text-2xl sm:text-3xl font-black text-emerald-900">
              {pendingReminder.title}
            </p>
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

      {/* Response Card with Large Spoken Reply & Text-to-Speech button */}
      {lastResponse && !pendingReminder && (
        <Card className="flex flex-col gap-5 bg-white border-2 border-stone-300 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-black text-xl">
              <Sparkles className="w-6 h-6" />
              <span>
                {language === 'ml' ? 'കൂടെയുടെ മറുപടി:' : 'Koode says:'}
              </span>
            </div>
            {isTtsSupported && (
              <button
                onClick={() => {
                  triggerHapticFeedback(30);
                  speak(lastResponse.spoken_response, language);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 min-h-[48px] font-black text-base cursor-pointer active:scale-95"
                aria-label="Read response aloud"
              >
                <Volume2 className="w-5 h-5 text-emerald-800" strokeWidth={2.5} />
                <span>{language === 'ml' ? 'കേൾക്കുക' : 'Listen Aloud'}</span>
              </button>
            )}
          </div>

          <p className="text-2xl sm:text-3xl text-emerald-950 font-bold leading-relaxed">
            {lastResponse.spoken_response}
          </p>

          {lastResponse.clarification_prompt && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-3.5">
              <HelpCircle className="w-7 h-7 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-950 text-lg">
                  {t('assistantClarificationNeeded')}
                </p>
                <p className="text-amber-900 text-xl font-semibold mt-1">
                  {lastResponse.clarification_prompt}
                </p>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-stone-200 text-sm text-stone-500 font-medium flex items-center justify-between">
            <span>Powered by open-weight model: {lastResponse.model_used}</span>
          </div>
        </Card>
      )}
    </div>
  );
};
