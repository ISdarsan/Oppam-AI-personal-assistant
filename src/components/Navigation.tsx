import React from 'react';
import { Home, Mic, HandHeart, Bell, HeartHandshake } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerHapticFeedback } from '../utils/communication';

export type PageView =
  | 'home'
  | 'assistant'
  | 'help'
  | 'reminders'
  | 'family'
  | 'sos'
  | 'explainer'
  | 'contacts'
  | 'settings';

interface NavigationProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  reminderCount?: number;
}

/** Senior bottom navigation: five labelled destinations (icon + word, never icon-only). */
export const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate, reminderCount = 0 }) => {
  const { tx } = useLanguage();

  const navItems: { id: PageView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: tx('navHome'), icon: <Home className="w-7 h-7" strokeWidth={2.4} aria-hidden="true" /> },
    { id: 'assistant', label: tx('navTalk'), icon: <Mic className="w-7 h-7" strokeWidth={2.4} aria-hidden="true" /> },
    { id: 'help', label: tx('navHelp'), icon: <HandHeart className="w-7 h-7" strokeWidth={2.4} aria-hidden="true" /> },
    { id: 'reminders', label: tx('navReminders'), icon: <Bell className="w-7 h-7" strokeWidth={2.4} aria-hidden="true" />, badge: reminderCount },
    { id: 'family', label: tx('navFamily'), icon: <HeartHandshake className="w-7 h-7" strokeWidth={2.4} aria-hidden="true" /> },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-brand-paper/98 backdrop-blur border-t-2 border-brand-line shadow-2xl px-2 py-2"
      aria-label="Main"
    >
      <div className="max-w-3xl mx-auto flex items-stretch justify-around gap-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerHapticFeedback(30);
                onNavigate(item.id);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 min-w-0 flex flex-col items-center justify-center min-h-[64px] px-0.5 py-1.5 rounded-2xl transition-colors cursor-pointer ${
                isActive ? 'bg-brand-forest text-white font-bold' : 'text-brand-forest hover:bg-brand-sage font-semibold'
              }`}
            >
              <span className="relative">
                {item.icon}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2.5 bg-brand-coral text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center border-2 border-white">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="mt-0.5 text-[13px] sm:text-sm leading-tight text-center break-words max-w-full">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
