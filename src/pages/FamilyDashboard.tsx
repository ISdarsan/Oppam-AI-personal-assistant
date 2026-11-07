import React, { useState } from 'react';
import { AlertTriangle, Link2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePolling } from '../hooks/usePolling';
import { RoleShell } from '../components/RoleShell';
import { BigButton } from '../components/ui/BigButton';
import { ApiError, api } from '../services/api';
import { CATEGORY_LABEL, STATUS_LABEL, categoryIcon, timeAgo } from '../utils/community';

export const FamilyDashboard: React.FC = () => {
  const { tx } = useLanguage();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const links = usePolling(() => api.linkedConnections(), 6000);
  const updates = usePolling(() => api.familyUpdates(), 5000);

  const approved = (links.data?.connections ?? []).filter((c) => c.status === 'APPROVED');
  const pending = (links.data?.connections ?? []).filter((c) => c.status === 'PENDING');
  const u = updates.data;
  const nameOf = (id: string) => u?.seniors.find((s) => s.senior_id === id)?.name ?? '';
  const sos = u?.sos_events ?? [];
  const activeSos = sos.filter((e) => e.status === 'ACTIVE');

  const run = async (key: string, fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(key);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof ApiError && e.code === 'INVALID_CODE' ? e.message : e instanceof Error ? e.message : tx('errorGeneric'));
    } finally {
      setBusy(null);
      await Promise.all([links.reload(), updates.reload()]);
    }
  };

  return (
    <RoleShell title={tx('famTitle')}>
      {activeSos.length > 0 && (
        <section aria-live="assertive" className="mb-5 space-y-3">
          {activeSos.map((e) => (
            <div key={e.event_id} role="alert" className="rounded-3xl bg-brand-sos text-white p-5 shadow-lg animate-riseIn">
              <p className="flex items-center gap-2 text-2xl font-bold">
                <AlertTriangle className="w-8 h-8" aria-hidden="true" /> {tx('sosAlerts')}
              </p>
              <p className="mt-2 text-xl">
                <span className="font-bold">{nameOf(e.senior_id)}</span>
                {e.message ? `: ${e.message}` : ''}
              </p>
              <p className="text-base opacity-90">{timeAgo(e.created_at, tx)}</p>
              <BigButton
                variant="outline"
                className="mt-4"
                loading={busy === e.event_id}
                disabled={busy !== null}
                onClick={() => run(e.event_id, () => api.acknowledgeSos(e.event_id))}
              >
                {tx('acknowledge')}
              </BigButton>
            </div>
          ))}
        </section>
      )}

      {notice && (
        <p role="alert" className="mb-4 rounded-2xl bg-brand-coralSoft border-2 border-brand-coral px-4 py-3 text-lg font-semibold text-brand-coralDark">
          {notice}
        </p>
      )}

      {approved.length === 0 && (
        <section className="bg-white rounded-3xl border-2 border-brand-line p-5">
          <h2 className="text-xl font-bold text-brand-ink mb-3">{pending.length ? tx('waitingApproval') : tx('connect')}</h2>
          {pending.map((c) => (
            <p key={c.connection_id} className="mb-3 rounded-2xl bg-brand-ivory px-4 py-3 text-lg">
              {c.senior_name} — <span className="font-semibold">{tx('waitingApproval')}</span>
            </p>
          ))}
          {pending.length === 0 && <p className="mb-3 text-lg text-brand-muted">{tx('noLinked')}</p>}
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              if (code.trim()) void run('link', async () => { await api.linkWithCode(code.trim()); setCode(''); });
            }}
          >
            <label htmlFor="fam-code" className="block text-lg font-bold mb-2">{tx('enterCode')}</label>
            <input
              id="fam-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              autoCapitalize="characters"
              className="w-full min-h-[56px] rounded-2xl border-2 border-brand-line bg-white px-4 text-2xl tracking-[0.3em] font-bold text-brand-ink uppercase focus:border-brand-forest"
            />
            <BigButton type="submit" full className="mt-3" loading={busy === 'link'} icon={<Link2 className="w-6 h-6" aria-hidden="true" />}>
              {tx('connect')}
            </BigButton>
          </form>
        </section>
      )}

      {approved.length > 0 && (
        <>
          <section className="bg-white rounded-3xl border-2 border-brand-line p-5 mb-5">
            <ul className="space-y-1">
              {approved.map((c) => (
                <li key={c.connection_id} className="flex items-center gap-3 text-xl font-bold text-brand-ink">
                  <ShieldCheck className="w-6 h-6 text-brand-forest" aria-hidden="true" /> {c.senior_name}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-base text-brand-muted">{tx('privacyNote')}</p>
          </section>

          <h2 className="text-2xl font-bold text-brand-ink mb-3">{tx('recentRequests')}</h2>
          {(u?.requests ?? []).length === 0 ? (
            <p className="rounded-2xl bg-white border-2 border-brand-line px-4 py-4 text-lg text-brand-muted">{tx('noFamRequests')}</p>
          ) : (
            <ul className="space-y-3">
              {u!.requests.map((r) => (
                <li key={r.request_id} className="bg-white rounded-3xl border-2 border-brand-line p-4 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-sage text-brand-forest flex items-center justify-center shrink-0">
                    {categoryIcon(r.category, 'w-6 h-6')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-brand-ink break-words">{r.title}</p>
                    <p className="text-base text-brand-muted">
                      {nameOf(r.senior_id)} · {tx(CATEGORY_LABEL[r.category])}
                    </p>
                    <p className="text-lg font-semibold text-brand-forest">
                      {tx(STATUS_LABEL[r.status])}
                      {r.helper_name ? ` — ${r.helper_name}` : ''}
                    </p>
                    <p className="text-sm text-brand-muted">{timeAgo(r.updated_at, tx)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h2 className="text-2xl font-bold text-brand-ink mt-6 mb-3">{tx('sosAlerts')}</h2>
          {sos.length === 0 ? (
            <p className="rounded-2xl bg-white border-2 border-brand-line px-4 py-4 text-lg text-brand-muted">{tx('noSos')}</p>
          ) : (
            <ul className="space-y-3">
              {sos.map((e) => (
                <li key={e.event_id} className="bg-white rounded-3xl border-2 border-brand-line p-4">
                  <p className="text-lg font-bold">{nameOf(e.senior_id)} · {timeAgo(e.created_at, tx)}</p>
                  {e.message && <p className="text-lg text-brand-ink break-words">{e.message}</p>}
                  <p className={`text-base font-semibold ${e.status === 'ACTIVE' ? 'text-brand-sos' : 'text-brand-forest'}`}>
                    {e.status === 'ACTIVE' ? tx('sosAlerts') : tx('acked')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {(updates.error || links.error) && !u && (
        <p role="alert" className="mt-4 text-lg text-brand-sos">{tx('offlineHint')}</p>
      )}
    </RoleShell>
  );
};
