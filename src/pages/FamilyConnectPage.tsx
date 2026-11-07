import React, { useState } from 'react';
import { KeyRound, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePolling } from '../hooks/usePolling';
import { BigButton } from '../components/ui/BigButton';
import { api } from '../services/api';
import { ContactsPage } from './ContactsPage';

export const FamilyConnectPage: React.FC = () => {
  const { tx } = useLanguage();
  const { data, error, reload } = usePolling(() => api.linkedConnections(), 5000);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const conns = data?.connections ?? [];
  const waitingCode = conns.filter((c) => c.status === 'INVITED');
  const pending = conns.filter((c) => c.status === 'PENDING');
  const approved = conns.filter((c) => c.status === 'APPROVED');

  const run = async (key: string, fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(key);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : tx('errorGeneric'));
    } finally {
      setBusy(null);
      await reload();
    }
  };

  return (
    <div className="space-y-6 animate-riseIn">
      <h1 className="text-3xl font-bold text-brand-ink">{tx('familyTitle')}</h1>
      <p className="flex items-start gap-3 rounded-3xl bg-brand-sage p-5 text-lg text-brand-ink">
        <ShieldCheck className="w-7 h-7 text-brand-forest shrink-0 mt-0.5" aria-hidden="true" />
        <span>{tx('familyExplain')}</span>
      </p>

      {(notice || (error && !data)) && (
        <p role="alert" className="rounded-2xl bg-brand-sosSoft border-2 border-brand-sos px-4 py-3 text-lg text-brand-sos font-semibold">
          {notice ?? tx('offlineHint')}
        </p>
      )}

      <section className="bg-white rounded-3xl border-2 border-brand-line p-5 space-y-4">
        {waitingCode.length > 0 && (
          <div className="text-center">
            <p className="text-lg text-brand-muted">{tx('yourCode')}</p>
            <p className="text-5xl font-bold tracking-[0.25em] text-brand-forest my-2" aria-label={waitingCode[0].code ?? ''}>
              {waitingCode[0].code}
            </p>
            <p className="text-lg text-brand-ink">{tx('shareCode')}</p>
          </div>
        )}
        <BigButton full variant={waitingCode.length ? 'outline' : 'forest'} loading={busy === 'code'} icon={<KeyRound className="w-6 h-6" aria-hidden="true" />} onClick={() => run('code', () => api.createInvitation())}>
          {tx('makeCode')}
        </BigButton>
      </section>

      {pending.length > 0 && (
        <section aria-labelledby="pend">
          <h2 id="pend" className="text-2xl font-bold text-brand-ink mb-3">{tx('pendingTitle')}</h2>
          <ul className="space-y-3">
            {pending.map((c) => (
              <li key={c.connection_id} className="bg-white rounded-3xl border-2 border-brand-coral p-5">
                <p className="text-xl font-bold text-brand-ink">
                  {c.family_name} <span className="font-normal text-brand-muted">{tx('wantsToConnect')}</span>
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <BigButton loading={busy === `a${c.connection_id}`} disabled={busy !== null} icon={<UserCheck className="w-6 h-6" aria-hidden="true" />} onClick={() => run(`a${c.connection_id}`, () => api.approveLink(c.connection_id, true))}>
                    {tx('approve')}
                  </BigButton>
                  <BigButton variant="outline" loading={busy === `d${c.connection_id}`} disabled={busy !== null} onClick={() => run(`d${c.connection_id}`, () => api.approveLink(c.connection_id, false))}>
                    {tx('decline')}
                  </BigButton>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="conn">
        <h2 id="conn" className="text-2xl font-bold text-brand-ink mb-3">{tx('connectedTitle')}</h2>
        {approved.length === 0 ? (
          <p className="rounded-2xl bg-white border-2 border-dashed border-brand-sageDark px-4 py-5 text-lg text-brand-muted">{tx('noConnected')}</p>
        ) : (
          <ul className="space-y-3">
            {approved.map((c) => (
              <li key={c.connection_id} className="bg-white rounded-3xl border-2 border-brand-line p-5 flex items-center justify-between gap-3">
                <span className="flex items-center gap-3 text-xl font-bold text-brand-ink min-w-0">
                  <ShieldCheck className="w-7 h-7 text-brand-forest shrink-0" aria-hidden="true" />
                  <span className="break-words">{c.family_name}</span>
                </span>
                <BigButton variant="outline" loading={busy === `r${c.connection_id}`} disabled={busy !== null} icon={<UserX className="w-5 h-5" aria-hidden="true" />} onClick={() => run(`r${c.connection_id}`, () => api.revokeLink(c.connection_id))}>
                  {tx('revoke')}
                </BigButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ContactsPage />
    </div>
  );
};
