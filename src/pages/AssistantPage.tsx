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

  const handleAskSahaaya = async (textToSubmit?: string) => {
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

      // Auto read response aloud if enabled
      if (settings.autoSpeak && response.spoken_response) {
        speak(response.spoken_response, language);
      }

      // Check if structured reminder requires confirmation
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

    const reminderDate = pendingReminder.date || getTodayDateString();
    const reminderTime = pendingReminder.time || '18:00';

    storage.saveReminder({
      title: pendingReminder.title,
      date: reminderDate,
      time: reminderTime,
      description: pendingReminder.description || undefined,
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
    <div className="flex flex-col gap-6">
      {/* Title & Introduction */}
      <div>
        <h2 className="text-3xl font-black text-sahaaya-text tracking-tight">
          {t('assistantTitle')}
        </h2>
        <p className="text-lg text-sahaaya-muted mt-1">{t('assistantSubtitle')}</p>
      </div>

      {/* Main Voice & Text Interaction Card */}
      <Card className="flex flex-col items-center gap-6 p-6 sm:p-8 bg-gradient-to-b from-white to-sahaaya-bg">
        {/* Large Microphone Button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleMicToggle}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-200 shadow-md focus:outline-none focus:ring-4 focus:ring-sahaaya-primary/40 ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-200 scale-105'
                : 'bg-sahaaya-primary hover:bg-sahaaya-primaryHover text-white hover:scale-105 active:scale-95'
            }`}
            aria-label={isListening ? t('assistantMicStop') : t('assistantMicStart')}
          >
            {isListening ? (
              <MicOff className="w-14 h-14 sm:w-16 sm:h-16" />
            ) : (
              <Mic className="w-14 h-14 sm:w-16 sm:h-16" />
            )}
          </button>

          <p className="text-xl font-bold text-sahaaya-text">
            {isListening ? (
              <span className="text-rose-600 animate-pulse">{t('assistantListening')}</span>
            ) : (
              t('assistantMicStart')
            )}
          </p>

          {!isSpeechSupported && (
            <p className="text-sm text-sahaaya-muted text-center max-w-sm">
              {t('assistantVoiceNotSupported')}
            </p>
          )}
        </div>

        {/* Text Input & Review Box */}
        <div className="w-full flex flex-col gap-3">
          <label htmlFor="assistant-input" className="text-base font-bold text-sahaaya-text">
            {language === 'ml' ? 'നിങ്ങളുടെ ചോദ്യം അല്ലെങ്കിൽ ഓർമ്മപ്പെടുത്തൽ:' : 'Your request:'}
          </label>
          <div className="relative">
            <textarea
              id="assistant-input"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('assistantPlaceholder')}
              className="w-full p-4 text-lg sm:text-xl rounded-2xl border-2 border-sahaaya-border focus:border-sahaaya-primary focus:outline-none focus:ring-4 focus:ring-sahaaya-primary/20 bg-white text-sahaaya-text resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-sahaaya-muted">
              {language === 'ml'
                ? 'സംസാരിച്ചതിന് ശേഷം മാറ്റങ്ങൾ വരുത്താം'
                : 'You can edit the text before sending'}
            </span>
            <Button
              size="lg"
              onClick={() => handleAskSahaaya()}
              disabled={!inputText.trim() || isProcessing}
              loading={isProcessing}
              icon={<Send className="w-5 h-5" />}
            >
              {isProcessing ? t('assistantProcessing') : t('assistantSend')}
            </Button>
          </div>
        </div>

        {/* Suggested Quick Prompts */}
        <div className="w-full pt-4 border-t border-sahaaya-border">
          <p className="text-sm font-bold text-sahaaya-muted mb-2">
            {language === 'ml' ? 'ഉദാഹരണങ്ങൾ (തൊടുക):' : 'Try saying (Tap to ask):'}
          </p>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(p);
                  handleAskSahaaya(p);
                }}
                className="text-left text-sm sm:text-base bg-white hover:bg-sahaaya-cream border border-sahaaya-border hover:border-sahaaya-primary px-3.5 py-2 rounded-xl text-sahaaya-text font-medium transition-colors min-h-[44px]"
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-4"
        >
          <AlertTriangle className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-lg text-amber-950">
              {language === 'ml' ? 'AI സഹായം ലഭ്യമല്ല' : 'AI Service Notice'}
            </h4>
            <p className="text-base text-amber-900 mt-1">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successNotice && (
        <div
          role="status"
          className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex items-center gap-4 text-emerald-950 font-bold text-lg animate-fadeIn"
        >
          <CheckCircle className="w-7 h-7 text-emerald-700 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Structured Confirmation Card for Reminders */}
      {pendingReminder && (
        <Card highlight className="bg-emerald-50/60 border-2 border-sahaaya-primary flex flex-col gap-5 animate-slideDown">
          <div className="flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-sahaaya-primary flex-shrink-0" />
            <h3 className="text-2xl font-black text-sahaaya-text">
              {t('assistantConfirmReminderTitle')}
            </h3>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-emerald-200 flex flex-col gap-3">
            <p className="text-2xl font-black text-sahaaya-primary">
              {pendingReminder.title}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-lg font-bold text-sahaaya-text">
              {pendingReminder.date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sahaaya-muted" />
                  <span>{formatFriendlyDate(pendingReminder.date, language)}</span>
                </div>
              )}
              {pendingReminder.time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sahaaya-muted" />
                  <span>{formatFriendlyTime(pendingReminder.time, language)}</span>
                </div>
              )}
            </div>
            {pendingReminder.description && (
              <p className="text-base text-sahaaya-muted">{pendingReminder.description}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              size="lg"
              variant="primary"
              onClick={handleConfirmSaveReminder}
              className="w-full sm:w-auto flex-1 font-bold"
              icon={<CheckCircle className="w-5 h-5" />}
            >
              {t('assistantConfirmAction')}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={handleCancelReminder}
              className="w-full sm:w-auto font-bold"
              icon={<XCircle className="w-5 h-5" />}
            >
              {t('assistantCancelAction')}
            </Button>
          </div>
        </Card>
      )}

      {/* Response Card (spoken reply & clarification prompt) */}
      {lastResponse && !pendingReminder && (
        <Card className="flex flex-col gap-4 bg-white border-2 border-sahaaya-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sahaaya-primary font-bold text-lg">
              <Sparkles className="w-5 h-5" />
              <span>
                {language === 'ml' ? 'കൂടെയുടെ മറുപടി:' : 'Koode says:'}
              </span>
            </div>
            {isTtsSupported && (
              <button
                onClick={() => speak(lastResponse.spoken_response, language)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sahaaya-border text-sahaaya-primary hover:bg-sahaaya-cream min-h-[44px] font-semibold text-sm"
                aria-label="Read response aloud"
              >
                <Volume2 className="w-5 h-5" />
                <span>{language === 'ml' ? 'കേൾക്കുക' : 'Listen'}</span>
              </button>
            )}
          </div>

          <p className="text-xl sm:text-2xl text-sahaaya-text font-medium leading-relaxed">
            {lastResponse.spoken_response}
          </p>

          {lastResponse.clarification_prompt && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <HelpCircle className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950 text-base">
                  {t('assistantClarificationNeeded')}
                </p>
                <p className="text-amber-900 text-lg mt-0.5">
                  {lastResponse.clarification_prompt}
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-sahaaya-border text-xs text-sahaaya-muted flex items-center justify-between">
            <span>Powered by open-weight model: {lastResponse.model_used}</span>
          </div>
        </Card>
      )}
    </div>
  );
};
