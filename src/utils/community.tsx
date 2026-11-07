import React from 'react';
import { HandHeart, Landmark, Pill, ShoppingBasket, Stethoscope, Car, Building2, Store } from 'lucide-react';
import { HelpCategory, HelpPriority, RequestStatus } from '../types/community';
import type { KoodeKey } from '../i18n/koodeStrings';

export const CATEGORY_LABEL: Record<HelpCategory, KoodeKey> = {
  medicine: 'catMedicine',
  grocery: 'catGrocery',
  hospital_assistance: 'catHospital',
  transportation: 'catTransport',
  ration_shop: 'catGrocery',
  bank: 'catBank',
  government_office: 'catOther',
  other: 'catOther',
};

export const categoryIcon = (c: HelpCategory, cls = 'w-8 h-8'): React.ReactNode => {
  const p = { className: cls, strokeWidth: 2.2, 'aria-hidden': true } as const;
  switch (c) {
    case 'medicine':
      return <Pill {...p} />;
    case 'grocery':
      return <ShoppingBasket {...p} />;
    case 'hospital_assistance':
      return <Stethoscope {...p} />;
    case 'transportation':
      return <Car {...p} />;
    case 'ration_shop':
      return <Store {...p} />;
    case 'bank':
      return <Landmark {...p} />;
    case 'government_office':
      return <Building2 {...p} />;
    default:
      return <HandHeart {...p} />;
  }
};

export const STATUS_LABEL: Record<RequestStatus, KoodeKey> = {
  OPEN: 'stOPEN',
  ACCEPTED: 'stACCEPTED',
  ON_THE_WAY: 'stON_THE_WAY',
  COMPLETED: 'stCOMPLETED',
  CANCELLED: 'stCANCELLED',
};

export const PRIORITY_LABEL: Record<HelpPriority, KoodeKey> = {
  low: 'prLow',
  normal: 'prNormal',
  high: 'prHigh',
  urgent: 'prUrgent',
};

/** Backend timestamps are UTC without a trailing "Z". */
export const parseUtc = (ts: string): Date => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(ts) ? ts : `${ts}Z`);

export const timeAgo = (ts: string, tx: (k: KoodeKey) => string): string => {
  const mins = Math.max(0, Math.round((Date.now() - parseUtc(ts).getTime()) / 60000));
  if (mins < 1) return tx('justNow');
  if (mins < 60) return `${mins} ${tx('minAgo')}`;
  return `${Math.round(mins / 60)} ${tx('hrAgo')}`;
};

/** Request ids look like req_ab12cd34ef; show a short human-friendly reference. */
export const shortRef = (id: string): string => id.replace(/^req_/, '').slice(0, 6).toUpperCase();
