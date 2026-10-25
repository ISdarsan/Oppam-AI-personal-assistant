import { Language } from '../types';

export function triggerHapticFeedback(pattern: number | number[] = 50): void {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibrate not permitted or supported
    }
  }
}

export function cleanPhoneNumber(phone: string): string {
  // Strip non-digits except leading +
  return phone.replace(/[^\d+]/g, '');
}

export function makePhoneCall(phone: string): void {
  triggerHapticFeedback(80);
  const cleaned = cleanPhoneNumber(phone);
  window.location.href = `tel:${cleaned}`;
}

export function sendSMSMessage(phone: string, message: string): void {
  triggerHapticFeedback(60);
  const cleaned = cleanPhoneNumber(phone);
  // Compatible with both iOS (uses &) and Android (uses ?)
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  window.location.href = `sms:${cleaned}${separator}body=${encodeURIComponent(message)}`;
}

export function openWhatsAppMessage(phone: string, message: string): void {
  triggerHapticFeedback(60);
  let cleaned = cleanPhoneNumber(phone);
  // Remove leading + for wa.me link
  cleaned = cleaned.replace(/^\+/, '');
  window.open(`https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(message)}`, '_blank');
}

export async function shareHelpNotice(title: string, message: string): Promise<boolean> {
  triggerHapticFeedback(60);
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({
        title,
        text: message,
      });
      return true;
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.warn('Share error:', e);
      }
      return false;
    }
  }
  return false;
}

export function getPreparedHelpMessage(contactName: string, lang: Language): string {
  if (lang === 'ml') {
    return `നമസ്കാരം ${contactName}, എനിക്ക് ഒരു ചെറിയ സഹായം വേണമായിരുന്നു. സൗകര്യപ്പെടുമ്പോൾ എന്നെ ഒന്ന് തിരിച്ചുവിളിക്കാമോ?`;
  }
  if (lang === 'es') {
    return `Hola ${contactName}, necesito una pequeña ayuda. ¿Podrías llamarme cuando tengas un momento libre?`;
  }
  if (lang === 'fr') {
    return `Bonjour ${contactName}, j'ai besoin d'un peu d'aide. Peux-tu me rappeler dès que tu as un moment ?`;
  }
  if (lang === 'de') {
    return `Hallo ${contactName}, ich brauche kurz Hilfe. Kannst du mich bitte zurückrufen, wenn du Zeit hast?`;
  }
  if (lang === 'ar') {
    return `مرحباً ${contactName}، أحتاج إلى مساعدة بسيطة. هل يمكنك الاتصال بي عندما يتوفر لديك وقت؟`;
  }
  if (lang === 'zh') {
    return `您好 ${contactName}，我需要一点帮助，方便时请回个电话给我，谢谢。`;
  }
  if (lang === 'ja') {
    return `こんにちは ${contactName}さん、少し助けてほしいことがあります。時間ができたらお電話をいただけますか？`;
  }
  return `Hello ${contactName}, I need a little help. Could you please give me a quick call when you have a moment?`;
}

export function getEmergencySOSMessage(userName: string, lang: Language): string {
  const namePrefix = userName ? `[${userName}] ` : '';
  if (lang === 'ml') {
    return `അടിയന്തിര സന്ദേശം: ${namePrefix}എനിക്ക് അടിയന്തിര സഹായം വേണം! ദയവായി എന്നെ ഉടൻ തന്നെ ഫോണിൽ തിരിച്ചുവിളിക്കൂ.`;
  }
  if (lang === 'es') {
    return `EMERGENCIA: ${namePrefix}¡Necesito ayuda urgente! Por favor, llámame de inmediato.`;
  }
  if (lang === 'fr') {
    return `URGENCE : ${namePrefix}J'ai besoin d'une aide urgente ! Merci de m'appeler tout de suite.`;
  }
  if (lang === 'de') {
    return `NOTFALL: ${namePrefix}Ich brauche dringend Hilfe! Bitte rufe mich sofort an.`;
  }
  if (lang === 'ar') {
    return `طوارئ: ${namePrefix}أحتاج إلى مساعدة عاجلة! يرجى الاتصال بي فوراً.`;
  }
  if (lang === 'zh') {
    return `紧急求助：${namePrefix}我需要紧急协助！请立刻给我回电！`;
  }
  if (lang === 'ja') {
    return `緊急：${namePrefix}至急助けが必要です！すぐに電話をかけてください！`;
  }
  return `EMERGENCY: ${namePrefix}I need immediate assistance! Please call me right away.`;
}
