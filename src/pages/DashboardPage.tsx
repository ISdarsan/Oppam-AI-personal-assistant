import React, { useState, useEffect } from 'react';
import {
  Mic,
  PlusCircle,
  PhoneCall,
  FileQuestion,
  Calendar,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sun,
  Sunrise,
  Sunset,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { PageView } from '../components/Navigation';
import { storage } from '../services/storage';
import { Contact, Reminder } from '../types';
import { isToday, isOverdue, formatFriendlyTime } from '../utils/dateUtils';

interface DashboardPageProps {
  onNavigate: (page: PageView) => void;
  onOpenAddReminder: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenAddReminder }) => {
  const { language, settings, t } = useLanguage();
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);
  const [primaryContact, setPrimaryContact] = useState<Contact | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    const all = storage.getReminders();
    const todayItems = all.filter((r) => isToday(r.date) || (!r.completed && isOverdue(r.date, r.time)));
    setTodayReminders(todayItems);

    const contacts = storage.getContacts();
    if (contacts.length > 0) {
      setPrimaryContact(contacts[0]);
    }
  };

  const handleToggleReminder = (id: string) => {
    storage.toggleReminder(id);
    loadDashboardData();
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
      {/* 1. Greeting & Date Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-sahaaya-primary text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-emerald-100 mb-1">
            <GreetingIcon className="w-6 h-6" />
            <span className="text-lg font-medium">{todayDateFormatted}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{greetingText}</h2>
          <p className="text-emerald-100 text-base sm:text-lg mt-1 font-normal">
            {language === 'ml'
              ? 'ഇന്ന് നിങ്ങൾക്ക് എന്താണ് അറിയേണ്ടത്?'
              : 'How can Sahaaya help you stay comfortable today?'}
          </p>
        </div>

        {/* Quick Call Family Button if contact exists */}
        {primaryContact && (
          <a
            href={`tel:${primaryContact.phone}`}
            className="inline-flex items-center justify-center gap-3 bg-white text-sahaaya-primary hover:bg-emerald-50 px-6 py-4 rounded-2xl font-bold text-lg min-h-[52px] shadow-sm transition-transform active:scale-95 flex-shrink-0"
            aria-label={`Call ${primaryContact.name}`}
          >
            <PhoneCall className="w-6 h-6 text-emerald-700" />
            <span>
              {t('dashCallFamilyBtn')} ({primaryContact.name})
            </span>
          </a>
        )}
      </div>

      {/* 2. Main Action Cards: "Talk to Sahaaya" & "Add Reminder" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Talk to Sahaaya card */}
        <button
          onClick={() => onNavigate('assistant')}
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
          onClick={onOpenAddReminder}
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

      {/* 3. Today's Reminders Section */}
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
                      ? 'bg-gray-50 border-gray-200 opacity-60'
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
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-base font-semibold text-sahaaya-muted">
                          {formatFriendlyTime(reminder.time, language)}
                        </span>
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

      {/* 4. Secondary Feature: "Help Me Understand" (Explainer Banner) */}
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
                ? 'മനസ്സിലാക്കാൻ പ്രയാസമുള്ള സന്ദേശങ്ങളോ കത്തുകളോ ഇവിടെ നൽകുക. സഹായ ലളിതമായി വിശദീകരിച്ചു തരും.'
                : 'Received a confusing SMS, bank notice, or hospital instructions? Sahaaya can break it down in plain words.'}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => onNavigate('explainer')}
          className="border-amber-400 bg-white hover:bg-amber-100 text-amber-950 font-bold flex-shrink-0 shadow-sm"
        >
          {t('dashExplainBtn')}
        </Button>
      </div>
    </div>
  );
};
