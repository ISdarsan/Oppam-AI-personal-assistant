import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Siren } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePolling } from '../hooks/usePolling';
import { BigButton } from '../components/ui/BigButton';
import { api } from '../services/api';
import { SosEvent } from '../types/community';

/** Two-step SOS: a big button, then an explicit confirmation, so a stray tap never alerts the family. */
export const SOSPage: React.FC<{ onHome: () => void }> = ({ onHome }) => {
  const { tx } = useLanguage();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SosEvent | null>(null);
  const live = usePolling(() => api.listSos(), 5000);
  const mine = sent ? live.data?.events.find((e) => e.event_id === sent.event_id) ?? sent : null;

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setSent(await api.triggerSos());
      setAsking(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : tx('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  if (mine) {
    return (
      <div className="space-y-5 animate-riseIn text-center">
        <span className="mx-auto w-24 h-24 rounded-full bg-brand-forest text-white flex items-center justify-center">
          <CheckCircle2 className="w-14 h-14" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-bold text-brand-ink">{tx('sosDoneTitle')}</h1>
        <p role="status" className="rounded-3xl bg-white border-2 border-brand-line p-5 text-xl text-brand-ink text-left">
          {tx('sosDoneBody')}
        </p>
        <p className="text-xl font-semibold text-brand-forest">
          {mine.status === 'ACKNOWLEDGED'
            ? tx('sosAcked')
            : (mine.notified_family_count ?? 0) === 0
              ? tx('sosNoFamily')
              : ''}
        </p>
        <BigButton full onClick={onHome}>{tx('goHome')}</BigButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-riseIn">
      <h1 className="text-3xl font-bold text-brand-ink">{tx('sosTitle')}</h1>
      {!asking ? (
        <>
          <p className="text-xl text-brand-muted">{tx('cardSosDesc')}</p>
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="w-full min-h-[200px] rounded-[2rem] bg-brand-sos text-white flex flex-col items-center justify-center gap-3 shadow-xl hover:bg-red-900 active:scale-[0.98] transition cursor-pointer"
          >
            <Siren className="w-20 h-20" aria-hidden="true" />
            <span className="text-3xl font-bold">{tx('cardSos')}</span>
          </button>
        </>
      ) : (
        <div role="alertdialog" aria-labelledby="sos-q" className="rounded-3xl bg-brand-sosSoft border-4 border-brand-sos p-6 space-y-5">
          <h2 id="sos-q" className="text-2xl sm:text-3xl font-bold text-brand-sos [overflow-wrap:anywhere]">{tx('sosAsk')}</h2>
          {error && <p role="alert" className="text-lg font-semibold text-brand-sos">{error}</p>}
          <BigButton full variant="sos" loading={busy} onClick={send} icon={<Siren className="w-7 h-7" aria-hidden="true" />}>
            {tx('sosYes')}
          </BigButton>
          <BigButton full variant="outline" disabled={busy} onClick={() => setAsking(false)} icon={<ArrowLeft className="w-6 h-6" aria-hidden="true" />}>
            {tx('sosNo')}
          </BigButton>
        </div>
      )}
    </div>
  );
};
