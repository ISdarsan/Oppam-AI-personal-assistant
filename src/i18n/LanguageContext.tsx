import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, TextSize, UserSettings } from '../types';
import { translations } from './translations';
import { storage } from '../services/storage';
import { koodeEn, koodeMl, KoodeKey } from './koodeStrings';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  t: (key: keyof typeof translations.en) => string;
  /** Role-based community UI strings (Malayalam default, English alternative). */
  tx: (key: KoodeKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(() => storage.getSettings());

  useEffect(() => {
    // Update HTML root attributes for font & text size
    const root = document.documentElement;
    root.setAttribute('lang', settings.language);

    // Apply text size classes to root
    root.classList.remove('text-size-normal', 'text-size-large', 'text-size-xlarge');
    root.classList.add(`text-size-${settings.textSize}`);

    // Update localStorage
    storage.saveSettings(settings);
  }, [settings]);

  const setLanguage = (lang: Language) => {
    setSettings(prev => ({ ...prev, language: lang }));
  };

  const setTextSize = (size: TextSize) => {
    setSettings(prev => ({ ...prev, textSize: size }));
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      storage.saveSettings(updated);
      return updated;
    });
  };

  const t = (key: keyof typeof translations.en): string => {
    const dict = (translations[settings.language] || translations.en) as Partial<Record<keyof typeof translations.en, string>>;
    return dict[key] || translations.en[key] || String(key);
  };

  const tx = (key: KoodeKey): string => (settings.language === 'ml' ? koodeMl[key] : koodeEn[key]);

  return (
    <LanguageContext.Provider
      value={{
        language: settings.language,
        setLanguage,
        textSize: settings.textSize,
        setTextSize,
        settings,
        updateSettings,
        t,
        tx,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
