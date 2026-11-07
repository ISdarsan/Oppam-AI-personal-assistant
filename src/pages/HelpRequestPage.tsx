import React, { useEffect, useState } from 'react';
import { ArrowLeft, Mic, Pencil, Send, Square, Volume2, CheckCircle2, HandHeart, Pill, ShoppingBasket, Stethoscope, Car, Landmark } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSarvamAudioRecorder } from '../hooks/useSarvamAudioRecorder';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { usePolling } from '../hooks/usePolling';
import { BigButton } from '../components/ui/BigButton';
import { RequestTracker } from '../components/RequestTracker';
import { ApiError, api } from '../services/api';
import { CommunityRequest, HelpCategory, HelpDraft, HelpPriority, InterpretRequestResult } from '../types/community';
import { CATEGORY_LABEL, PRIORITY_LABEL } from '../utils/community';
import type { KoodeKey } from '../i18n/koodeStrings';

type Step = 'category' | 'describe' | 'review' | 'sent';

const MAIN_CATEGORIES: { id: HelpCategory; label: KoodeKey; icon: React.ReactNode }[] = [
  { id: 'medicine', label: 'catMedicine', icon: <Pill className="w-10 h-10" aria-hidden="true" /> },
  { id: 'grocery', label: 'catGrocery', icon: <ShoppingBasket className="w-10 h-10" aria-hidden="true" /> },
  { id: 'hospital_assistance', label: 'catHospital', icon: <Stethoscope className="w-10 h-10" aria-hidden="true" /> },
  { id: 'transportation', label: 'catTransport', icon: <Car className="w-10 h-10" aria-hidden="true" /> },
  { id: 'bank', label: 'catBank', icon: <Landmark className="w-10 h-10" aria-hidden="true" /> },
  { id: 'other', label: 'catOther', icon: <HandHeart className="w-10 h-10" aria-hidden="true" /> },
];
const ALL_CATEGORIES = Object.keys(CATEGORY_LABEL) as HelpCategory[];
const PRIORITIES: HelpPriority[] = ['low', 'normal', 'high', 'urgent'];

interface Props {
  initialText?: string;
  onHome: () => void;
}

export const HelpRequestPage: React.FC<Props> = ({ initialText = '', onHome }) => {
  const { tx, language, settings } = useLanguage();
  const { speak, stop } = useSpeechSynthesis(settings.speechRate);
  const [step, setStep] = useState<Step>(initialText ? 'describe' : 'category');
  const [chosen, setChosen] = useState<HelpCategory | null>(null);
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<InterpretRequestResult | null>(null);
  const [draft, setDraft] = useState<HelpDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<'interpret' | 'create' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CommunityRequest | null>(null);

  const rec = useSarvamAudioRecorder(language, (spoken) => setText(spoken));
  useEffect(() => {
    if (rec.transcript) setText(rec.transcript);
  }, [rec.transcript]);
  useEffect(() => () => stop(), [stop]);

  // Live status for the request we just created.
  const live = usePolling(() => api.listRequests(), 5000);
  const current = created ? live.data?.requests.find((r) => r.request_id === created.request_id) ?? created : null;

  const pickCategory = (c: HelpCategory) => {
    setChosen(c);
    setStep('describe');
  };

  const interpret = async () => {
    const input = text.trim() || (chosen ? tx(CATEGORY_LABEL[chosen]) : '');
    if (!input) return;
    if (rec.isRecording) rec.stopRecording();
    setBusy('interpret');
    setError(null);
    try {
      const r = await api.interpretRequest(input, language);
      // The senior's explicit category tile wins over the model's guess (except the generic "other").
      const d: HelpDraft = { ...r.interpreted, category: chosen && chosen !== 'other' ? chosen : r.interpreted.category };
      setResult(r);
      setDraft(d);
      setEditing(false);
      setStep('review');
      if (settings.autoSpeak) speak(tx('confirmQ'), language);
    } catch (e) {
      setError(e instanceof ApiError && e.code !== 'CONNECTION_ERROR' ? e.message : tx('offlineHint'));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    if (!draft || busy) return;
    setBusy('create');
    setError(null);
    try {
      // Only now, after the senior pressed "Yes", is a real request created.
      const r = await api.createRequest(draft);
      setCreated(r);
      setStep('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : tx('errorGeneric'));
    } finally {
      setBusy(null);
    }
  };

  const goBack = () => {
    stop();
    if (step === 'describe') setStep('category');
    else if (step === 'review') setStep('describe');
  };

  const micError = rec.errorMessage;

  return (
    <div className="animate-riseIn space-y-6">
      {step !== 'category' && step !== 'sent' && (
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 min-h-[48px] text-lg font-bold text-brand-forest cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" aria-hidden="true" /> {tx('back')}
        </button>
      )}

      {step === 'category' && (
        <section>
          <h1 className="text-3xl font-bold text-brand-ink mb-5">{tx('helpWhat')}</h1>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {MAIN_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickCategory(c.id)}
                className="min-h-[132px] rounded-3xl bg-white border-2 border-brand-line p-4 flex flex-col items-center justify-center gap-3 text-center text-xl font-bold text-brand-ink shadow-sm hover:border-brand-forest hover:bg-brand-sage active:scale-[0.98] transition cursor-pointer"
              >
                <span className="w-16 h-16 rounded-2xl bg-brand-sage text-brand-forest flex items-center justify-center">{c.icon}</span>
                {tx(c.label)}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'describe' && (
        <section className="space-y-5">
          <h1 className="text-3xl font-bold text-brand-ink">{tx('describeTitle')}</h1>
          {chosen && <p className="text-xl font-semibold text-brand-forest">{tx(CATEGORY_LABEL[chosen])}</p>}

          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {rec.isRecording && <span className="absolute inset-0 rounded-full bg-brand-coral animate-pulseRing" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => (rec.isRecording ? rec.stopRecording() : rec.startRecording())}
                disabled={rec.isProcessing}
                aria-label={rec.isRecording ? tx('stop') : tx('speak')}
                className={`relative w-28 h-28 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60 cursor-pointer ${
                  rec.isRecording ? 'bg-brand-sos' : 'bg-brand-coral hover:bg-brand-coralDark'
                }`}
              >
                {rec.isRecording ? <Square className="w-10 h-10" aria-hidden="true" /> : <Mic className="w-12 h-12" aria-hidden="true" />}
              </button>
            </div>
            <p role="status" aria-live="polite" className="text-xl font-bold text-brand-ink text-center min-h-[2rem]">
              {rec.isRecording ? tx('listening') : rec.isProcessing ? tx('processing') : tx('speak')}
            </p>
            {micError && (
              <p role="alert" className="text-center rounded-2xl bg-brand-coralSoft border-2 border-brand-coral px-4 py-3 text-lg text-brand-coralDark">
                {tx('micDenied')} <span className="block text-base opacity-80">{micError}</span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="help-text" className="sr-only">{tx('describeTitle')}</label>
            <textarea
              id="help-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={1500}
              placeholder={tx('describePlaceholder')}
              className="w-full rounded-2xl border-2 border-brand-line bg-white p-4 text-xl text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-forest"
            />
          </div>

          {error && <p role="alert" className="rounded-2xl bg-brand-sosSoft border-2 border-brand-sos px-4 py-3 text-lg text-brand-sos font-semibold">{error}</p>}

          <BigButton
            full
            loading={busy === 'interpret'}
            disabled={!text.trim() && !chosen}
            onClick={interpret}
            icon={<Send className="w-6 h-6" aria-hidden="true" />}
          >
            {busy === 'interpret' ? tx('processing') : tx('next')}
          </BigButton>
        </section>
      )}

      {step === 'review' && draft && result && (
        <section className="space-y-5">
          <h1 className="text-3xl font-bold text-brand-ink">{tx('reviewTitle')}</h1>
          <p className="rounded-2xl bg-brand-sage px-4 py-3 text-base text-brand-forest">
            {result.source === 'ollama' ? tx('aiNoteOllama') : tx('aiNoteFallback')}
          </p>

          {!editing ? (
            <dl className="bg-white rounded-3xl border-2 border-brand-line p-5 space-y-4">
              <div>
                <dt className="text-base font-semibold text-brand-muted">{tx('titleLabel')}</dt>
                <dd className="text-2xl font-bold text-brand-ink break-words">{draft.title}</dd>
              </div>
              <div>
                <dt className="text-base font-semibold text-brand-muted">{tx('categoryLabel')}</dt>
                <dd className="text-xl font-semibold text-brand-forest">{tx(CATEGORY_LABEL[draft.category])}</dd>
              </div>
              <div>
                <dt className="text-base font-semibold text-brand-muted">{tx('descLabel')}</dt>
                <dd className="text-xl text-brand-ink break-words">{draft.description}</dd>
              </div>
              <div>
                <dt className="text-base font-semibold text-brand-muted">{tx('priorityLabel')}</dt>
                <dd className="text-xl font-semibold text-brand-ink">{tx(PRIORITY_LABEL[draft.priority])}</dd>
              </div>
            </dl>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-brand-forest p-5 space-y-4">
              <Field label={tx('titleLabel')} id="ed-title">
                <input id="ed-title" value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="w-full min-h-[52px] rounded-xl border-2 border-brand-line px-3 text-xl" />
              </Field>
              <Field label={tx('categoryLabel')} id="ed-cat">
                <select id="ed-cat" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as HelpCategory })} className="w-full min-h-[52px] rounded-xl border-2 border-brand-line px-3 text-xl bg-white">
                  {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{tx(CATEGORY_LABEL[c])}</option>)}
                </select>
              </Field>
              <Field label={tx('descLabel')} id="ed-desc">
                <textarea id="ed-desc" rows={3} value={draft.description} maxLength={1000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="w-full rounded-xl border-2 border-brand-line p-3 text-xl" />
              </Field>
              <Field label={tx('priorityLabel')} id="ed-pri">
                <select id="ed-pri" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as HelpPriority })} className="w-full min-h-[52px] rounded-xl border-2 border-brand-line px-3 text-xl bg-white">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{tx(PRIORITY_LABEL[p])}</option>)}
                </select>
              </Field>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-bold text-brand-ink">{tx('confirmQ')}</p>
            <button type="button" onClick={() => speak(tx('confirmQ'), language)} aria-label={tx('confirmQ')} className="shrink-0 min-w-[48px] min-h-[48px] rounded-2xl bg-brand-sage text-brand-forest flex items-center justify-center cursor-pointer">
              <Volume2 className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          {error && <p role="alert" className="rounded-2xl bg-brand-sosSoft border-2 border-brand-sos px-4 py-3 text-lg text-brand-sos font-semibold">{error}</p>}

          <div className="grid gap-3">
            <BigButton full loading={busy === 'create'} disabled={!draft.title.trim()} onClick={confirm} icon={<CheckCircle2 className="w-6 h-6" aria-hidden="true" />}>
              {tx('yesRequest')}
            </BigButton>
            <BigButton full variant="outline" disabled={busy !== null} onClick={() => setEditing((e) => !e)} icon={<Pencil className="w-6 h-6" aria-hidden="true" />}>
              {tx('editBtn')}
            </BigButton>
          </div>
        </section>
      )}

      {step === 'sent' && current && (
        <section className="space-y-5">
          <div className="text-center">
            <span className="mx-auto w-20 h-20 rounded-full bg-brand-forest text-white flex items-center justify-center animate-riseIn">
              <CheckCircle2 className="w-12 h-12" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-3xl font-bold text-brand-ink">{tx('sentTitle')}</h1>
          </div>
          <RequestTracker request={current} />
          <div className="rounded-3xl bg-brand-sage p-5">
            <h2 className="text-xl font-bold text-brand-forest">{tx('nextTitle')}</h2>
            <p className="mt-1 text-lg text-brand-ink">{tx('nextBody')}</p>
          </div>
          <BigButton full onClick={onHome}>{tx('goHome')}</BigButton>
        </section>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; id: string; children: React.ReactNode }> = ({ label, id, children }) => (
  <div>
    <label htmlFor={id} className="block text-base font-semibold text-brand-muted mb-1">{label}</label>
    {children}
  </div>
);
