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
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { storage } from '../services/storage';
import { Reminder } from '../types';
import {
  isToday,
  isOverdue,
  formatFriendlyDate,
  formatFriendlyTime,
  getTodayDateString,
  getCurrentTimeString,
} from '../utils/dateUtils';

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

  // Form fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState(getCurrentTimeString());
  const [description, setDescription] = useState('');
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
    setEditingReminder(null);
    setTitle('');
    setDate(getTodayDateString());
    setTime(getCurrentTimeString());
    setDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (r: Reminder) => {
    setEditingReminder(r);
    setTitle(r.title);
    setDate(r.date);
    setTime(r.time);
    setDescription(r.description || '');
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

    if (editingReminder) {
      storage.updateReminder({
        ...editingReminder,
        title: title.trim(),
        date,
        time,
        description: description.trim() || undefined,
      });
    } else {
      storage.saveReminder({
        title: title.trim(),
        date,
        time,
        description: description.trim() || undefined,
        completed: false,
      });
    }

    closeModal();
    loadReminders();
  };

  const handleToggle = (id: string) => {
    storage.toggleReminder(id);
    loadReminders();
  };

  const confirmDelete = (reminder: Reminder) => {
    setReminderToDelete(reminder);
  };

  const handleDelete = () => {
    if (reminderToDelete) {
      storage.deleteReminder(reminderToDelete.id);
      setReminderToDelete(null);
      loadReminders();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-sahaaya-text tracking-tight">
            {t('remindersTitle')}
          </h2>
          <p className="text-lg text-sahaaya-muted mt-1">{t('remindersSubtitle')}</p>
        </div>
        <Button
          size="lg"
          onClick={openAddModal}
          icon={<Plus className="w-6 h-6" />}
          className="shadow-sm flex-shrink-0"
        >
          {t('remindersAddNew')}
        </Button>
      </div>

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <Card className="py-12 text-center flex flex-col items-center gap-4 bg-white">
          <Calendar className="w-12 h-12 text-sahaaya-muted/60" />
          <h3 className="text-2xl font-bold text-sahaaya-text">{t('remindersEmpty')}</h3>
          <p className="text-lg text-sahaaya-muted max-w-md">
            {language === 'ml'
              ? 'മരുന്നുകളോ പ്രധാന ദിവസങ്ങളോ ഇവിടെ ചേർക്കുക.'
              : 'Add your medicines, doctor visits, or family call times.'}
          </p>
          <Button size="lg" onClick={openAddModal} icon={<Plus className="w-5 h-5" />}>
            {t('remindersAddNew')}
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {reminders.map((reminder) => {
            const overdue = !reminder.completed && isOverdue(reminder.date, reminder.time);
            const today = isToday(reminder.date);

            return (
              <Card
                key={reminder.id}
                className={`p-5 sm:p-6 transition-all ${
                  reminder.completed
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : overdue
                    ? 'border-2 border-rose-300 bg-rose-50/40 shadow-sm'
                    : today
                    ? 'border-2 border-sahaaya-primary/40 bg-white shadow-sm'
                    : 'bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Completion toggle + Title + Time */}
                  <div className="flex items-start gap-4 flex-1">
                    <button
                      onClick={() => handleToggle(reminder.id)}
                      className="mt-0.5 p-1 rounded-xl text-sahaaya-primary hover:bg-sahaaya-cream min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sahaaya-primary flex-shrink-0"
                      aria-label={
                        reminder.completed
                          ? t('remindersMarkPending')
                          : t('remindersMarkDone')
                      }
                    >
                      {reminder.completed ? (
                        <CheckCircle2 className="w-9 h-9 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-9 h-9 text-sahaaya-muted hover:text-sahaaya-primary" />
                      )}
                    </button>

                    <div className="flex flex-col gap-1">
                      <h3
                        className={`text-xl sm:text-2xl font-bold leading-snug ${
                          reminder.completed
                            ? 'line-through text-gray-500'
                            : 'text-sahaaya-text'
                        }`}
                      >
                        {reminder.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-base sm:text-lg font-semibold text-sahaaya-muted">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{formatFriendlyDate(reminder.date, language)}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{formatFriendlyTime(reminder.time, language)}</span>
                        </span>
                      </div>

                      {reminder.description && (
                        <p className="text-base text-sahaaya-muted mt-1 bg-sahaaya-bg/80 p-2.5 rounded-xl border border-sahaaya-border/50">
                          {reminder.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Badge & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-sahaaya-border">
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

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(reminder)}
                        className="p-3 rounded-xl text-sahaaya-muted hover:text-sahaaya-primary hover:bg-sahaaya-cream min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sahaaya-primary"
                        aria-label="Edit reminder"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(reminder)}
                        className="p-3 rounded-xl text-sahaaya-muted hover:text-sahaaya-alert hover:bg-rose-50 min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sahaaya-alert"
                        aria-label="Delete reminder"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingReminder ? t('remindersEdit') : t('remindersAddNew')}
      >
        <form onSubmit={handleSaveReminder} noValidate className="flex flex-col gap-5">
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

          <div className="flex flex-col gap-2">
            <label
              htmlFor="reminder-notes"
              className="text-lg font-semibold text-sahaaya-text"
            >
              {t('remindersDescField')}
            </label>
            <textarea
              id="reminder-notes"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('remindersDescPlaceholder')}
              className="w-full px-4 py-3 text-lg rounded-2xl border-2 border-sahaaya-border focus:border-sahaaya-primary focus:outline-none focus:ring-4 focus:ring-sahaaya-primary/20 bg-white text-sahaaya-text resize-none"
            />
          </div>

          {formError && (
            <p className="text-base font-bold text-sahaaya-alert">{formError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-sahaaya-border">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {t('remindersCancelBtn')}
            </Button>
            <Button type="submit" variant="primary">
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
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-lg text-sahaaya-text font-medium">
                {t('remindersDeleteConfirmMsg')}
              </p>
              {reminderToDelete && (
                <p className="text-xl font-bold text-sahaaya-text mt-2">
                  "{reminderToDelete.title}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-sahaaya-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setReminderToDelete(null)}
            >
              {t('btnCancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
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
