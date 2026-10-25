import React, { useState } from 'react';
import { Globe, Mic, ShieldCheck, ArrowRight, UserPlus } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { supportedLanguages } from '../i18n/translations';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { storage } from '../services/storage';

interface WelcomePageProps {
  onComplete: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onComplete }) => {
  const { language, setLanguage, settings, updateSettings, t } = useLanguage();
  const [displayName, setDisplayName] = useState(settings.displayName || '');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const handleStart = () => {
    updateSettings({
      displayName: displayName.trim(),
      completedOnboarding: true,
    });

    if (contactName.trim() && contactPhone.trim()) {
      storage.saveContact({
        name: contactName.trim(),
        relationship: 'Family',
        phone: contactPhone.trim(),
      });
    }

    onComplete();
  };

  return (
    <div className="min-h-screen bg-sahaaya-bg flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-sahaaya-border flex flex-col gap-8">
        {/* App Logo & Header */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-3xl bg-sahaaya-accentLight border-2 border-sahaaya-primary flex items-center justify-center text-4xl font-black text-sahaaya-primary shadow-inner">
            സ
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-sahaaya-primary tracking-tight">
            {t('appName')}
          </h1>
          <p className="text-xl sm:text-2xl text-sahaaya-text font-medium">
            {t('appTagline')}
          </p>
          <p className="text-lg text-sahaaya-muted max-w-lg">
            {t('welcomeStep1')}
          </p>
        </div>

        {/* 1. Language Preference */}
        <div className="bg-sahaaya-cream/60 rounded-2xl p-5 border border-sahaaya-border flex flex-col gap-3">
          <label className="text-lg font-bold text-sahaaya-text flex items-center gap-2">
            <Globe className="w-5 h-5 text-sahaaya-primary" />
            <span>{t('welcomeChooseLang')}</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`py-3 px-3 rounded-xl font-bold text-base sm:text-lg border-2 transition-all min-h-[48px] text-center flex flex-col items-center justify-center ${
                  language === lang.code
                    ? 'bg-sahaaya-primary text-white border-sahaaya-primary shadow-sm'
                    : 'bg-white text-sahaaya-text border-sahaaya-border hover:border-sahaaya-primary'
                }`}
              >
                <span>{lang.nativeName}</span>
                <span className={`text-xs ${language === lang.code ? 'text-emerald-100' : 'text-sahaaya-muted'}`}>
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
        <div className="bg-sahaaya-cream/40 rounded-2xl p-5 border border-sahaaya-border flex flex-col gap-3">
          <h2 className="text-lg font-bold text-sahaaya-text flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-sahaaya-primary" />
            <span>{t('contactsTitle')} (Optional):</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {/* 4. Privacy & Permission Explanation */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Mic className="w-6 h-6 text-sahaaya-primary flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-lg text-emerald-950">
                {t('welcomeMicNotice')}
              </h2>
              <p className="text-base text-emerald-900 mt-1">
                {t('welcomeMicNoticeDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 pt-2 border-t border-emerald-200/60">
            <ShieldCheck className="w-6 h-6 text-sahaaya-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-900">
              {t('settingsDataPrivacyDesc')}
            </p>
          </div>
        </div>

        {/* Get Started Button */}
        <Button
          size="xl"
          onClick={handleStart}
          className="w-full text-xl shadow-md"
          icon={<ArrowRight className="w-6 h-6" />}
        >
          {t('welcomeStartBtn')}
        </Button>
      </div>
    </div>
  );
};
