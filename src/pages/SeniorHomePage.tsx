import React from 'react';
import { BellRing, FileText, HandHeart, HeartHandshake, Mic, Siren } from 'lucide-react';
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

  const cards: { id: PageView; title: string; desc: string; icon: React.ReactNode; tone: string }[] = [
    { id: 'help', title: tx('cardHelp'), desc: tx('cardHelpDesc'), icon: <HandHeart className="w-9 h-9" aria-hidden="true" />, tone: 'bg-brand-sage text-brand-forest' },
    { id: 'reminders', title: tx('cardReminder'), desc: tx('cardReminderDesc'), icon: <BellRing className="w-9 h-9" aria-hidden="true" />, tone: 'bg-brand-sage text-brand-forest' },
    { id: 'family', title: tx('cardFamily'), desc: tx('cardFamilyDesc'), icon: <HeartHandshake className="w-9 h-9" aria-hidden="true" />, tone: 'bg-brand-sage text-brand-forest' },
    { id: 'explainer', title: tx('cardDocs'), desc: tx('cardDocsDesc'), icon: <FileText className="w-9 h-9" aria-hidden="true" />, tone: 'bg-brand-sage text-brand-forest' },
  ];

  return (
    <div className="space-y-6 animate-riseIn">
      <section>
        <p className="text-lg text-brand-muted">{dateText}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-brand-ink leading-snug">
          {tx('hello')}, {user?.name}!
        </h1>
        <p className="mt-1 text-2xl text-brand-forest font-semibold">{tx('askToday')}</p>
      </section>

      <section aria-label={tx('talkToKoode')}>
        <button
          type="button"
          onClick={() => onNavigate('assistant')}
          className="relative w-full overflow-hidden rounded-[2rem] bg-brand-forest text-white p-5 sm:p-8 flex items-center gap-4 sm:gap-5 text-left shadow-lg hover:bg-brand-forestDark active:scale-[0.99] transition cursor-pointer"
        >
          <span className="relative shrink-0">
            <span className="absolute inset-0 rounded-full bg-brand-coral/70 animate-pulseRing" aria-hidden="true" />
            <span className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-brand-coral flex items-center justify-center shadow-md">
              <Mic className="w-10 h-10 sm:w-12 sm:h-12" aria-hidden="true" />
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-2xl sm:text-3xl font-bold leading-snug">{tx('talkToKoode')}</span>
            <span className="block mt-1 text-lg opacity-90">{tx('talkHint')}</span>
          </span>
        </button>
      </section>

      {active && (
        <section aria-labelledby="active-req">
          <h2 id="active-req" className="text-xl font-bold text-brand-ink mb-2">{tx('activeRequest')}</h2>
          <RequestTracker request={active} />
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Actions">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onNavigate(c.id)}
            className="min-h-[92px] rounded-3xl bg-white border-2 border-brand-line p-4 flex items-center gap-4 text-left shadow-sm hover:border-brand-forest active:scale-[0.99] transition cursor-pointer"
          >
            <span className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center ${c.tone}`}>{c.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-xl font-bold text-brand-ink leading-snug">{c.title}</span>
              <span className="block text-base text-brand-muted leading-snug">{c.desc}</span>
            </span>
          </button>
        ))}
      </section>

      <button
        type="button"
        onClick={() => onNavigate('sos')}
        className="w-full min-h-[84px] rounded-3xl bg-brand-sos text-white px-6 flex items-center gap-4 text-left shadow-md hover:bg-red-900 active:scale-[0.99] transition cursor-pointer"
      >
        <Siren className="w-10 h-10 shrink-0" aria-hidden="true" />
        <span>
          <span className="block text-2xl font-bold">{tx('cardSos')}</span>
          <span className="block text-base opacity-95">{tx('cardSosDesc')}</span>
        </span>
      </button>

      <section aria-labelledby="today-rem" className="bg-white rounded-3xl border-2 border-brand-line p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <h2 id="today-rem" className="min-w-0 text-lg sm:text-xl font-bold text-brand-ink [overflow-wrap:anywhere]">{tx('todayReminders')}</h2>
          <button type="button" onClick={() => onNavigate('reminders')} className="min-h-[44px] px-3 text-lg font-bold text-brand-forest underline cursor-pointer">
            {tx('seeAll')}
          </button>
        </div>
        {todays.length === 0 ? (
          <p className="mt-2 text-lg text-brand-muted">{tx('noRemindersToday')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {todays.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-brand-ivory px-4 py-3">
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
