import React from 'react';
import { AlertTriangle, BellDot, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { AppNotification } from '../types/community';
import { timeAgo } from '../utils/community';

export const NotificationList: React.FC<{ notifications: AppNotification[]; onChanged?: () => void }> = ({
  notifications,
  onChanged,
}) => {
  const { tx } = useLanguage();

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
    } finally {
      onChanged?.();
    }
  };

  if (notifications.length === 0) {
    return <p className="rounded-2xl bg-white border-2 border-brand-line px-4 py-4 text-lg text-brand-muted">{tx('noNotifications')}</p>;
  }
  return (
    <ul className="space-y-2 max-h-80 overflow-y-auto" aria-label={tx('notifications')}>
      {notifications.slice(0, 20).map((n) => {
        const sos = n.type.startsWith('SOS');
        return (
          <li
            key={n.notification_id}
            className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3 ${
              sos ? 'bg-brand-sosSoft border-brand-sos' : n.is_read ? 'bg-white border-brand-line' : 'bg-white border-brand-forest'
            }`}
          >
            {sos ? (
              <AlertTriangle className="w-6 h-6 text-brand-sos shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <BellDot className="w-6 h-6 text-brand-forest shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-lg break-words ${n.is_read ? 'text-brand-muted' : 'font-semibold text-brand-ink'}`}>{n.message}</p>
              <p className="text-sm text-brand-muted">{timeAgo(n.created_at, tx)}</p>
            </div>
            {!n.is_read && (
              <button
                type="button"
                onClick={() => markRead(n.notification_id)}
                aria-label={tx('acknowledge')}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-brand-sage text-brand-forest flex items-center justify-center cursor-pointer"
              >
                <Check className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};
