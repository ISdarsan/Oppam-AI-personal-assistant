import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Volume2,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api, ApiError } from '../services/api';
import { ExplainResponse } from '../types';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

export const ExplainerPage: React.FC = () => {
  const { language, settings, t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const { speak, isSupported: isTtsSupported } = useSpeechSynthesis(settings.speechRate);

  const handleExplain = async (textToExplain?: string) => {
    const text = (textToExplain || inputText).trim();
    if (!text) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const data = await api.explainMessage(text, language);
      setResult(data);

      if (settings.autoSpeak && data.simple_summary) {
        speak(data.simple_summary, language);
      }
    } catch (err) {
      console.error('Explainer error:', err);
      if (err instanceof ApiError) {
        setErrorMessage(`${err.message} ${err.suggestion ? `(${err.suggestion})` : ''}`);
      } else {
        setErrorMessage(t('errorGeneric'));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sampleMessages =
    language === 'ml'
      ? [
          {
            title: 'ആശുപത്രി സന്ദേശം',
            text: 'നിങ്ങളുടെ ലാബ് പരിശോധനാ ഫലം ഡോ. സുരേഷ് പരിശോധിച്ചു. ഒക്ടോബർ 28 രാവിലെ 10 മണിക്ക് ആശുപത്രിയിൽ നേരിട്ടെത്തി റിപ്പോർട്ട് കാണിക്കുക. ഒഴിഞ്ഞ വയറ്റിൽ വരേണ്ടതില്ല.',
          },
          {
            title: 'ബാങ്ക് തട്ടിപ്പ് SMS (മുന്നറിയിപ്പ് ഉദാഹരണം)',
            text: 'അടിയന്തിരം: നിങ്ങളുടെ എസ്.ബി.ഐ അക്കൗണ്ട് താൽക്കാലികമായി ബ്ലോക്ക് ചെയ്തിരിക്കുന്നു! അൺബ്ലോക്ക് ചെയ്യാൻ ഉടൻ തന്നെ 9847123456 എന്ന നമ്പറിലേക്ക് നിങ്ങളുടെ OTP അയക്കുക അല്ലെങ്കിൽ താഴെയുള്ള ലിങ്കിൽ ക്ലിക്ക് ചെയ്യുക.',
          },
        ]
      : [
          {
            title: 'Clinic Appointment SMS',
            text: 'Reminder: Your appointment with Dr. Roy at City Healthcare is confirmed for tomorrow Oct 26 at 11:30 AM. Please carry your previous prescription and arrive 15 minutes early.',
          },
          {
            title: 'Suspicious Bank SMS (Scam Test)',
            text: 'URGENT: Your State Bank account is suspended today due to KYC failure. Update your PAN and send the 6-digit OTP to 9876543210 immediately to prevent permanent deactivation.',
          },
        ];

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-black text-sahaaya-text tracking-tight">
          {t('explainerTitle')}
        </h2>
        <p className="text-lg text-sahaaya-muted mt-1">{t('explainerSubtitle')}</p>
      </div>

      {/* Input Card */}
      <Card className="flex flex-col gap-5 p-6 sm:p-8 bg-white">
        <div className="flex flex-col gap-2">
          <label htmlFor="message-input" className="text-lg font-bold text-sahaaya-text">
            {language === 'ml' ? 'സന്ദേശം ഇവിടെ ചേർക്കുക:' : 'Paste message text:'}
          </label>
          <textarea
            id="message-input"
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('explainerPlaceholder')}
            className="w-full p-4 text-lg rounded-2xl border-2 border-sahaaya-border focus:border-sahaaya-primary focus:outline-none focus:ring-4 focus:ring-sahaaya-primary/20 bg-white text-sahaaya-text resize-y min-h-[140px]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              setInputText('');
              setResult(null);
              setErrorMessage(null);
            }}
            className="text-base text-sahaaya-muted hover:text-sahaaya-text underline min-h-[44px]"
          >
            {language === 'ml' ? 'എല്ലാം മായ്ക്കുക' : 'Clear text'}
          </button>

          <Button
            size="xl"
            onClick={() => handleExplain()}
            disabled={!inputText.trim() || isAnalyzing}
            loading={isAnalyzing}
            icon={<Sparkles className="w-6 h-6" />}
            className="font-bold shadow-md"
          >
            {isAnalyzing ? t('explainerAnalyzing') : t('explainerButton')}
          </Button>
        </div>

        {/* Quick Sample Messages */}
        <div className="pt-4 border-t border-sahaaya-border">
          <p className="text-sm font-bold text-sahaaya-muted mb-2">
            {language === 'ml' ? 'ഉദാഹരണങ്ങൾ പരീക്ഷിക്കാം (തൊടുക):' : 'Try sample messages (Tap to load):'}
          </p>
          <div className="flex flex-wrap gap-2">
            {sampleMessages.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(sample.text);
                  handleExplain(sample.text);
                }}
                className="text-left text-sm bg-sahaaya-cream/70 hover:bg-sahaaya-cream border border-sahaaya-border hover:border-sahaaya-primary px-3 py-2 rounded-xl text-sahaaya-text font-medium min-h-[44px]"
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-4 text-amber-950"
        >
          <AlertTriangle className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-lg">
              {language === 'ml' ? 'ശ്രദ്ധിക്കുക' : 'Notice'}
            </h4>
            <p className="text-base mt-1">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Explanation Result Card */}
      {result && (
        <div className="flex flex-col gap-5 animate-slideDown">
          {/* Suspicious Warning Alert if flagged */}
          {result.is_suspicious && (
            <div
              role="alert"
              className="bg-rose-50 border-2 border-sahaaya-alert rounded-3xl p-6 flex items-start gap-4 shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-sahaaya-alert flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-rose-950">
                  {language === 'ml' ? 'സുരക്ഷാ മുന്നറിയിപ്പ്!' : 'Security Warning!'}
                </h3>
                <p className="text-lg text-rose-900 mt-1 font-semibold">
                  {t('explainerSuspiciousAlert')}
                </p>
              </div>
            </div>
          )}

          <Card className="flex flex-col gap-6 p-6 sm:p-8 bg-white border-2 border-sahaaya-border">
            {/* 1. In Simple Words */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-sahaaya-primary flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-sahaaya-accent" />
                  <span>{t('explainerSummaryTitle')}</span>
                </h3>
                {isTtsSupported && (
                  <button
                    onClick={() => speak(result.simple_summary, language)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sahaaya-border text-sahaaya-primary hover:bg-sahaaya-cream min-h-[44px] font-semibold text-sm"
                    aria-label="Read summary aloud"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span>{language === 'ml' ? 'കേൾക്കുക' : 'Listen'}</span>
                  </button>
                )}
              </div>
              <p className="text-xl sm:text-2xl text-sahaaya-text font-medium leading-relaxed bg-sahaaya-cream/40 p-5 rounded-2xl border border-sahaaya-border">
                {result.simple_summary}
              </p>
            </div>

            {/* 2. Key Details */}
            {result.key_details.length > 0 && (
              <div className="flex flex-col gap-3 pt-4 border-t border-sahaaya-border">
                <h4 className="text-xl font-bold text-sahaaya-text">
                  {t('explainerDetailsTitle')}
                </h4>
                <ul className="space-y-2">
                  {result.key_details.map((detail, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-lg text-sahaaya-text font-medium"
                    >
                      <CheckCircle className="w-5 h-5 text-sahaaya-primary flex-shrink-0 mt-1" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3. What You May Need To Do */}
            {result.action_items.length > 0 && (
              <div className="flex flex-col gap-3 pt-4 border-t border-sahaaya-border">
                <h4 className="text-xl font-bold text-sahaaya-text">
                  {t('explainerActionsTitle')}
                </h4>
                <ul className="space-y-2">
                  {result.action_items.map((action, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-lg text-sahaaya-text font-medium"
                    >
                      <span className="w-6 h-6 rounded-full bg-sahaaya-cream text-sahaaya-primary font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 4. Things to Check & Safety Warnings */}
            {result.warnings_and_checks.length > 0 && (
              <div className="flex flex-col gap-3 pt-4 border-t border-sahaaya-border bg-amber-50/50 p-5 rounded-2xl border border-amber-200">
                <h4 className="text-xl font-bold text-amber-950 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                  <span>{t('explainerWarningsTitle')}</span>
                </h4>
                <ul className="space-y-2">
                  {result.warnings_and_checks.map((warning, idx) => (
                    <li
                      key={idx}
                      className="text-lg text-amber-900 font-semibold"
                    >
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Original Text Toggle */}
            <div className="pt-4 border-t border-sahaaya-border">
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-sahaaya-cream text-sahaaya-muted hover:text-sahaaya-text font-semibold text-base min-h-[48px]"
              >
                <span>{t('explainerOriginalText')}</span>
                {showOriginal ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {showOriginal && (
                <div className="mt-2 p-4 bg-gray-50 rounded-xl border border-gray-200 text-base font-mono whitespace-pre-wrap text-gray-700">
                  {inputText}
                </div>
              )}
            </div>

            {/* Medical / Verification Disclaimer */}
            <div className="pt-2 text-xs sm:text-sm text-sahaaya-muted italic border-t border-sahaaya-border/50">
              {t('explainerDisclaimer')}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
