import React, { useState, useEffect } from 'react';
import { Sparkles, Globe, Type, CheckCircle, BellRing, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Navigation, PageView } from './Navigation';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { HealthStatus, Reminder, TextSize } from '../types';
import { isToday, isOverdue, formatFriendlyTime } from '../utils/dateUtils';
import { playGentleChime } from '../utils/sound';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { language, setLanguage, textSize, setTextSize, t } = useLanguage();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeAlert, setActiveAlert] = useState<Reminder | null>(null);
  const [pendingRemindersCount, setPendingRemindersCount] = useState<number>(0);

  // Check health periodically
  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      const data = await api.getHealth();
      if (isMounted) setHealth(data);
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Check every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Monitor reminders for due notifications
  useEffect(() => {
    const checkReminders = () => {
      const allReminders = storage.getReminders();
      const todayPending = allReminders.filter(
        (r) => !r.completed && (isToday(r.date) || isOverdue(r.date, r.time))
      );
      setPendingRemindersCount(todayPending.length);

      // Check if any reminder is overdue right now and hasn't been acknowledged
      const dueNow = todayPending.find((r) => isOverdue(r.date, r.time));
      if (dueNow && (!activeAlert || activeAlert.id !== dueNow.id)) {
        setActiveAlert(dueNow);
        playGentleChime();
      }
    };

    checkReminders();
    const timer = setInterval(checkReminders, 15000); // Check every 15s
    return () => clearInterval(timer);
  }, [activeAlert]);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ml' : 'en');
  };

  const cycleTextSize = () => {
    const sizes: TextSize[] = ['normal', 'large', 'xlarge'];
    const next = sizes[(sizes.indexOf(textSize) + 1) % sizes.length];
    setTextSize(next);
  };

  const handleDismissAlert = () => {
    setActiveAlert(null);
  };

  const handleCompleteAlert = () => {
    if (activeAlert) {
      storage.toggleReminder(activeAlert.id);
      setActiveAlert(null);
      setPendingRemindersCount((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="min-h-screen bg-sahaaya-bg flex flex-col font-sans pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-sahaaya-border px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Name */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-sahaaya-primary rounded-xl p-1"
          >
            <div className="w-11 h-11 rounded-2xl bg-sahaaya-cream flex items-center justify-center border-2 border-sahaaya-primary/30 flex-shrink-0">
              <span className="text-2xl font-bold text-sahaaya-primary">സ</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-sahaaya-primary tracking-tight leading-tight">
                {t('appName')}
              </h1>
              <p className="text-xs sm:text-sm text-sahaaya-muted hidden sm:block">
                {t('appTagline')}
              </p>
            </div>
          </button>

          {/* Quick Header Controls */}
          <div className="flex items-center gap-2">
            {/* AI Status pill */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                health?.status === 'healthy'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={health?.message || 'Checking local AI...'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {health?.status === 'healthy'
                  ? `Gemma AI Ready`
                  : health?.status === 'degraded'
                  ? 'Model Pending'
                  : 'AI Offline'}
              </span>
            </div>

            {/* Text Size toggle */}
            <button
              onClick={cycleTextSize}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sahaaya-border bg-sahaaya-cream hover:bg-white text-sahaaya-text font-bold text-sm min-h-[48px] min-w-[48px] justify-center focus:outline-none focus:ring-2 focus:ring-sahaaya-primary transition-colors"
              aria-label={`Current text size: ${textSize}. Tap to change.`}
              title="Change Text Size"
            >
              <Type className="w-4 h-4 text-sahaaya-primary" />
              <span className="capitalize">{textSize}</span>
            </button>

            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-sahaaya-primary bg-sahaaya-accentLight hover:bg-sahaaya-cream text-sahaaya-primary font-bold text-sm min-h-[48px] justify-center focus:outline-none focus:ring-2 focus:ring-sahaaya-primary transition-colors"
              aria-label={`Switch language to ${language === 'en' ? 'Malayalam' : 'English'}`}
            >
              <Globe className="w-4 h-4" />
              <span>{language === 'en' ? 'മലയാളം' : 'English'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Due Reminder Alert Banner */}
      {activeAlert && (
        <aside
          role="alert"
          aria-live="assertive"
          className="bg-sahaaya-alertBg border-b-2 border-sahaaya-alert text-sahaaya-text px-4 py-3 shadow-md animate-slideDown"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sahaaya-alert text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg text-sahaaya-alert">
                  {language === 'ml' ? 'സമയമായിരിക്കുന്നു!' : 'Reminder Due Now!'}
                </p>
                <p className="text-base text-sahaaya-text font-medium">
                  {activeAlert.title} — {formatFriendlyTime(activeAlert.time, language)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleCompleteAlert}
                className="flex items-center gap-1.5 bg-sahaaya-primary hover:bg-sahaaya-primaryHover text-white px-3.5 py-2 rounded-xl font-bold text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-sahaaya-primary"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{t('remindersMarkDone')}</span>
              </button>
              <button
                onClick={handleDismissAlert}
                className="p-2 text-sahaaya-muted hover:text-sahaaya-text rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Dismiss alert"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Bottom Navigation */}
      <Navigation
        currentPage={currentPage}
        onNavigate={onNavigate}
        reminderCount={pendingRemindersCount}
      />
    </div>
  );
};
