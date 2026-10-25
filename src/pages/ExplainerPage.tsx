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
import { triggerHapticFeedback } from '../utils/communication';

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

    triggerHapticFeedback(50);
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
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Title */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
          {t('explainerTitle')}
        </h2>
        <p className="text-lg sm:text-xl text-emerald-900/80 mt-1 font-medium">{t('explainerSubtitle')}</p>
      </div>

      {/* Input Card */}
      <Card className="flex flex-col gap-6 p-6 sm:p-8 bg-white border-2 border-stone-200">
        <div className="flex flex-col gap-2.5">
          <label htmlFor="message-input" className="text-xl font-black text-emerald-950">
            {language === 'ml' ? 'സന്ദേശം ഇവിടെ ചേർക്കുക:' : 'Paste message text:'}
          </label>
          <textarea
            id="message-input"
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('explainerPlaceholder')}
            className="w-full p-5 text-xl rounded-2xl border-2 border-stone-300 focus:border-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 bg-white text-emerald-950 placeholder:text-stone-400 resize-y min-h-[160px] font-medium leading-relaxed"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => {
              triggerHapticFeedback(30);
              setInputText('');
              setResult(null);
              setErrorMessage(null);
            }}
            className="text-lg font-bold text-stone-600 hover:text-stone-900 underline min-h-[48px] cursor-pointer"
          >
            {language === 'ml' ? 'എല്ലാം മായ്ക്കുക' : 'Clear text'}
          </button>

          <Button
            size="xl"
            onClick={() => handleExplain()}
            disabled={!inputText.trim() || isAnalyzing}
            loading={isAnalyzing}
            icon={<Sparkles className="w-6 h-6" />}
            className="font-black text-xl shadow-md"
          >
            {isAnalyzing ? t('explainerAnalyzing') : t('explainerButton')}
          </Button>
        </div>

        {/* Quick Sample Messages */}
        <div className="pt-5 border-t-2 border-stone-200">
          <p className="text-base font-black text-emerald-950 mb-3">
            {language === 'ml' ? 'ഉദാഹരണങ്ങൾ പരീക്ഷിക്കാം (തൊടുക):' : 'Try sample messages (Tap to load):'}
          </p>
          <div className="flex flex-wrap gap-3">
            {sampleMessages.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  triggerHapticFeedback(30);
                  setInputText(sample.text);
                  handleExplain(sample.text);
                }}
                className="text-left text-base sm:text-lg bg-stone-50 hover:bg-emerald-50 border-2 border-stone-300 hover:border-emerald-700 px-4 py-2.5 rounded-2xl text-emerald-950 font-bold min-h-[50px] transition-all shadow-xs cursor-pointer active:scale-98"
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
          className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-6 flex items-start gap-4 text-amber-950 shadow-sm"
        >
          <AlertTriangle className="w-7 h-7 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-black text-xl">
              {language === 'ml' ? 'ശ്രദ്ധിക്കുക' : 'Notice'}
            </h4>
            <p className="text-lg mt-1 font-medium">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Explanation Result Card */}
      {result && (
        <div className="flex flex-col gap-6 animate-slideDown">
          {/* Suspicious Warning Alert if flagged */}
          {result.is_suspicious && (
            <div
              role="alert"
              className="bg-rose-50 border-2 border-rose-500 rounded-3xl p-6 sm:p-7 flex items-start gap-4 shadow-md"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 border-2 border-rose-300">
                <ShieldAlert className="w-9 h-9" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-rose-950">
                  {language === 'ml' ? 'സുരക്ഷാ മുന്നറിയിപ്പ്!' : 'Security Warning!'}
                </h3>
                <p className="text-lg sm:text-xl text-rose-900 mt-1.5 font-bold leading-relaxed">
                  {t('explainerSuspiciousAlert')}
                </p>
              </div>
            </div>
          )}

          <Card className="flex flex-col gap-7 p-6 sm:p-9 bg-white border-2 border-stone-300 shadow-md">
            {/* 1. In Simple Words */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-900 flex items-center gap-2.5">
                  <Sparkles className="w-7 h-7 text-emerald-700" />
                  <span>{t('explainerSummaryTitle')}</span>
                </h3>
                {isTtsSupported && (
                  <button
                    onClick={() => {
                      triggerHapticFeedback(30);
                      speak(result.simple_summary, language);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl border-2 border-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 min-h-[48px] font-black text-base cursor-pointer active:scale-95"
                    aria-label="Read summary aloud"
                  >
                    <Volume2 className="w-5 h-5 text-emerald-800" strokeWidth={2.5} />
                    <span>{language === 'ml' ? 'കേൾക്കുക' : 'Listen'}</span>
                  </button>
                )}
              </div>
              <p className="text-2xl sm:text-3xl text-emerald-950 font-bold leading-relaxed bg-emerald-50/70 p-6 rounded-3xl border-2 border-emerald-200">
                {result.simple_summary}
              </p>
            </div>

            {/* 2. Key Details */}
            {result.key_details.length > 0 && (
              <div className="flex flex-col gap-3.5 pt-5 border-t-2 border-stone-200">
                <h4 className="text-2xl font-black text-emerald-950">
                  {t('explainerDetailsTitle')}
                </h4>
                <ul className="space-y-3">
                  {result.key_details.map((detail, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3.5 text-xl text-emerald-950 font-bold"
                    >
                      <CheckCircle className="w-6 h-6 text-emerald-700 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3. What You May Need To Do */}
            {result.action_items.length > 0 && (
              <div className="flex flex-col gap-3.5 pt-5 border-t-2 border-stone-200">
                <h4 className="text-2xl font-black text-emerald-950">
                  {t('explainerActionsTitle')}
                </h4>
                <ul className="space-y-3">
                  {result.action_items.map((action, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3.5 text-xl text-emerald-950 font-bold"
                    >
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 border-2 border-emerald-300 font-black text-base flex items-center justify-center flex-shrink-0 mt-0.5">
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
              <div className="flex flex-col gap-3.5 pt-5 border-t-2 border-stone-200 bg-amber-50/80 p-6 rounded-3xl border-2 border-amber-300">
                <h4 className="text-2xl font-black text-amber-950 flex items-center gap-2.5">
                  <AlertTriangle className="w-7 h-7 text-amber-700" strokeWidth={2.5} />
                  <span>{t('explainerWarningsTitle')}</span>
                </h4>
                <ul className="space-y-2.5">
                  {result.warnings_and_checks.map((warning, idx) => (
                    <li
                      key={idx}
                      className="text-xl text-amber-950 font-bold"
                    >
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Original Text Toggle */}
            <div className="pt-5 border-t-2 border-stone-200">
              <button
                onClick={() => {
                  triggerHapticFeedback(30);
                  setShowOriginal(!showOriginal);
                }}
                className="flex items-center justify-between w-full p-4 rounded-2xl hover:bg-stone-100 text-stone-700 hover:text-stone-900 font-black text-lg min-h-[52px] cursor-pointer"
              >
                <span>{t('explainerOriginalText')}</span>
                {showOriginal ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </button>
              {showOriginal && (
                <div className="mt-2 p-5 bg-stone-50 rounded-2xl border-2 border-stone-200 text-lg font-mono whitespace-pre-wrap text-stone-800 leading-relaxed">
                  {inputText}
                </div>
              )}
            </div>

            {/* Medical / Verification Disclaimer */}
            <div className="pt-3 text-base text-stone-600 italic border-t-2 border-stone-200 font-medium">
              {t('explainerDisclaimer')}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
