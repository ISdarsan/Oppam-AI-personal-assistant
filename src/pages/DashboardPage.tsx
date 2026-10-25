import React, { useState, useEffect } from 'react';
import {
  Mic,
  PlusCircle,
  PhoneCall,
  MessageSquare,
  FileQuestion,
  Calendar,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sun,
  Sunrise,
  Sunset,
  Sparkles,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageView } from '../components/Navigation';
import { storage } from '../services/storage';
import { Contact, Reminder } from '../types';
import { isToday, isOverdue, formatFriendlyTime } from '../utils/dateUtils';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  makePhoneCall,
  openWhatsAppMessage,
  getEmergencySOSMessage,
  getPreparedHelpMessage,
  triggerHapticFeedback,
} from '../utils/communication';

interface DashboardPageProps {
  onNavigate: (page: PageView) => void;
  onOpenAddReminder: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenAddReminder }) => {
  const { language, settings, t } = useLanguage();
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);
  const [primaryContact, setPrimaryContact] = useState<Contact | null>(null);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);

  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    const all = storage.getReminders();
    const todayItems = all.filter((r) => isToday(r.date) || (!r.completed && isOverdue(r.date, r.time)));
    setTodayReminders(todayItems);

    const contacts = storage.getContacts();
    if (contacts.length > 0) {
      // Find primary or take first
      const primary = contacts.find((c) => c.isPrimary) || contacts[0];
      setPrimaryContact(primary);
    }
  };

  const handleToggleReminder = (id: string) => {
    triggerHapticFeedback(50);
    storage.toggleReminder(id);
    loadDashboardData();
  };

  const handleSosClick = () => {
    triggerHapticFeedback([100, 50, 100]);
    setIsSosModalOpen(true);
  };

  const executeSosCall = () => {
    triggerHapticFeedback([150, 80, 150]);
    setIsSosModalOpen(false);
    if (primaryContact) {
      const sosMsg = getEmergencySOSMessage(settings.displayName, language);
      // Initiate phone call and open WhatsApp with emergency message
      makePhoneCall(primaryContact.phone);
      setTimeout(() => {
        openWhatsAppMessage(primaryContact.phone, sosMsg);
      }, 800);
    }
  };

  // Compute greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = t('greetingDefault');
    let Icon = Sun;

    if (hour >= 4 && hour < 12) {
      timeGreeting = t('greetingMorning');
      Icon = Sunrise;
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = t('greetingAfternoon');
      Icon = Sun;
    } else if (hour >= 17) {
      timeGreeting = t('greetingEvening');
      Icon = Sunset;
    }

    const name = settings.displayName ? `, ${settings.displayName}` : '';
    return { text: `${timeGreeting}${name}!`, Icon };
  };

  const { text: greetingText, Icon: GreetingIcon } = getGreeting();

  // Format today's full date
  const todayDateFormatted = new Date().toLocaleDateString(
    language === 'ml' ? 'ml-IN' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* 0. Urgent Emergency SOS Bar */}
      <div className="flex items-center justify-between bg-rose-600 hover:bg-rose-700 text-white p-3.5 sm:p-4 rounded-3xl shadow-md transition-all">
        <div className="flex items-center gap-3 pl-2">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black tracking-wide">
              {t('dashSosBtn')}
            </h3>
            <p className="text-xs sm:text-sm text-rose-100 font-medium">
              {primaryContact
                ? `${primaryContact.name} (${primaryContact.phone})`
                : (language === 'ml' ? 'കുടുംബാംഗങ്ങളിലേക്ക് അടിയന്തിര കോൾ' : 'Quick 1-tap call to family')}
            </p>
          </div>
        </div>
        <button
          onClick={handleSosClick}
          className="bg-white text-rose-700 hover:bg-rose-50 px-5 sm:px-7 py-3 rounded-2xl font-black text-base sm:text-lg min-h-[52px] shadow-sm active:scale-95 transition-transform"
          aria-label={t('dashSosBtn')}
        >
          {t('dashSosBtn')}
        </button>
      </div>

      {/* 1. Greeting & Date Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-sahaaya-primary text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 text-emerald-100 mb-1">
            <GreetingIcon className="w-6 h-6" />
            <span className="text-lg font-medium">{todayDateFormatted}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{greetingText}</h2>
          <p className="text-emerald-100 text-base sm:text-lg mt-1 font-normal">
            {language === 'ml'
              ? 'ഇന്ന് കൂടെ (Koode) നിങ്ങൾക്ക് എന്ത് സഹായമാണ് നൽകേണ്ടത്?'
              : 'How can Koode help you stay safe and comfortable today?'}
          </p>
        </div>

        {/* Quick Call Family Button if contact exists */}
        {primaryContact && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
            <button
              onClick={() => makePhoneCall(primaryContact.phone)}
              className="inline-flex items-center justify-center gap-2 bg-white text-sahaaya-primary hover:bg-emerald-50 px-5 py-3.5 rounded-2xl font-bold text-base sm:text-lg min-h-[52px] shadow-sm transition-transform active:scale-95"
              aria-label={`Call ${primaryContact.name}`}
            >
              <PhoneCall className="w-5 h-5 text-emerald-700" />
              <span>
                {t('dashCallFamilyBtn')} ({primaryContact.name})
              </span>
            </button>
            <button
              onClick={() =>
                openWhatsAppMessage(
                  primaryContact.phone,
                  getPreparedHelpMessage(primaryContact.name, language)
                )
              }
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3.5 rounded-2xl font-bold text-base min-h-[52px] shadow-sm transition-transform active:scale-95"
              aria-label={`WhatsApp ${primaryContact.name}`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>{t('contactsWhatsApp')}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. PWA Install Banner (Shown when app can be installed to phone) */}
      {!isInstalled && (isInstallable || isIOS) && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Download className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-xl font-black text-emerald-950">
                {t('dashInstallTitle')}
              </h4>
              <p className="text-base text-emerald-900 mt-1 max-w-xl">
                {isIOS ? t('dashInstallIos') : t('dashInstallDesc')}
              </p>
            </div>
          </div>
          {isInstallable && (
            <button
              onClick={() => {
                triggerHapticFeedback(60);
                installApp();
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3.5 rounded-2xl font-bold text-base min-h-[52px] shadow-sm active:scale-95 transition-transform flex-shrink-0 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>{t('dashInstallBtn')}</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Main Action Cards: "Talk to Koode" & "Add Reminder" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Talk to Koode card */}
        <button
          onClick={() => {
            triggerHapticFeedback(40);
            onNavigate('assistant');
          }}
          className="flex items-center justify-between p-6 bg-white hover:bg-sahaaya-cream rounded-3xl border-2 border-sahaaya-primary/40 shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.99] text-left group min-h-[96px]"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-sahaaya-primary text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
              <Mic className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-sahaaya-text">
                {t('dashTalkBtn')}
              </h3>
              <p className="text-base text-sahaaya-muted mt-0.5">
                {language === 'ml'
                  ? 'മലയാളത്തിലോ ഇംഗ്ലീഷിലോ സംസാരിക്കാം'
                  : 'Speak or type any question'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-7 h-7 text-sahaaya-primary flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Add Reminder card */}
        <button
          onClick={() => {
            triggerHapticFeedback(40);
            onOpenAddReminder();
          }}
          className="flex items-center justify-between p-6 bg-white hover:bg-sahaaya-cream rounded-3xl border-2 border-sahaaya-border shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.99] text-left group min-h-[96px]"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-sahaaya-accentLight text-sahaaya-primary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-sahaaya-primary/20">
              <PlusCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-sahaaya-text">
                {t('dashAddReminderBtn')}
              </h3>
              <p className="text-base text-sahaaya-muted mt-0.5">
                {language === 'ml'
                  ? 'മരുന്നുകൾ, ആശുപത്രി സമയം'
                  : 'Medicines, visits, phone calls'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-7 h-7 text-sahaaya-primary flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* 4. Today's Reminders Section */}
      <Card className="flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-sahaaya-border pb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-sahaaya-primary" />
            <h3 className="text-2xl font-black text-sahaaya-text">{t('dashTodayTitle')}</h3>
          </div>
          <button
            onClick={() => onNavigate('reminders')}
            className="text-sahaaya-primary hover:text-sahaaya-primaryHover font-bold text-base flex items-center gap-1.5 min-h-[48px] px-2 focus:outline-none focus:ring-2 focus:ring-sahaaya-primary rounded-xl"
          >
            <span>{t('dashAllReminders')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {todayReminders.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center gap-3 bg-sahaaya-bg rounded-2xl p-6 border border-dashed border-sahaaya-border">
            <Sparkles className="w-10 h-10 text-sahaaya-accent" />
            <p className="text-xl font-bold text-sahaaya-text max-w-md">{t('dashNoReminders')}</p>
            <Button
              variant="secondary"
              size="md"
              onClick={onOpenAddReminder}
              icon={<PlusCircle className="w-5 h-5 text-sahaaya-primary" />}
            >
              {t('dashAddReminderBtn')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {todayReminders.map((reminder) => {
              const overdue = isOverdue(reminder.date, reminder.time);
              return (
                <div
                  key={reminder.id}
                  className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                    reminder.completed
                      ? 'bg-gray-50 border-gray-200 opacity-75'
                      : overdue
                      ? 'bg-rose-50/60 border-rose-300'
                      : 'bg-white border-sahaaya-border hover:border-sahaaya-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 mr-3">
                    <button
                      onClick={() => handleToggleReminder(reminder.id)}
                      className="p-2 rounded-xl text-sahaaya-primary hover:bg-sahaaya-cream min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sahaaya-primary flex-shrink-0"
                      aria-label={
                        reminder.completed ? t('remindersMarkPending') : t('remindersMarkDone')
                      }
                    >
                      {reminder.completed ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-8 h-8 text-sahaaya-muted" />
                      )}
                    </button>
                    <div>
                      <p
                        className={`text-xl font-bold ${
                          reminder.completed
                            ? 'line-through text-gray-500'
                            : 'text-sahaaya-text'
                        }`}
                      >
                        {reminder.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-base font-semibold text-sahaaya-muted">
                          {formatFriendlyTime(reminder.time, language)}
                        </span>
                        {reminder.completed && reminder.completedAt && (
                          <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            ✓ {t('completedAtLabel')}{' '}
                            {new Date(reminder.completedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        {reminder.description && (
                          <span className="text-sm text-sahaaya-muted hidden sm:inline">
                            • {reminder.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {reminder.completed ? (
                      <Badge variant="success">{t('remindersStatusCompleted')}</Badge>
                    ) : overdue ? (
                      <Badge variant="danger">{t('remindersStatusOverdue')}</Badge>
                    ) : (
                      <Badge variant="info">{t('remindersStatusToday')}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 5. "Help Me Understand" (Explainer Banner) */}
      <div className="bg-amber-50/80 border-2 border-amber-200/80 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0 border border-amber-300">
            <FileQuestion className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-xl sm:text-2xl font-bold text-amber-950">
              {t('dashExplainBtn')}
            </h4>
            <p className="text-base text-amber-900 mt-1 max-w-lg">
              {language === 'ml'
                ? 'മനസ്സിലാക്കാൻ പ്രയാസമുള്ള സന്ദേശങ്ങളോ അറിയിപ്പുകളോ ഇവിടെ നൽകുക. കൂടെ ലളിതമായി വിശദീകരിച്ചു തരും.'
                : 'Received a confusing SMS, bank notice, or hospital instructions? Koode can break it down in plain words.'}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            triggerHapticFeedback(40);
            onNavigate('explainer');
          }}
          className="border-amber-400 bg-white hover:bg-amber-100 text-amber-950 font-bold flex-shrink-0 shadow-sm"
        >
          {t('dashExplainBtn')}
        </Button>
      </div>

      {/* 6. Emergency SOS Confirmation Modal */}
      <Modal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        title={t('dashSosConfirmTitle')}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg text-sahaaya-text font-medium leading-relaxed">
                {t('dashSosConfirmMsg')}
              </p>
              {primaryContact ? (
                <div className="mt-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                  <p className="text-sm font-semibold text-rose-800">
                    {language === 'ml' ? 'വിളിക്കുന്ന ബന്ധു:' : 'Calling Trusted Contact:'}
                  </p>
                  <p className="text-xl font-black text-rose-950">
                    {primaryContact.name} ({primaryContact.phone})
                  </p>
                </div>
              ) : (
                <p className="text-base font-bold text-rose-700 mt-2">
                  {language === 'ml'
                    ? 'വിശ്വസ്തരായ ബന്ധുക്കളുടെ നമ്പർ ചേർത്തിട്ടില്ല. ദയവായി കുടുംബാംഗങ്ങൾ പേജിൽ നമ്പർ ചേർക്കുക.'
                    : 'No contact configured. Please add a trusted family contact.'}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-sahaaya-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSosModalOpen(false)}
            >
              {t('btnCancel')}
            </Button>
            {primaryContact && (
              <button
                type="button"
                onClick={executeSosCall}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-7 py-3.5 rounded-2xl font-black text-lg min-h-[52px] shadow-md transition-transform active:scale-95"
              >
                <PhoneCall className="w-6 h-6" />
                <span>
                  {language === 'ml' ? 'ഉടൻ വിളിക്കുക & സന്ദേശം അയക്കുക' : 'Call & Send SOS Now'}
                </span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
