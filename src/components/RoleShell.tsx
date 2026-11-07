import React, { useState } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { usePolling } from '../hooks/usePolling';
import { api } from '../services/api';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationList } from './NotificationList';
import { Logo } from './ui/Logo';

/** Page frame for the helper and family dashboards: brand, who is signed in, language, notifications, log out. */
export const RoleShell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const { user, logout } = useAuth();
  const { tx } = useLanguage();
  const [open, setOpen] = useState(false);
  const { data, reload } = usePolling(() => api.notifications(), 5000);
  const unread = data?.unread_count ?? 0;

  return (
    <div className="min-h-screen bg-brand-ivory pb-10">
      <header className="sticky top-0 z-30 bg-brand-paper/95 backdrop-blur border-b-2 border-brand-line">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="md" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-brand-forest leading-tight">കൂടെ AI</p>
              <p className="text-sm text-brand-muted truncate">
                {tx('signedInAs')}: <span className="font-semibold text-brand-ink">{user?.name}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={`${tx('notifications')}${unread ? ` (${unread})` : ''}`}
              className="relative min-w-[48px] min-h-[48px] rounded-2xl bg-white border-2 border-brand-line flex items-center justify-center cursor-pointer hover:bg-brand-sage"
            >
              <Bell className="w-6 h-6 text-brand-forest" aria-hidden="true" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-sos text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={logout}
              className="min-h-[48px] px-4 rounded-2xl bg-white border-2 border-brand-line text-brand-forest font-bold flex items-center gap-2 cursor-pointer hover:bg-brand-sage"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
              <span className="hidden sm:inline">{tx('logout')}</span>
              <span className="sr-only sm:hidden">{tx('logout')}</span>
            </button>
          </div>
        </div>
        {open && (
          <div className="max-w-3xl mx-auto px-4 pb-4 animate-riseIn">
            <NotificationList notifications={data?.notifications ?? []} onChanged={reload} />
          </div>
        )}
      </header>
      <main className="max-w-3xl mx-auto px-4 pt-6">
        <h1 className="text-3xl font-bold text-brand-ink mb-5">{title}</h1>
        {children}
      </main>
    </div>
  );
};
