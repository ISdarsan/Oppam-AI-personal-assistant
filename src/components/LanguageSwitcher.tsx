import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../types';

/** Two-option Malayalam / English switch with large, labelled targets. */
export const LanguageSwitcher: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact = false }) => {
  const { language, setLanguage } = useLanguage();
  if (compact) {
    // one button that names the language you will switch TO (fits small phone headers)
    const next: Language = language === 'ml' ? 'en' : 'ml';
    return (
      <button
        type="button"
        lang={next}
        onClick={() => setLanguage(next)}
        className={`min-h-[48px] px-3 rounded-2xl bg-brand-forest text-white text-base font-bold cursor-pointer hover:bg-brand-forestDark ${className}`}
      >
        {next === 'ml' ? 'മലയാളം' : 'English'}
      </button>
    );
  }
  const opts: { code: Language; label: string }[] = [
    { code: 'ml', label: 'മലയാളം' },
    { code: 'en', label: 'English' },
  ];
  return (
    <div role="group" aria-label="Language / ഭാഷ" className={`inline-flex rounded-2xl bg-brand-sage p-1 ${className}`}>
      {opts.map((o) => {
        const active = language === o.code;
        return (
          <button
            key={o.code}
            type="button"
            lang={o.code}
            aria-pressed={active}
            onClick={() => setLanguage(o.code)}
            className={`min-h-[44px] px-3.5 rounded-xl text-base font-bold cursor-pointer transition-colors ${
              active ? 'bg-brand-forest text-white shadow-sm' : 'text-brand-forest hover:bg-white/70'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
};
