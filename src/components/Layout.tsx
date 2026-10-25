import React, { useState, useEffect } from 'react';
import { Sparkles, Globe, Type, CheckCircle, BellRing, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { supportedLanguages } from '../i18n/translations';
import { Navigation, PageView } from './Navigation';
import { Logo } from './ui/Logo';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { HealthStatus, Reminder, TextSize } from '../types';
import { isToday, isOverdue, formatFriendlyTime } from '../utils/dateUtils';
import { playGentleChime } from '../utils/sound';
import { triggerHapticFeedback } from '../utils/communication';

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
        triggerHapticFeedback([100, 50, 100]);
      }
    };

    checkReminders();
    const timer = setInterval(checkReminders, 15000); // Check every 15s
    return () => clearInterval(timer);
  }, [activeAlert]);

  const toggleLanguage = () => {
    triggerHapticFeedback(30);
    const currentIndex = supportedLanguages.findIndex((l) => l.code === language);
    const nextLang = supportedLanguages[(currentIndex + 1) % supportedLanguages.length];
    setLanguage(nextLang.code);
  };

  const cycleTextSize = () => {
    triggerHapticFeedback(30);
    const sizes: TextSize[] = ['normal', 'large', 'xlarge'];
    const next = sizes[(sizes.indexOf(textSize) + 1) % sizes.length];
    setTextSize(next);
  };

  const handleDismissAlert = () => {
    triggerHapticFeedback(30);
    setActiveAlert(null);
  };

  const handleCompleteAlert = () => {
    if (activeAlert) {
      triggerHapticFeedback(60);
      storage.toggleReminder(activeAlert.id);
      setActiveAlert(null);
      setPendingRemindersCount((prev) => Math.max(0, prev - 1));
    }
  };

  const textSizeLabels: Record<TextSize, string> = {
    normal: 'A (18px)',
    large: 'A+ (20px)',
    xlarge: 'A++ (22px)',
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col font-sans pb-28 text-emerald-950">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/98 backdrop-blur-md border-b-2 border-emerald-900/15 px-3 py-2.5 sm:px-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Name */}
          <button
            onClick={() => {
              triggerHapticFeedback(30);
              onNavigate('home');
            }}
            className="flex items-center gap-3 text-left focus:outline-none focus:ring-4 focus:ring-emerald-700/30 rounded-2xl p-1 transition-transform active:scale-95 cursor-pointer"
            aria-label="Go to Home"
          >
            <Logo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-emerald-900 tracking-tight leading-tight">
                  Koode AI
                </h1>
                <span className="text-xs sm:text-sm font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-lg">
                  കൂടെ
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-800/80 font-medium hidden sm:block">
                {t('appTagline')}
              </p>
            </div>
          </button>

          {/* Senior Accessibility Quick Controls */}
          <div className="flex items-center gap-2">
            {/* AI Status badge */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 ${
                health?.status === 'healthy'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-amber-50 text-amber-950 border-amber-300'
              }`}
              title={health?.message || 'Checking local AI...'}
            >
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>
                {health?.status === 'healthy'
                  ? `Gemma AI Ready`
                  : health?.status === 'degraded'
                  ? 'Model Pending'
                  : 'AI Offline'}
              </span>
            </div>

            {/* Dynamic Text Size toggle for Elders */}
            <button
              onClick={cycleTextSize}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 border-emerald-900/20 bg-stone-50 hover:bg-emerald-50 text-emerald-950 font-black text-sm sm:text-base min-h-[50px] min-w-[50px] justify-center focus:outline-none focus:ring-4 focus:ring-emerald-700/30 transition-all shadow-xs cursor-pointer"
              aria-label={`Current text size: ${textSize}. Tap to switch between Normal, Large, and Extra Large.`}
              title="Change Text Size"
            >
              <Type className="w-5 h-5 text-emerald-800" strokeWidth={2.5} />
              <span className="font-extrabold">{textSizeLabels[textSize]}</span>
            </button>

            {/* Language toggle with clear native script */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border-2 border-emerald-800 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-sm sm:text-base min-h-[50px] justify-center focus:outline-none focus:ring-4 focus:ring-emerald-700/40 transition-all shadow-sm active:scale-95 cursor-pointer"
              aria-label="Switch language"
              title="Switch Language"
            >
              <Globe className="w-5 h-5" strokeWidth={2.5} />
              <span>{supportedLanguages.find((l) => l.code === language)?.nativeName || 'English'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Reassuring Due Reminder Alert Banner */}
      {activeAlert && (
        <aside
          role="alert"
          aria-live="assertive"
          className="bg-rose-50 border-b-4 border-rose-600 text-emerald-950 px-4 py-3.5 shadow-lg animate-slideDown"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse shadow-md">
                <BellRing className="w-7 h-7" />
              </div>
              <div>
                <p className="font-black text-xl text-rose-950 tracking-tight">
                  {language === 'ml' ? 'സമയമായിരിക്കുന്നു!' : 'Reminder Due Now!'}
                </p>
                <p className="text-lg text-emerald-950 font-bold">
                  {activeAlert.title} — <span className="font-mono text-emerald-900">{formatFriendlyTime(activeAlert.time, language)}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleCompleteAlert}
                className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-3 rounded-2xl font-black text-base min-h-[50px] shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-700/40 active:scale-95 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" />
                <span>{t('remindersMarkDone')}</span>
              </button>
              <button
                onClick={handleDismissAlert}
                className="p-3 text-stone-500 hover:text-stone-900 hover:bg-rose-100 rounded-2xl min-h-[50px] min-w-[50px] flex items-center justify-center cursor-pointer"
                aria-label="Dismiss alert"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area with generous padding */}
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
