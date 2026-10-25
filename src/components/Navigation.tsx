import React from 'react';
import { Home, Mic, Bell, FileQuestion, Users, Settings } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export type PageView = 'home' | 'assistant' | 'reminders' | 'explainer' | 'contacts' | 'settings';

interface NavigationProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  reminderCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate, reminderCount = 0 }) => {
  const { t } = useLanguage();

  const navItems: { id: PageView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: t('navHome'), icon: <Home className="w-6 h-6" /> },
    { id: 'assistant', label: t('navAssistant'), icon: <Mic className="w-6 h-6" /> },
    { id: 'reminders', label: t('navReminders'), icon: <Bell className="w-6 h-6" />, badge: reminderCount },
    { id: 'explainer', label: t('navExplainer'), icon: <FileQuestion className="w-6 h-6" /> },
    { id: 'contacts', label: t('navContacts'), icon: <Users className="w-6 h-6" /> },
    { id: 'settings', label: t('navSettings'), icon: <Settings className="w-6 h-6" /> },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-sahaaya-border shadow-lg px-2 py-2 sm:py-3"
      aria-label="Main Navigation"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center min-h-[52px] min-w-[56px] px-2.5 py-1.5 rounded-2xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sahaaya-primary ${
                isActive
                  ? 'bg-sahaaya-cream text-sahaaya-primary font-bold shadow-sm'
                  : 'text-sahaaya-muted hover:text-sahaaya-text hover:bg-sahaaya-bg'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                {item.icon}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 bg-sahaaya-alert text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs sm:text-sm mt-1 tracking-tight text-center truncate max-w-[70px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
