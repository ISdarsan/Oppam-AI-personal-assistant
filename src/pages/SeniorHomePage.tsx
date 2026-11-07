import React from 'react';
import { BellRing, ChevronRight, FileText, HandHeart, HeartHandshake, Mic, Siren } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { usePolling } from '../hooks/usePolling';
import { PageView } from '../components/Navigation';
import { RequestTracker } from '../components/RequestTracker';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { formatFriendlyTime, isToday } from '../utils/dateUtils';

interface Props {
  onNavigate: (page: PageView) => void;
}

export const SeniorHomePage: React.FC<Props> = ({ onNavigate }) => {
  const { tx, language } = useLanguage();
  const { user } = useAuth();
  const { data } = usePolling(() => api.listRequests(), 6000);

  const now = new Date();
  const locale = language === 'ml' ? 'ml-IN' : 'en-IN';
  const dateText = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const todays = storage.getReminders().filter((r) => !r.completed && isToday(r.date)).slice(0, 3);
  const active = (data?.requests ?? []).find((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED');

  const rows: { id: PageView; title: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'help', title: tx('cardHelp'), desc: tx('cardHelpDesc'), icon: <HandHeart className="w-8 h-8" strokeWidth={1.8} aria-hidden="true" /> },
    { id: 'reminders', title: tx('cardReminder'), desc: tx('cardReminderDesc'), icon: <BellRing className="w-8 h-8" strokeWidth={1.8} aria-hidden="true" /> },
    { id: 'family', title: tx('cardFamily'), desc: tx('cardFamilyDesc'), icon: <HeartHandshake className="w-8 h-8" strokeWidth={1.8} aria-hidden="true" /> },
    { id: 'explainer', title: tx('cardDocs'), desc: tx('cardDocsDesc'), icon: <FileText className="w-8 h-8" strokeWidth={1.8} aria-hidden="true" /> },
  ];

  return (
    <div className="space-y-7 animate-riseIn">
      <section>
        <p className="text-lg text-brand-muted">{dateText}</p>
        <h1 className="font-display mt-1 text-3xl sm:text-4xl font-bold text-brand-ink leading-snug">
          {tx('hello')}, {user?.name}
        </h1>
        <p className="font-display mt-2 text-2xl text-brand-forest font-semibold leading-snug">{tx('askToday')}</p>
      </section>

      {/* The main action: one flat, confident panel with a kasavu border (no gradients, no decoration) */}
      <section aria-label={tx('talkToKoode')} className="rounded-2xl overflow-hidden border-2 border-brand-forest bg-brand-forest text-white">
        <div className="kasavu" aria-hidden="true" />
        <button
          type="button"
          onClick={() => onNavigate('assistant')}
          className="w-full p-5 sm:p-7 flex items-center gap-5 text-left hover:bg-brand-forestDark transition-colors cursor-pointer"
        >
          <span className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-brand-coral flex items-center justify-center">
            <Mic className="w-10 h-10 sm:w-12 sm:h-12" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display block text-2xl sm:text-3xl font-bold leading-snug">{tx('talkToKoode')}</span>
            <span className="block mt-1 text-lg text-[#D9E6DA]">{tx('talkHint')}</span>
          </span>
        </button>
      </section>

      {active && (
        <section aria-labelledby="active-req">
          <h2 id="active-req" className="font-display text-xl font-bold text-brand-ink mb-2">{tx('activeRequest')}</h2>
          <RequestTracker request={active} />
        </section>
      )}

      {/* An editorial list with hairline dividers instead of a grid of identical boxes */}
      <section aria-label="Actions" className="rounded-2xl bg-brand-paper border-2 border-brand-line divide-y-2 divide-brand-line overflow-hidden">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onNavigate(r.id)}
            className="w-full min-h-[84px] px-4 py-3 flex items-center gap-4 text-left hover:bg-[#F1E8D6] transition-colors cursor-pointer"
          >
            <span className="shrink-0 text-brand-forest">{r.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-xl font-bold text-brand-ink leading-snug">{r.title}</span>
              <span className="block text-base text-brand-muted leading-snug">{r.desc}</span>
            </span>
            <ChevronRight className="w-6 h-6 shrink-0 text-brand-muted" aria-hidden="true" />
          </button>
        ))}
      </section>

      <button
        type="button"
        onClick={() => onNavigate('sos')}
        className="w-full min-h-[80px] rounded-2xl bg-brand-sos text-white px-5 flex items-center gap-4 text-left hover:bg-red-900 transition-colors cursor-pointer"
      >
        <Siren className="w-9 h-9 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span>
          <span className="block text-2xl font-bold">{tx('cardSos')}</span>
          <span className="block text-base text-[#FBD5D1]">{tx('cardSosDesc')}</span>
        </span>
      </button>

      <section aria-labelledby="today-rem" className="rounded-2xl bg-brand-paper border-2 border-brand-line p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <h2 id="today-rem" className="font-display min-w-0 text-lg sm:text-xl font-bold text-brand-ink [overflow-wrap:anywhere]">{tx('todayReminders')}</h2>
          <button type="button" onClick={() => onNavigate('reminders')} className="min-h-[44px] px-1 text-lg font-bold text-brand-forest underline underline-offset-4 cursor-pointer">
            {tx('seeAll')}
          </button>
        </div>
        {todays.length === 0 ? (
          <p className="mt-2 text-lg text-brand-muted">{tx('noRemindersToday')}</p>
        ) : (
          <ul className="mt-3 divide-y-2 divide-brand-line">
            {todays.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-xl font-semibold text-brand-ink break-words min-w-0">{r.title}</span>
                <span className="text-xl font-bold text-brand-forest shrink-0">{formatFriendlyTime(r.time, language)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
