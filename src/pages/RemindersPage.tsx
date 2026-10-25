import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  AlertCircle,
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
import { Input } from '../components/ui/Input';
import { storage } from '../services/storage';
import { Reminder, ReminderCategory } from '../types';
import {
  isToday,
  isOverdue,
  formatFriendlyDate,
  formatFriendlyTime,
  getTodayDateString,
  getCurrentTimeString,
} from '../utils/dateUtils';
import { triggerHapticFeedback } from '../utils/communication';

interface RemindersPageProps {
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export const RemindersPage: React.FC<RemindersPageProps> = ({
  isAddModalOpen = false,
  onCloseAddModal,
}) => {
  const { language, t } = useLanguage();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(isAddModalOpen);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [filterCategory, setFilterCategory] = useState<ReminderCategory | 'all'>('all');

  // Form fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState(getCurrentTimeString());
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReminderCategory>('medicine');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);

  useEffect(() => {
    loadReminders();
  }, []);

  useEffect(() => {
    if (isAddModalOpen) {
      openAddModal();
    }
  }, [isAddModalOpen]);

  const loadReminders = () => {
    setReminders(storage.getReminders());
  };

  const openAddModal = () => {
    triggerHapticFeedback(40);
    setEditingReminder(null);
    setTitle('');
    setDate(getTodayDateString());
    setTime(getCurrentTimeString());
    setDescription('');
    setCategory('medicine');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (r: Reminder) => {
    triggerHapticFeedback(40);
    setEditingReminder(r);
    setTitle(r.title);
    setDate(r.date);
    setTime(r.time);
    setDescription(r.description || '');
    setCategory(r.category || 'general');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReminder(null);
    if (onCloseAddModal) onCloseAddModal();
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError(
        language === 'ml'
          ? 'ഓർമ്മിപ്പിക്കേണ്ട കാര്യം എന്താണെന്ന് എഴുതുക.'
          : 'Please enter what to remind you about.'
      );
      return;
    }
    if (!date) {
      setFormError(
        language === 'ml' ? 'ദയവായി ഒരു തീയതി തിരഞ്ഞെടുക്കുക.' : 'Please pick a date.'
      );
      return;
    }
    if (!time) {
      setFormError(
        language === 'ml' ? 'ദയവായി ഒരു സമയം തിരഞ്ഞെടുക്കുക.' : 'Please pick a time.'
      );
      return;
    }

    triggerHapticFeedback(60);

    if (editingReminder) {
      storage.updateReminder({
        ...editingReminder,
        title: title.trim(),
        date,
        time,
        description: description.trim() || undefined,
        category,
      });
    } else {
      storage.saveReminder({
        title: title.trim(),
        date,
        time,
        description: description.trim() || undefined,
        category,
        completed: false,
      });
    }

    closeModal();
    loadReminders();
  };

  const handleToggle = (id: string) => {
    triggerHapticFeedback(60);
    storage.toggleReminder(id);
    loadReminders();
  };

  const confirmDelete = (reminder: Reminder) => {
    triggerHapticFeedback(40);
    setReminderToDelete(reminder);
  };

  const handleDelete = () => {
    if (reminderToDelete) {
      triggerHapticFeedback(80);
      storage.deleteReminder(reminderToDelete.id);
      setReminderToDelete(null);
      loadReminders();
    }
  };

  const categories: { id: ReminderCategory; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'medicine',
      label: language === 'ml' ? '💊 മരുന്ന്' : '💊 Medicine',
      icon: <Pill className="w-5 h-5 text-rose-600" />,
      color: 'bg-rose-100 text-rose-950 border-rose-300',
    },
    {
      id: 'doctor',
      label: language === 'ml' ? '🩺 ഡോക്ടർ' : '🩺 Doctor',
      icon: <Stethoscope className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-100 text-blue-950 border-blue-300',
    },
    {
      id: 'call',
      label: language === 'ml' ? '📞 വിളി' : '📞 Call Family',
      icon: <Phone className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    },
    {
      id: 'water',
      label: language === 'ml' ? '💧 ആരോഗ്യം' : '💧 Health/Water',
      icon: <Droplet className="w-5 h-5 text-cyan-600" />,
      color: 'bg-cyan-100 text-cyan-950 border-cyan-300',
    },
    {
      id: 'general',
      label: language === 'ml' ? '📋 മറ്റുള്ളവ' : '📋 General',
      icon: <ClipboardList className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-100 text-amber-950 border-amber-300',
    },
  ];

  const filteredReminders = reminders.filter((r) => {
    if (filterCategory === 'all') return true;
    return r.category === filterCategory;
  });

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            {t('remindersTitle')}
          </h2>
          <p className="text-lg sm:text-xl text-emerald-900/80 mt-1 font-medium">{t('remindersSubtitle')}</p>
        </div>
        <Button
          size="lg"
          onClick={openAddModal}
          icon={<Plus className="w-6 h-6" strokeWidth={3} />}
          className="shadow-md flex-shrink-0 text-xl font-black"
        >
          {t('remindersAddNew')}
        </Button>
      </div>

      {/* Senior Category Filter Bar */}
      {reminders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => {
              triggerHapticFeedback(30);
              setFilterCategory('all');
            }}
            className={`px-4 py-2.5 rounded-2xl text-base font-black border-2 transition-all min-h-[48px] whitespace-nowrap cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                : 'bg-white text-emerald-950 border-stone-300 hover:bg-stone-50'
            }`}
          >
            {language === 'ml' ? 'എല്ലാം (All)' : 'All Reminders'}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                triggerHapticFeedback(30);
                setFilterCategory(c.id);
              }}
              className={`px-4 py-2.5 rounded-2xl text-base font-black border-2 transition-all min-h-[48px] whitespace-nowrap cursor-pointer ${
                filterCategory === c.id
                  ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                  : 'bg-white text-emerald-950 border-stone-300 hover:bg-stone-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <Card className="py-14 text-center flex flex-col items-center gap-4 bg-white border-2 border-stone-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Calendar className="w-9 h-9 text-emerald-800" strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">{t('remindersEmpty')}</h3>
          <p className="text-lg sm:text-xl text-emerald-900/80 max-w-md font-medium leading-relaxed">
            {language === 'ml'
              ? 'മരുന്നുകളോ പ്രധാന ദിവസങ്ങളോ ഇവിടെ ചേർക്കുക.'
              : 'Add your medicines, doctor visits, or family call times.'}
          </p>
          <Button size="lg" onClick={openAddModal} icon={<Plus className="w-6 h-6" strokeWidth={3} />}>
            {t('remindersAddNew')}
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredReminders.map((reminder) => {
            const overdue = !reminder.completed && isOverdue(reminder.date, reminder.time);
            const today = isToday(reminder.date);
            const cat = categories.find((c) => c.id === reminder.category);

            return (
              <Card
                key={reminder.id}
                className={`p-5 sm:p-7 transition-all ${
                  reminder.completed
                    ? 'bg-stone-50/90 border-stone-200 opacity-80'
                    : overdue
                    ? 'border-2 border-rose-400 bg-rose-50/60 shadow-md'
                    : today
                    ? 'border-2 border-emerald-600/70 bg-white shadow-md'
                    : 'bg-white border-2 border-stone-200 hover:border-emerald-700/40 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  {/* Left: Completion toggle + Title + Time */}
                  <div className="flex items-start gap-4 sm:gap-5 flex-1">
                    <button
                      onClick={() => handleToggle(reminder.id)}
                      className="mt-0.5 p-1 rounded-2xl text-emerald-800 hover:bg-emerald-50 min-h-[52px] min-w-[52px] flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-emerald-700/30 flex-shrink-0 cursor-pointer"
                      aria-label={
                        reminder.completed
                          ? t('remindersMarkPending')
                          : t('remindersMarkDone')
                      }
                    >
                      {reminder.completed ? (
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 fill-emerald-100" strokeWidth={2.5} />
                      ) : (
                        <Circle className="w-10 h-10 text-stone-400 hover:text-emerald-700" strokeWidth={2.5} />
                      )}
                    </button>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3
                          className={`text-2xl sm:text-3xl font-black leading-snug ${
                            reminder.completed
                              ? 'line-through text-stone-500'
                              : 'text-emerald-950'
                          }`}
                        >
                          {reminder.title}
                        </h3>
                        {cat && (
                          <span
                            className={`text-xs sm:text-sm font-black px-3 py-1 rounded-full border-2 ${cat.color}`}
                          >
                            {cat.label}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-lg font-bold text-emerald-900/90">
                        <span className="flex items-center gap-1.5 bg-stone-100 px-3 py-1 rounded-xl">
                          <Calendar className="w-5 h-5 text-emerald-800" />
                          <span>{formatFriendlyDate(reminder.date, language)}</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-xl font-mono text-emerald-950 border border-emerald-200">
                          <Clock className="w-5 h-5 text-emerald-800" />
                          <span>{formatFriendlyTime(reminder.time, language)}</span>
                        </span>

                        {reminder.completed && reminder.completedAt && (
                          <span className="text-base font-black text-emerald-950 bg-emerald-100 border-2 border-emerald-400 px-3.5 py-1 rounded-full">
                            ✓ {t('completedAtLabel')}{' '}
                            {new Date(reminder.completedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      {reminder.description && (
                        <p className="text-lg text-emerald-950/80 mt-1 bg-stone-50 p-3 rounded-2xl border border-stone-200 font-medium">
                          {reminder.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Status Badge & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3.5 pt-4 sm:pt-0 border-t-2 sm:border-t-0 border-stone-200">
                    <div>
                      {reminder.completed ? (
                        <Badge variant="success">{t('remindersStatusCompleted')}</Badge>
                      ) : overdue ? (
                        <Badge variant="danger">{t('remindersStatusOverdue')}</Badge>
                      ) : today ? (
                        <Badge variant="info">{t('remindersStatusToday')}</Badge>
                      ) : (
                        <Badge variant="neutral">{t('remindersStatusUpcoming')}</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(reminder)}
                        className="p-3 rounded-2xl text-stone-600 hover:text-emerald-900 hover:bg-emerald-50 min-h-[50px] min-w-[50px] flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-emerald-700/30 cursor-pointer"
                        aria-label="Edit reminder"
                      >
                        <Edit2 className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => confirmDelete(reminder)}
                        className="p-3 rounded-2xl text-stone-600 hover:text-rose-700 hover:bg-rose-50 min-h-[50px] min-w-[50px] flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-rose-500/30 cursor-pointer"
                        aria-label="Delete reminder"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Reminder Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingReminder ? t('remindersEdit') : t('remindersAddNew')}
      >
        <form onSubmit={handleSaveReminder} noValidate className="flex flex-col gap-6">
          {/* Category Selection Chips */}
          <div>
            <label className="block text-xl font-black text-emerald-950 mb-2.5">
              {language === 'ml' ? 'വിഭാഗം തിരഞ്ഞെടുക്കുക:' : 'Select Category:'}
            </label>
            <div className="flex flex-wrap gap-2.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(30);
                    setCategory(c.id);
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-base font-black border-2 transition-all min-h-[48px] cursor-pointer ${
                    category === c.id
                      ? 'border-emerald-800 bg-emerald-800 text-white scale-102 shadow-sm'
                      : 'border-stone-300 bg-white text-emerald-950 hover:bg-emerald-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={t('remindersTitleField')}
            placeholder={t('remindersTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="date"
              label={t('remindersDateField')}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              type="time"
              label={t('remindersTimeField')}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          <Input
            label={t('remindersDescField')}
            placeholder={t('remindersDescPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {formError && (
            <p className="text-base font-black text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">{formError}</p>
          )}

          <div className="flex items-center justify-end gap-3.5 pt-5 border-t-2 border-stone-200">
            <Button type="button" variant="ghost" size="lg" onClick={closeModal}>
              {t('btnCancel')}
            </Button>
            <Button type="submit" variant="primary" size="lg">
              {t('remindersSaveBtn')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(reminderToDelete)}
        onClose={() => setReminderToDelete(null)}
        title={t('remindersDeleteConfirmTitle')}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 border-2 border-rose-300">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xl text-emerald-950 font-bold leading-relaxed">
                {t('remindersDeleteConfirmMsg')}
              </p>
              {reminderToDelete && (
                <p className="text-2xl font-black text-emerald-950 mt-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  "{reminderToDelete.title}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3.5 pt-5 border-t-2 border-stone-200">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setReminderToDelete(null)}
            >
              {t('btnCancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="lg"
              data-testid="confirm-delete-btn"
              onClick={handleDelete}
            >
              {t('remindersDeleteBtn')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
