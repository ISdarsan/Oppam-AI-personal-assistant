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
  Pill,
  Stethoscope,
  Phone,
  Droplet,
  ClipboardList,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageView } from '../components/Navigation';
import { storage } from '../services/storage';
import { Contact, Reminder, ReminderCategory } from '../types';
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
      const primary = contacts.find((c) => c.isPrimary) || contacts[0];
      setPrimaryContact(primary);
    }
  };

  const handleToggleReminder = (id: string) => {
    triggerHapticFeedback(60);
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
      makePhoneCall(primaryContact.phone);
      setTimeout(() => {
        openWhatsAppMessage(primaryContact.phone, sosMsg);
      }, 800);
    }
  };

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

  const todayDateFormatted = new Date().toLocaleDateString(
    language === 'ml' ? 'ml-IN' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  const getCategoryIcon = (category?: ReminderCategory) => {
    switch (category) {
      case 'medicine':
        return <Pill className="w-5 h-5 text-rose-600" />;
      case 'doctor':
        return <Stethoscope className="w-5 h-5 text-blue-600" />;
      case 'call':
        return <Phone className="w-5 h-5 text-emerald-600" />;
      case 'water':
        return <Droplet className="w-5 h-5 text-cyan-600" />;
      default:
        return <ClipboardList className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* 0. High Visibility Emergency SOS Bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 text-white p-4 sm:p-5 rounded-3xl shadow-lg border-2 border-rose-800">
        <div className="flex items-center gap-3.5 pl-1">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center animate-pulse flex-shrink-0">
            <AlertTriangle className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-wide leading-tight">
              {t('dashSosBtn')}
            </h3>
            <p className="text-sm sm:text-base text-rose-100 font-bold mt-0.5">
              {primaryContact
                ? `${primaryContact.name} (${primaryContact.phone})`
                : (language === 'ml' ? 'കുടുംബാംഗങ്ങളിലേക്ക് അടിയന്തിര കോൾ' : 'Quick 1-tap emergency call')}
            </p>
          </div>
        </div>
        <button
          onClick={handleSosClick}
          className="bg-white hover:bg-rose-50 text-rose-700 px-6 sm:px-8 py-3.5 rounded-2xl font-black text-lg sm:text-xl min-h-[56px] shadow-md active:scale-95 transition-all flex-shrink-0 border-2 border-white/50 cursor-pointer"
          aria-label={t('dashSosBtn')}
        >
          {t('dashSosBtn')}
        </button>
      </div>

      {/* 1. Warm Greeting & Date Banner */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border-2 border-emerald-950/40 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 text-emerald-200 mb-2 font-bold text-lg">
            <GreetingIcon className="w-6 h-6 text-amber-400" />
            <span>{todayDateFormatted}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{greetingText}</h2>
          <p className="text-emerald-100 text-lg sm:text-xl mt-2 font-medium max-w-xl leading-relaxed">
            {language === 'ml'
              ? 'ഇന്ന് കൂടെ (Koode) നിങ്ങൾക്ക് എന്ത് സഹായമാണ് നൽകേണ്ടത്?'
              : 'How can Koode help you stay safe and comfortable today?'}
          </p>
        </div>

        {/* 1-Tap Call Family Button if contact exists */}
        {primaryContact && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
            <button
              onClick={() => {
                triggerHapticFeedback(80);
                makePhoneCall(primaryContact.phone);
              }}
              className="inline-flex items-center justify-center gap-2.5 bg-white text-emerald-950 hover:bg-emerald-50 px-6 py-4 rounded-2xl font-black text-lg sm:text-xl min-h-[58px] shadow-md transition-transform active:scale-95 cursor-pointer border-2 border-white"
              aria-label={`Call ${primaryContact.name}`}
            >
              <PhoneCall className="w-6 h-6 text-emerald-800" strokeWidth={2.5} />
              <span>
                {t('dashCallFamilyBtn')} ({primaryContact.name})
              </span>
            </button>
            <button
              onClick={() => {
                triggerHapticFeedback(60);
                openWhatsAppMessage(
                  primaryContact.phone,
                  getPreparedHelpMessage(primaryContact.name, language)
                );
              }}
              className="inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white px-5 py-4 rounded-2xl font-black text-lg min-h-[58px] shadow-md transition-transform active:scale-95 cursor-pointer border-2 border-[#1EBE5D]"
              aria-label={`WhatsApp ${primaryContact.name}`}
            >
              <MessageSquare className="w-6 h-6 fill-white" />
              <span>{t('contactsWhatsApp')}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. PWA Install Banner */}
      {!isInstalled && (isInstallable || isIOS) && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-emerald-400 rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Download className="w-8 h-8" strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-xl sm:text-2xl font-black text-emerald-950">
                {t('dashInstallTitle')}
              </h4>
              <p className="text-base sm:text-lg text-emerald-900 mt-1 max-w-xl font-medium leading-relaxed">
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
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-7 py-4 rounded-2xl font-black text-lg min-h-[56px] shadow-md active:scale-95 transition-all flex-shrink-0 flex items-center gap-2.5 cursor-pointer"
            >
              <Download className="w-6 h-6" strokeWidth={2.5} />
              <span>{t('dashInstallBtn')}</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Primary Action Tiles: "Talk to Koode" & "Add Reminder" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Talk to Koode card */}
        <button
          onClick={() => {
            triggerHapticFeedback(40);
            onNavigate('assistant');
          }}
          className="flex items-center justify-between p-6 sm:p-7 bg-white hover:bg-emerald-50/60 rounded-3xl border-2 border-emerald-700/40 shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.99] text-left group min-h-[104px] cursor-pointer"
        >
          <div className="flex items-center gap-5">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-md">
              <Mic className="w-10 h-10" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">
                {t('dashTalkBtn')}
              </h3>
              <p className="text-base sm:text-lg text-emerald-900/80 mt-1 font-semibold">
                {language === 'ml'
                  ? 'മലയാളത്തിലോ ഇംഗ്ലീഷിലോ ചോദിക്കാം'
                  : 'Speak or type any question'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-8 h-8 text-emerald-800 flex-shrink-0 group-hover:translate-x-1.5 transition-transform" strokeWidth={3} />
        </button>

        {/* Add Reminder card */}
        <button
          onClick={() => {
            triggerHapticFeedback(40);
            onOpenAddReminder();
          }}
          className="flex items-center justify-between p-6 sm:p-7 bg-white hover:bg-emerald-50/60 rounded-3xl border-2 border-stone-300 shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.99] text-left group min-h-[104px] cursor-pointer"
        >
          <div className="flex items-center gap-5">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-emerald-100 text-emerald-900 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border-2 border-emerald-300">
              <PlusCircle className="w-10 h-10 text-emerald-800" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">
                {t('dashAddReminderBtn')}
              </h3>
              <p className="text-base sm:text-lg text-emerald-900/80 mt-1 font-semibold">
                {language === 'ml'
                  ? 'മരുന്നുകൾ, ആശുപത്രി സമയം'
                  : 'Medicines, visits, phone calls'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-8 h-8 text-emerald-800 flex-shrink-0 group-hover:translate-x-1.5 transition-transform" strokeWidth={3} />
        </button>
      </div>

      {/* 4. Today's Reminders Section */}
      <Card className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b-2 border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-7 h-7 text-emerald-800" strokeWidth={2.5} />
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">{t('dashTodayTitle')}</h3>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback(30);
              onNavigate('reminders');
            }}
            className="text-emerald-800 hover:text-emerald-950 font-black text-base sm:text-lg flex items-center gap-1.5 min-h-[48px] px-3 focus:outline-none focus:ring-4 focus:ring-emerald-700/30 rounded-xl cursor-pointer"
          >
            <span>{t('dashAllReminders')}</span>
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {todayReminders.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center gap-4 bg-stone-50 rounded-3xl p-6 sm:p-8 border-2 border-dashed border-stone-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-emerald-800" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-950 max-w-lg leading-relaxed">
              {t('dashNoReminders')}
            </p>
            <Button
              variant="secondary"
              size="lg"
              onClick={onOpenAddReminder}
              icon={<PlusCircle className="w-6 h-6 text-emerald-800" strokeWidth={2.5} />}
            >
              {t('dashAddReminderBtn')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {todayReminders.map((reminder) => {
              const overdue = isOverdue(reminder.date, reminder.time);
              return (
                <div
                  key={reminder.id}
                  className={`flex items-center justify-between p-5 sm:p-6 rounded-3xl border-2 transition-all ${
                    reminder.completed
                      ? 'bg-stone-50/90 border-stone-200 opacity-80'
                      : overdue
                      ? 'bg-rose-50/70 border-rose-400 shadow-sm'
                      : 'bg-white border-stone-200 hover:border-emerald-700/50 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-4 sm:gap-5 flex-1 mr-3">
                    <button
                      onClick={() => handleToggleReminder(reminder.id)}
                      className="p-2 rounded-2xl text-emerald-800 hover:bg-emerald-50 min-h-[52px] min-w-[52px] flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-emerald-700/30 flex-shrink-0 cursor-pointer"
                      aria-label={
                        reminder.completed ? t('remindersMarkPending') : t('remindersMarkDone')
                      }
                    >
                      {reminder.completed ? (
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 fill-emerald-100" strokeWidth={2.5} />
                      ) : (
                        <Circle className="w-10 h-10 text-stone-400 hover:text-emerald-700" strokeWidth={2.5} />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {getCategoryIcon(reminder.category)}
                        <p
                          className={`text-xl sm:text-2xl font-black ${
                            reminder.completed
                              ? 'line-through text-stone-500'
                              : 'text-emerald-950'
                          }`}
                        >
                          {reminder.title}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="text-base sm:text-lg font-extrabold text-emerald-900 bg-emerald-50 px-3 py-0.5 rounded-lg border border-emerald-200 font-mono">
                          {formatFriendlyTime(reminder.time, language)}
                        </span>
                        {reminder.completed && reminder.completedAt && (
                          <span className="text-sm font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                            ✓ {t('completedAtLabel')}{' '}
                            {new Date(reminder.completedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        {reminder.description && (
                          <span className="text-base text-stone-600 font-medium hidden sm:inline">
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

      {/* 5. "Help Me Understand" (Message Explainer Banner) */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/80 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xs">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <FileQuestion className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <div>
            <h4 className="text-2xl font-black text-amber-950">
              {t('dashExplainBtn')}
            </h4>
            <p className="text-base sm:text-lg text-amber-950/85 mt-1 max-w-lg font-medium leading-relaxed">
              {language === 'ml'
                ? 'മനസ്സിലാക്കാൻ പ്രയാസമുള്ള സന്ദേശങ്ങളോ അറിയിപ്പുകളോ ഇവിടെ നൽകുക. കൂടെ ലളിതമായി വിശദീകരിച്ചു തരും.'
                : 'Received a confusing SMS, bank notice, or hospital prescription? Koode breaks it down in plain words.'}
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
          className="border-amber-500 bg-white hover:bg-amber-100 text-amber-950 font-black flex-shrink-0 shadow-sm"
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
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 animate-pulse border-2 border-rose-300">
              <AlertTriangle className="w-9 h-9" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xl text-emerald-950 font-bold leading-relaxed">
                {t('dashSosConfirmMsg')}
              </p>
              {primaryContact ? (
                <div className="mt-4 p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl">
                  <p className="text-sm font-black text-rose-800 uppercase tracking-wider">
                    {language === 'ml' ? 'വിളിക്കുന്ന ബന്ധു / Contact:' : 'Calling Trusted Contact:'}
                  </p>
                  <p className="text-2xl font-black text-rose-950 mt-1 font-mono">
                    {primaryContact.name} — {primaryContact.phone}
                  </p>
                </div>
              ) : (
                <p className="text-lg font-black text-rose-700 mt-3">
                  {language === 'ml'
                    ? 'വിശ്വസ്തരായ ബന്ധുക്കളുടെ നമ്പർ ചേർത്തിട്ടില്ല. ദയവായി കുടുംബാംഗങ്ങൾ പേജിൽ നമ്പർ ചേർക്കുക.'
                    : 'No contact configured. Please add a trusted family contact.'}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3.5 pt-5 border-t-2 border-stone-200">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setIsSosModalOpen(false)}
            >
              {t('btnCancel')}
            </Button>
            {primaryContact && (
              <button
                type="button"
                onClick={executeSosCall}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-rose-700 hover:bg-rose-800 text-white px-8 py-4 rounded-2xl font-black text-xl min-h-[58px] shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <PhoneCall className="w-6 h-6" strokeWidth={2.5} />
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
