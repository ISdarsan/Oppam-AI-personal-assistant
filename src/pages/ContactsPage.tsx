import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Users,
  AlertCircle,
  Send,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { storage } from '../services/storage';
import { Contact } from '../types';

export const ContactsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Message preview modal
  const [messageTarget, setMessageTarget] = useState<Contact | null>(null);

  // Delete modal
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = () => {
    setContacts(storage.getContacts());
  };

  const openAddModal = () => {
    setEditingContact(null);
    setName('');
    setRelationship('');
    setPhone('');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Contact) => {
    setEditingContact(c);
    setName(c.name);
    setRelationship(c.relationship);
    setPhone(c.phone);
    setNotes(c.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(language === 'ml' ? 'പേര് നൽകുക.' : 'Please enter contact name.');
      return;
    }
    if (!phone.trim()) {
      setFormError(language === 'ml' ? 'ഫോൺ നമ്പർ നൽകുക.' : 'Please enter phone number.');
      return;
    }

    if (editingContact) {
      storage.updateContact({
        ...editingContact,
        name: name.trim(),
        relationship: relationship.trim() || 'Family',
        phone: phone.trim(),
        notes: notes.trim() || undefined,
      });
    } else {
      storage.saveContact({
        name: name.trim(),
        relationship: relationship.trim() || 'Family',
        phone: phone.trim(),
        notes: notes.trim() || undefined,
      });
    }

    closeModal();
    loadContacts();
  };

  const handleDelete = () => {
    if (contactToDelete) {
      storage.deleteContact(contactToDelete.id);
      setContactToDelete(null);
      loadContacts();
    }
  };

  const getPreparedMessage = (contactName: string) => {
    return language === 'ml'
      ? `നമസ്കാരം ${contactName}, എനിക്ക് ഒരു സഹായം വേണമായിരുന്നു. സൗകര്യപ്പെടുമ്പോൾ എന്നെ ഒന്ന് തിരിച്ചുവിളിക്കാമോ?`
      : `Hello ${contactName}, I need a little help. Could you please call me when you are free?`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-sahaaya-text tracking-tight">
            {t('contactsTitle')}
          </h2>
          <p className="text-lg text-sahaaya-muted mt-1">{t('contactsSubtitle')}</p>
        </div>
        <Button
          size="lg"
          onClick={openAddModal}
          icon={<Plus className="w-6 h-6" />}
          className="shadow-sm flex-shrink-0"
        >
          {t('contactsAddNew')}
        </Button>
      </div>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <Card className="py-12 text-center flex flex-col items-center gap-4 bg-white">
          <Users className="w-12 h-12 text-sahaaya-muted/60" />
          <h3 className="text-2xl font-bold text-sahaaya-text">{t('contactsEmpty')}</h3>
          <Button size="lg" onClick={openAddModal} icon={<Plus className="w-5 h-5" />}>
            {t('contactsAddNew')}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className="p-6 bg-white border-2 border-sahaaya-border hover:border-sahaaya-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5"
            >
              {/* Contact Information */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-sahaaya-cream text-sahaaya-primary flex items-center justify-center font-bold text-2xl flex-shrink-0 border border-sahaaya-primary/20">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-sahaaya-text">{contact.name}</h3>
                    <span className="text-sm font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                      {contact.relationship}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-sahaaya-primary mt-0.5 tracking-wide">
                    {contact.phone}
                  </p>
                  {contact.notes && (
                    <p className="text-base text-sahaaya-muted mt-1">{contact.notes}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons: 1-Tap Call & Send Message */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`tel:${contact.phone}`}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-sahaaya-primary hover:bg-sahaaya-primaryHover text-white px-6 py-3.5 rounded-2xl font-bold text-lg min-h-[52px] shadow-sm transition-transform active:scale-95"
                  aria-label={`Call ${contact.name}`}
                >
                  <PhoneCall className="w-6 h-6" />
                  <span>{t('contactsCallNow')}</span>
                </a>

                <button
                  onClick={() => setMessageTarget(contact)}
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-sahaaya-cream border-2 border-sahaaya-border text-sahaaya-text px-4 py-3.5 rounded-2xl font-bold text-base min-h-[52px] transition-colors"
                  aria-label={`Send help message to ${contact.name}`}
                >
                  <MessageSquare className="w-5 h-5 text-sahaaya-primary" />
                  <span>{t('contactsSendMessage')}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(contact)}
                    className="p-3 rounded-xl text-sahaaya-muted hover:text-sahaaya-primary hover:bg-sahaaya-cream min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sahaaya-primary"
                    aria-label="Edit contact"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setContactToDelete(contact)}
                    className="p-3 rounded-xl text-sahaaya-muted hover:text-sahaaya-alert hover:bg-rose-50 min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sahaaya-alert"
                    aria-label="Delete contact"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingContact ? t('contactsEdit') : t('contactsAddNew')}
      >
        <form onSubmit={handleSaveContact} className="flex flex-col gap-5">
          <Input
            label={t('contactsName')}
            placeholder={t('contactsNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label={t('contactsRelationship')}
            placeholder={t('contactsRelationshipPlaceholder')}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
          />

          <Input
            type="tel"
            label={t('contactsPhone')}
            placeholder={t('contactsPhonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Input
            label={t('contactsNotes')}
            placeholder={t('contactsNotesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {formError && (
            <p className="text-base font-bold text-sahaaya-alert">{formError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-sahaaya-border">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {t('btnCancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('btnSave')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Message Preview Modal */}
      <Modal
        isOpen={Boolean(messageTarget)}
        onClose={() => setMessageTarget(null)}
        title={t('contactsSendMessage')}
      >
        {messageTarget && (
          <div className="flex flex-col gap-5">
            <p className="text-lg text-sahaaya-muted">
              {language === 'ml'
                ? `${messageTarget.name} എന്നവർക്ക് അയക്കാനുള്ള സന്ദേശം പരിശോധിക്കുക:`
                : `Review the prepared message to send to ${messageTarget.name}:`}
            </p>

            <div className="bg-sahaaya-cream/60 p-5 rounded-2xl border border-sahaaya-border text-xl font-medium text-sahaaya-text leading-relaxed">
              "{getPreparedMessage(messageTarget.name)}"
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-sahaaya-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMessageTarget(null)}
              >
                {t('btnCancel')}
              </Button>
              <a
                href={`sms:${messageTarget.phone}?body=${encodeURIComponent(
                  getPreparedMessage(messageTarget.name)
                )}`}
                onClick={() => setMessageTarget(null)}
                className="inline-flex items-center justify-center gap-2 bg-sahaaya-primary hover:bg-sahaaya-primaryHover text-white px-6 py-3.5 rounded-2xl font-bold text-lg min-h-[52px] shadow-sm w-full sm:w-auto"
              >
                <Send className="w-5 h-5" />
                <span>{language === 'ml' ? 'സന്ദേശം തുറക്കുക' : 'Open SMS App'}</span>
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Contact Modal */}
      <Modal
        isOpen={Boolean(contactToDelete)}
        onClose={() => setContactToDelete(null)}
        title={t('contactsDeleteConfirmTitle')}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-lg text-sahaaya-text font-medium">
                {t('contactsDeleteConfirmMsg')}
              </p>
              {contactToDelete && (
                <p className="text-xl font-bold text-sahaaya-text mt-2">
                  "{contactToDelete.name}" ({contactToDelete.phone})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-sahaaya-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setContactToDelete(null)}
            >
              {t('btnCancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
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
