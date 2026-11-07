import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle, LogOut, Settings as SettingsIcon, Type, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Navigation, PageView } from './Navigation';
import { Logo } from './ui/Logo';
import { VoiceDock } from '../voice/VoiceDock';
import type { VoiceCommand } from '../voice/commandRouter';
import { storage } from '../services/storage';
import { Reminder, TextSize } from '../types';
import { isToday, isOverdue, formatFriendlyTime } from '../utils/dateUtils';
import { playGentleChime } from '../utils/sound';
import { triggerHapticFeedback } from '../utils/communication';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  onVoiceCommand?: (cmd: VoiceCommand) => void;
}

/** Frame for the senior experience: brand header, language, text size, settings, log out, bottom navigation. */
export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, onVoiceCommand }) => {
  const { language, textSize, setTextSize, t, tx } = useLanguage();
  const { user, logout } = useAuth();
  const [activeAlert, setActiveAlert] = useState<Reminder | null>(null);
  const [pendingRemindersCount, setPendingRemindersCount] = useState<number>(0);

  // Monitor local reminders for due notifications (reminders stay on the device).
  useEffect(() => {
    const checkReminders = () => {
      const todayPending = storage.getReminders().filter((r) => !r.completed && (isToday(r.date) || isOverdue(r.date, r.time)));
      setPendingRemindersCount(todayPending.length);
      const dueNow = todayPending.find((r) => isOverdue(r.date, r.time));
      if (dueNow && (!activeAlert || activeAlert.id !== dueNow.id)) {
        setActiveAlert(dueNow);
        playGentleChime();
        triggerHapticFeedback([100, 50, 100]);
      }
    };
    checkReminders();
    const timer = setInterval(checkReminders, 15000);
    return () => clearInterval(timer);
  }, [activeAlert]);

  const cycleTextSize = () => {
    triggerHapticFeedback(30);
    const sizes: TextSize[] = ['normal', 'large', 'xlarge'];
    setTextSize(sizes[(sizes.indexOf(textSize) + 1) % sizes.length]);
  };

  const handleCompleteAlert = () => {
    if (activeAlert) {
      triggerHapticFeedback(60);
      storage.toggleReminder(activeAlert.id);
      setActiveAlert(null);
      setPendingRemindersCount((prev) => Math.max(0, prev - 1));
    }
  };

  const sizeLabel: Record<TextSize, string> = { normal: 'A', large: 'A+', xlarge: 'A++' };

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col pb-28 text-brand-ink">
      <header className="sticky top-0 z-30 bg-brand-paper/95 backdrop-blur border-b-2 border-brand-line px-3 py-2.5 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(30);
              onNavigate('home');
            }}
            className="flex items-center gap-3 text-left rounded-2xl p-1 cursor-pointer"
            aria-label={tx('navHome')}
          >
            <Logo size="md" />
            <span className="hidden min-[430px]:inline text-xl font-bold text-brand-forest leading-tight">കൂടെ AI</span>
          </button>

          <div className="flex items-center gap-1.5">
            <LanguageSwitcher compact />
            <button
              type="button"
              onClick={cycleTextSize}
              aria-label={`${tx('textSize')}: ${sizeLabel[textSize]}`}
              className="min-h-[48px] min-w-[48px] px-1 rounded-2xl bg-white border-2 border-brand-line text-brand-forest font-bold flex items-center justify-center cursor-pointer hover:bg-brand-sage"
            >
              <Type className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="text-sm">{sizeLabel[textSize]}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label={tx('settings')}
              className="min-h-[48px] min-w-[48px] rounded-2xl bg-white border-2 border-brand-line text-brand-forest flex items-center justify-center cursor-pointer hover:bg-brand-sage"
            >
              <SettingsIcon className="w-6 h-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={logout}
              aria-label={`${tx('logout')} (${user?.name ?? ''})`}
              className="min-h-[48px] min-w-[48px] rounded-2xl bg-white border-2 border-brand-line text-brand-forest flex items-center justify-center cursor-pointer hover:bg-brand-sage"
            >
              <LogOut className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {activeAlert && (
        <aside role="alert" aria-live="assertive" className="bg-brand-coralSoft border-b-4 border-brand-coral px-4 py-3.5 shadow-lg animate-slideDown">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-coral text-white flex items-center justify-center shrink-0">
                <BellRing className="w-7 h-7" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-xl text-brand-coralDark">{language === 'ml' ? 'സമയമായിരിക്കുന്നു!' : 'Reminder due now!'}</p>
                <p className="text-lg font-semibold">
                  {activeAlert.title} — {formatFriendlyTime(activeAlert.time, language)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCompleteAlert}
                className="flex items-center gap-2 bg-brand-forest text-white px-5 py-3 rounded-2xl font-bold text-lg min-h-[52px] cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" aria-hidden="true" />
                {t('remindersMarkDone')}
              </button>
              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className="min-h-[52px] min-w-[52px] rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/70"
                aria-label={tx('cancel')}
              >
                <X className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>
      )}

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>

      {/* Voice control everywhere except screens that already have their own microphone */}
      {onVoiceCommand && !['assistant', 'help', 'sos'].includes(currentPage) && <VoiceDock onCommand={onVoiceCommand} />}

      <Navigation currentPage={currentPage} onNavigate={onNavigate} reminderCount={pendingRemindersCount} />
    </div>
  );
};
