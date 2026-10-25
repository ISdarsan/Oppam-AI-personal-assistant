import { Language } from '../types';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function isToday(dateStr: string): boolean {
  return dateStr === getTodayDateString();
}

export function isOverdue(dateStr: string, timeStr: string): boolean {
  const today = getTodayDateString();
  const nowTime = getCurrentTimeString();
  if (dateStr < today) return true;
  if (dateStr === today && timeStr < nowTime) return true;
  return false;
}

export function formatFriendlyDate(dateStr: string, lang: Language): string {
  if (dateStr === getTodayDateString()) {
    return lang === 'ml' ? 'ഇന്ന്' : 'Today';
  }
  
  // Calculate tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  if (dateStr === tomorrowStr) {
    return lang === 'ml' ? 'നാളെ' : 'Tomorrow';
  }

  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString(lang === 'ml' ? 'ml-IN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatFriendlyTime(timeStr: string, lang: Language): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const formattedMinutes = String(m).padStart(2, '0');

    if (lang === 'ml') {
      let timePrefix = '';
      if (h >= 4 && h < 12) timePrefix = 'രാവിലെ';
      else if (h >= 12 && h < 16) timePrefix = 'ഉച്ചയ്ക്ക്';
      else if (h >= 16 && h < 19) timePrefix = 'വൈകുന്നേരം';
      else timePrefix = 'രാത്രി';
      return `${timePrefix} ${hour12}:${formattedMinutes}`;
    }

    return `${hour12}:${formattedMinutes} ${period}`;
  } catch {
    return timeStr;
  }
}
