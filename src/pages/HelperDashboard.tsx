import React, { useState } from 'react';
import { CheckCircle2, MapPin, Navigation2, ShieldQuestion } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { usePolling } from '../hooks/usePolling';
import { RoleShell } from '../components/RoleShell';
import { BigButton } from '../components/ui/BigButton';
import { ApiError, api } from '../services/api';
import { CommunityRequest } from '../types/community';
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL, categoryIcon, timeAgo } from '../utils/community';

type Tab = 'available' | 'mine' | 'done' | 'profile';

export const HelperDashboard: React.FC = () => {
  const { tx } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('available');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { data, error, loading, reload } = usePolling(() => api.listRequests(), 5000);

  const all = data?.requests ?? [];
  const mine = all.filter((r) => r.helper_id === user?.user_id);
  const lists: Record<Exclude<Tab, 'profile'>, CommunityRequest[]> = {
    available: all.filter((r) => r.status === 'OPEN'),
    mine: mine.filter((r) => r.status === 'ACCEPTED' || r.status === 'ON_THE_WAY'),
    done: mine.filter((r) => r.status === 'COMPLETED' || r.status === 'CANCELLED'),
  };

  const act = async (r: CommunityRequest, fn: () => Promise<unknown>) => {
    if (busyId) return; // prevents double taps / duplicate actions
    setBusyId(r.request_id);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof ApiError && e.code === 'ALREADY_ACCEPTED' ? tx('takenByOther') : e instanceof Error ? e.message : tx('errorGeneric'));
    } finally {
      setBusyId(null);
      await reload();
    }
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'available', label: tx('tabAvailable'), count: lists.available.length },
    { id: 'mine', label: tx('tabMine'), count: lists.mine.length },
    { id: 'done', label: tx('tabDone') },
    { id: 'profile', label: tx('tabProfile') },
  ];

  return (
    <RoleShell title={tx('helperTitle')}>
      <div role="tablist" aria-label={tx('helperTitle')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-[52px] px-3 rounded-2xl text-lg font-bold border-2 cursor-pointer ${
              tab === t.id ? 'bg-brand-forest text-white border-brand-forest' : 'bg-white text-brand-forest border-brand-line'
            }`}
          >
            {t.label}
            {t.count ? <span className="ml-2 bg-brand-coral text-white rounded-full text-sm px-2 py-0.5">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {notice && (
        <p role="alert" className="mt-4 rounded-2xl bg-brand-coralSoft border-2 border-brand-coral px-4 py-3 text-lg font-semibold text-brand-coralDark">
          {notice}
        </p>
      )}
      {error && !data && (
        <p role="alert" className="mt-4 rounded-2xl bg-brand-sosSoft border-2 border-brand-sos px-4 py-3 text-lg text-brand-sos">
          {tx('offlineHint')} <button className="underline font-bold cursor-pointer" onClick={reload}>{tx('retry')}</button>
        </p>
      )}

      {tab === 'profile' ? (
        <section className="mt-5 bg-white rounded-3xl border-2 border-brand-line p-6 space-y-3">
          <p className="text-2xl font-bold text-brand-ink">{user?.name}</p>
          <p className="text-lg text-brand-muted">ID: {user?.user_id}</p>
          <p className="flex items-start gap-2 text-lg text-brand-ink rounded-2xl bg-brand-ivory p-4">
            <ShieldQuestion className="w-6 h-6 text-brand-coral shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <span className="font-bold">{tx('verification')}: </span>
              {tx('notVerified')}
            </span>
          </p>
          <p className="text-lg text-brand-muted">
            {tx('tabMine')}: {lists.mine.length} · {tx('tabDone')}: {lists.done.length}
          </p>
        </section>
      ) : loading && !data ? (
        <p className="mt-6 text-lg text-brand-muted">{tx('loading')}</p>
      ) : lists[tab].length === 0 ? (
        <p className="mt-6 rounded-3xl bg-white border-2 border-dashed border-brand-sageDark px-6 py-10 text-center text-xl text-brand-muted">
          {tab === 'available' ? tx('noOpen') : tab === 'mine' ? tx('noMine') : tx('noDone')}
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {lists[tab].map((r) => (
            <li key={r.request_id}>
              <TaskCard
                r={r}
                busy={busyId === r.request_id}
                locked={busyId !== null}
                onAccept={() => act(r, () => api.acceptRequest(r.request_id))}
                onOnTheWay={() => act(r, () => api.setRequestStatus(r.request_id, 'ON_THE_WAY'))}
                onDone={() => act(r, () => api.setRequestStatus(r.request_id, 'COMPLETED'))}
              />
            </li>
          ))}
        </ul>
      )}
    </RoleShell>
  );
};

const TaskCard: React.FC<{
  r: CommunityRequest;
  busy: boolean;
  locked: boolean;
  onAccept: () => void;
  onOnTheWay: () => void;
  onDone: () => void;
}> = ({ r, busy, locked, onAccept, onOnTheWay, onDone }) => {
  const { tx } = useLanguage();
  const urgent = r.priority === 'urgent' || r.priority === 'high';
  return (
    <article className="bg-white rounded-3xl border-2 border-brand-line p-5 shadow-sm animate-riseIn">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-sage text-brand-forest flex items-center justify-center shrink-0">
          {categoryIcon(r.category)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold text-brand-ink break-words">{r.title}</h3>
          <p className="text-base text-brand-muted">
            {tx(CATEGORY_LABEL[r.category])} · {timeAgo(r.created_at, tx)}
          </p>
          <span
            className={`mt-1.5 inline-block rounded-full px-3 py-1 text-sm font-bold ${
              urgent ? 'bg-brand-coralSoft text-brand-coralDark' : 'bg-brand-sage text-brand-forest'
            }`}
          >
            {tx(PRIORITY_LABEL[r.priority])}
          </span>
        </div>
      </div>
      <p className="mt-3 text-lg text-brand-ink break-words">{r.description}</p>
      <p className="mt-2 text-base text-brand-muted">
        {tx('seniorLabel')}: <span className="font-semibold text-brand-ink">{r.senior_name}</span>
      </p>
      {r.location_hint && (
        <p className="mt-1 flex items-center gap-1.5 text-base text-brand-muted">
          <MapPin className="w-5 h-5" aria-hidden="true" /> {r.location_hint}
        </p>
      )}
      <p className="mt-2 text-base font-semibold text-brand-forest">{tx(STATUS_LABEL[r.status])}</p>

      <div className="mt-4">
        {r.status === 'OPEN' && (
          <BigButton full loading={busy} disabled={locked} onClick={onAccept} icon={<CheckCircle2 className="w-6 h-6" aria-hidden="true" />}>
            {tx('accept')}
          </BigButton>
        )}
        {r.status === 'ACCEPTED' && (
          <BigButton full variant="coral" loading={busy} disabled={locked} onClick={onOnTheWay} icon={<Navigation2 className="w-6 h-6" aria-hidden="true" />}>
            {tx('onTheWay')}
          </BigButton>
        )}
        {r.status === 'ON_THE_WAY' && (
          <BigButton full loading={busy} disabled={locked} onClick={onDone} icon={<CheckCircle2 className="w-6 h-6" aria-hidden="true" />}>
            {tx('markDone')}
          </BigButton>
        )}
      </div>
    </article>
  );
};
