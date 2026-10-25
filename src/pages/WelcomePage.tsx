import React, { useState } from 'react';
import { Globe, Mic, ShieldCheck, ArrowRight, UserPlus } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { supportedLanguages } from '../i18n/translations';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/ui/Logo';
import { storage } from '../services/storage';
import { triggerHapticFeedback } from '../utils/communication';

interface WelcomePageProps {
  onComplete: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onComplete }) => {
  const { language, setLanguage, settings, updateSettings, t } = useLanguage();
  const [displayName, setDisplayName] = useState(settings.displayName || '');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const handleStart = () => {
    triggerHapticFeedback(60);
    updateSettings({
      displayName: displayName.trim(),
      completedOnboarding: true,
    });

    if (contactName.trim() && contactPhone.trim()) {
      storage.saveContact({
        name: contactName.trim(),
        relationship: 'Family',
        phone: contactPhone.trim(),
        isPrimary: true,
      });
    }

    onComplete();
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-6 sm:p-10 shadow-xl border-2 border-emerald-900/15 flex flex-col gap-8">
        {/* App Logo & Warm Welcoming Header */}
        <div className="text-center flex flex-col items-center gap-4">
          <Logo size="xl" />
          <div>
            <div className="flex items-center justify-center gap-2.5">
              <h1 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
                Koode AI
              </h1>
              <span className="text-base sm:text-lg font-black bg-emerald-100 text-emerald-950 border border-emerald-300 px-2.5 py-0.5 rounded-xl">
                കൂടെ
              </span>
            </div>
            <p className="text-xl sm:text-2xl text-emerald-900 font-bold mt-1">
              {t('appTagline')}
            </p>
          </div>
          <p className="text-lg text-emerald-950/80 max-w-lg leading-relaxed font-medium">
            {t('welcomeStep1')}
          </p>
        </div>

        {/* 1. Language Preference */}
        <div className="bg-stone-50 rounded-3xl p-5 sm:p-6 border-2 border-stone-200 flex flex-col gap-3.5">
          <label className="text-xl font-black text-emerald-950 flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-emerald-800" strokeWidth={2.5} />
            <span>{t('welcomeChooseLang')}</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  triggerHapticFeedback(30);
                  setLanguage(lang.code);
                }}
                className={`py-3.5 px-3 rounded-2xl font-black text-base sm:text-lg border-2 transition-all min-h-[56px] text-center flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                  language === lang.code
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-md scale-102'
                    : 'bg-white text-emerald-950 border-stone-300 hover:border-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span>{lang.nativeName}</span>
                <span className={`text-xs ${language === lang.code ? 'text-emerald-100 font-medium' : 'text-stone-500 font-medium'}`}>
                  {lang.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Optional Preferred Name */}
        <div className="flex flex-col gap-2">
          <Input
            label={t('welcomeNamePrompt')}
            placeholder="e.g., Grandfather, Amma, Grandma, Abuelo, Oma"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {/* 3. Optional Trusted Family Contact */}
        <div className="bg-stone-50 rounded-3xl p-5 sm:p-6 border-2 border-stone-200 flex flex-col gap-4">
          <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2.5">
            <UserPlus className="w-6 h-6 text-emerald-800" strokeWidth={2.5} />
            <span>{t('contactsTitle')} (Optional):</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('contactsName')}
              placeholder={t('contactsNamePlaceholder')}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <Input
              type="tel"
              label={t('contactsPhone')}
              placeholder={t('contactsPhonePlaceholder')}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
        </div>

        {/* 4. Privacy & Transparent Permission Explanation */}
        <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-3xl p-5 sm:p-6 flex flex-col gap-3.5">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-lg sm:text-xl text-emerald-950">
                {t('welcomeMicNotice')}
              </h2>
              <p className="text-base text-emerald-900 mt-1 font-medium leading-relaxed">
                {t('welcomeMicNoticeDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3.5 pt-3 border-t border-emerald-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-base text-emerald-950 font-medium leading-relaxed">
              {t('settingsDataPrivacyDesc')}
            </p>
          </div>
        </div>

        {/* Giant Get Started Button */}
        <Button
          size="xl"
          onClick={handleStart}
          className="w-full text-2xl shadow-lg"
          icon={<ArrowRight className="w-7 h-7" strokeWidth={3} />}
        >
          {t('welcomeStartBtn')}
        </Button>
      </div>
    </div>
  );
};
