import React from 'react';
import { Home, Mic, Bell, FileQuestion, Users, Settings } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerHapticFeedback } from '../utils/communication';

export type PageView = 'home' | 'assistant' | 'reminders' | 'explainer' | 'contacts' | 'settings';

interface NavigationProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  reminderCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate, reminderCount = 0 }) => {
  const { t } = useLanguage();

  const navItems: { id: PageView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: t('navHome'), icon: <Home className="w-7 h-7" strokeWidth={2.5} /> },
    { id: 'assistant', label: t('navAssistant'), icon: <Mic className="w-7 h-7" strokeWidth={2.5} /> },
    { id: 'reminders', label: t('navReminders'), icon: <Bell className="w-7 h-7" strokeWidth={2.5} />, badge: reminderCount },
    { id: 'explainer', label: t('navExplainer'), icon: <FileQuestion className="w-7 h-7" strokeWidth={2.5} /> },
    { id: 'contacts', label: t('navContacts'), icon: <Users className="w-7 h-7" strokeWidth={2.5} /> },
    { id: 'settings', label: t('navSettings'), icon: <Settings className="w-7 h-7" strokeWidth={2.5} /> },
  ];

  const handleTabClick = (pageId: PageView) => {
    triggerHapticFeedback(30);
    onNavigate(pageId);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t-2 border-emerald-900/15 shadow-2xl px-2 py-2 sm:py-2.5 safe-area-pb"
      aria-label="Main Navigation"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-around gap-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`relative flex-1 max-w-[120px] flex flex-col items-center justify-center min-h-[62px] px-1 py-1.5 rounded-2xl transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-emerald-700/30 active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-emerald-800 text-white font-black shadow-md scale-105'
                  : 'text-emerald-950/70 hover:text-emerald-950 hover:bg-emerald-50/80 font-bold'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                {item.icon}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-600 text-white text-xs font-black rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center border-2 border-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[12px] sm:text-sm mt-1 tracking-tight text-center whitespace-nowrap leading-tight ${isActive ? 'font-black' : 'font-bold'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
