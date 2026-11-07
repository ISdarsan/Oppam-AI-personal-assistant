import React from 'react';
import { Check, UserRound } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { CommunityRequest } from '../types/community';
import { CATEGORY_LABEL, STATUS_LABEL, categoryIcon, shortRef } from '../utils/community';

const STEPS = ['OPEN', 'ACCEPTED', 'ON_THE_WAY', 'COMPLETED'] as const;

/** Shows where one help request is: 4 labelled steps, current status in words, and the assigned helper. */
export const RequestTracker: React.FC<{ request: CommunityRequest }> = ({ request }) => {
  const { tx } = useLanguage();
  const cancelled = request.status === 'CANCELLED';
  const idx = cancelled ? -1 : STEPS.indexOf(request.status as (typeof STEPS)[number]);
  const stepLabels = [tx('stepSent'), tx('stepAccepted'), tx('stepOnWay'), tx('stepDone')];

  return (
    <section
      className="bg-white rounded-3xl border-2 border-brand-line p-5 sm:p-6 shadow-sm"
      aria-label={`${request.title}: ${tx(STATUS_LABEL[request.status])}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-sage text-brand-forest flex items-center justify-center shrink-0">
          {categoryIcon(request.category)}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-brand-ink break-words">{request.title}</h3>
          <p className="text-base text-brand-muted">
            {tx('refLabel')}: <span className="font-bold tracking-wider">{shortRef(request.request_id)}</span>
          </p>
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`mt-4 text-xl font-bold ${cancelled ? 'text-brand-muted' : 'text-brand-forest'}`}
      >
        {tx(STATUS_LABEL[request.status])}
      </p>

      {!cancelled && (
        <ol className="mt-4 space-y-0" aria-hidden="true">
          {STEPS.map((s, i) => {
            const done = i <= idx;
            const current = i === idx;
            return (
              <li key={s} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors duration-300 ${
                      done ? 'bg-brand-forest border-brand-forest text-white' : 'bg-white border-brand-line text-brand-muted'
                    } ${current ? 'ring-4 ring-brand-sage' : ''}`}
                  >
                    {done ? <Check className="w-5 h-5" strokeWidth={3} /> : <span className="text-sm font-bold">{i + 1}</span>}
                  </span>
                  {i < STEPS.length - 1 && <span className={`w-0.5 flex-1 min-h-[14px] ${i < idx ? 'bg-brand-forest' : 'bg-brand-line'}`} />}
                </div>
                <span className={`pb-3 pt-1 text-lg leading-tight ${current ? 'font-bold text-brand-ink' : done ? 'text-brand-ink' : 'text-brand-muted'}`}>
                  {stepLabels[i]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-brand-ivory px-4 py-3">
        <UserRound className="w-6 h-6 text-brand-forest shrink-0" aria-hidden="true" />
        <p className="text-lg text-brand-ink">
          {request.helper_name ? (
            <>
              {tx('helperLabel')}: <span className="font-bold">{request.helper_name}</span>
            </>
          ) : cancelled ? (
            '—'
          ) : (
            tx('waitingHelper')
          )}
        </p>
      </div>
      <span className="sr-only">{tx(CATEGORY_LABEL[request.category])}</span>
    </section>
  );
};
