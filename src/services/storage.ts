import { Reminder, Contact, UserSettings } from '../types';

const SETTINGS_KEY = 'sahaaya_settings';
const REMINDERS_KEY = 'sahaaya_reminders';
const CONTACTS_KEY = 'sahaaya_contacts';

const DEFAULT_SETTINGS: UserSettings = {
  language: 'en',
  displayName: '',
  textSize: 'normal',
  autoSpeak: true,
  speechRate: 0.9,
  completedOnboarding: false,
};

// Default initial contacts (sample family contacts)
const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'contact-default-1',
    name: 'Lakshmi',
    relationship: 'Daughter / മകൾ',
    phone: '9847000001',
    notes: 'Available on WhatsApp and phone'
  }
];

export const storage = {
  // Settings
  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  // Reminders
  getReminders(): Reminder[] {
    try {
      const data = localStorage.getItem(REMINDERS_KEY);
      if (!data) return [];
      const list: Reminder[] = JSON.parse(data);
      // Sort upcoming / chronological by date + time
      return list.sort((a, b) => {
        const timeA = `${a.date} ${a.time}`;
        const timeB = `${b.date} ${b.time}`;
        return timeA.localeCompare(timeB);
      });
    } catch {
      return [];
    }
  },

  saveReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
    const reminders = this.getReminders();
    const newReminder: Reminder = {
      ...reminder,
      id: 'rem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: Date.now(),
    };
    reminders.push(newReminder);
    try {
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    } catch (e) {
      console.error('Failed to save reminder to storage:', e);
    }
    return newReminder;
  },

  updateReminder(updated: Reminder): void {
    const reminders = this.getReminders();
    const index = reminders.findIndex(r => r.id === updated.id);
    if (index !== -1) {
      reminders[index] = updated;
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    }
  },

  deleteReminder(id: string): void {
    const reminders = this.getReminders().filter(r => r.id !== id);
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  },

  toggleReminder(id: string): Reminder | null {
    const reminders = this.getReminders();
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
      reminder.completed = !reminder.completed;
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
      return reminder;
    }
    return null;
  },

  // Contacts
  getContacts(): Contact[] {
    try {
      const data = localStorage.getItem(CONTACTS_KEY);
      if (!data) {
        localStorage.setItem(CONTACTS_KEY, JSON.stringify(INITIAL_CONTACTS));
        return INITIAL_CONTACTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CONTACTS;
    }
  },

  saveContact(contact: Omit<Contact, 'id'>): Contact {
    const contacts = this.getContacts();
    const newContact: Contact = {
      ...contact,
      id: 'contact-' + Date.now(),
    };
    contacts.push(newContact);
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
    return newContact;
  },

  updateContact(updated: Contact): void {
    const contacts = this.getContacts();
    const index = contacts.findIndex(c => c.id === updated.id);
    if (index !== -1) {
      contacts[index] = updated;
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
    }
  },

  deleteContact(id: string): void {
    const contacts = this.getContacts().filter(c => c.id !== id);
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  },

  // Export & Reset
  exportAllData(): string {
    const exportData = {
      app: 'Sahaaya AI',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      reminders: this.getReminders(),
      contacts: this.getContacts(),
    };
    return JSON.stringify(exportData, null, 2);
  },

  clearAllData(): void {
    try {
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(REMINDERS_KEY);
      localStorage.removeItem(CONTACTS_KEY);
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  }
};
