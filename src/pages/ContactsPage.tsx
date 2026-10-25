import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Users,
  AlertCircle,
  Star,
  MessageCircle,
  ShieldAlert,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { storage } from '../services/storage';
import { Contact } from '../types';
import {
  makePhoneCall,
  openWhatsAppMessage,
  sendSMSMessage,
  getPreparedHelpMessage,
  triggerHapticFeedback,
} from '../utils/communication';

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
  const [isPrimary, setIsPrimary] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick message modal
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
    triggerHapticFeedback(40);
    setEditingContact(null);
    setName('');
    setRelationship('');
    setPhone('');
    setNotes('');
    setIsPrimary(contacts.length === 0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Contact) => {
    triggerHapticFeedback(40);
    setEditingContact(c);
    setName(c.name);
    setRelationship(c.relationship);
    setPhone(c.phone);
    setNotes(c.notes || '');
    setIsPrimary(Boolean(c.isPrimary));
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

    triggerHapticFeedback(60);

    if (editingContact) {
      storage.updateContact({
        ...editingContact,
        name: name.trim(),
        relationship: relationship.trim() || 'Family',
        phone: phone.trim(),
        notes: notes.trim() || undefined,
        isPrimary,
      });
    } else {
      storage.saveContact({
        name: name.trim(),
        relationship: relationship.trim() || 'Family',
        phone: phone.trim(),
        notes: notes.trim() || undefined,
        isPrimary,
      });
    }

    closeModal();
    loadContacts();
  };

  const handleDelete = () => {
    if (contactToDelete) {
      triggerHapticFeedback(80);
      storage.deleteContact(contactToDelete.id);
      setContactToDelete(null);
      loadContacts();
    }
  };

  const handleTogglePrimary = (contact: Contact) => {
    triggerHapticFeedback(50);
    // Unset primary on others if setting this one
    const updated = { ...contact, isPrimary: !contact.isPrimary };
    storage.updateContact(updated);
    loadContacts();
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

      {/* Emergency Guidance Notice */}
      <div className="bg-emerald-50 border-2 border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-emerald-800 flex-shrink-0" />
          <p className="text-base text-emerald-950 font-medium">
            {language === 'ml'
              ? 'സ്റ്റാർ (★) അടയാളമുള്ള ബന്ധുവിലേക്ക് ആയിരിക്കും അടിയന്തിര SOS കോൾ പോവുക.'
              : 'The contact marked with a star (★) will be called first during an Emergency SOS.'}
          </p>
        </div>
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
        <div className="grid grid-cols-1 gap-5">
          {contacts.map((contact) => {
            const preparedMsg = getPreparedHelpMessage(contact.name, language);

            return (
              <Card
                key={contact.id}
                className={`p-6 bg-white border-2 transition-all ${
                  contact.isPrimary
                    ? 'border-emerald-500 shadow-md ring-2 ring-emerald-100'
                    : 'border-sahaaya-border hover:border-sahaaya-primary/40'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Contact Information */}
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-sahaaya-cream text-sahaaya-primary flex items-center justify-center font-black text-2xl flex-shrink-0 border-2 border-sahaaya-primary/20">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-2xl sm:text-3xl font-black text-sahaaya-text">
                          {contact.name}
                        </h3>
                        <span className="text-sm font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full">
                          {contact.relationship}
                        </span>
                        {contact.isPrimary && (
                          <span className="text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                            {language === 'ml' ? 'പ്രധാന നമ്പർ (Primary)' : 'Primary Contact'}
                          </span>
                        )}
                      </div>
                      <p className="text-xl sm:text-2xl font-extrabold text-sahaaya-primary mt-1 tracking-wide font-mono">
                        {contact.phone}
                      </p>
                      {contact.notes && (
                        <p className="text-base text-sahaaya-muted mt-1">{contact.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Multi-Channel Quick Action Buttons (Call, WhatsApp, SMS) */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-sahaaya-border">
                    {/* 1. Phone Call */}
                    <button
                      onClick={() => makePhoneCall(contact.phone)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-sahaaya-primary hover:bg-sahaaya-primaryHover text-white px-5 py-3.5 rounded-2xl font-bold text-base sm:text-lg min-h-[52px] shadow-sm transition-transform active:scale-95"
                      aria-label={`Call ${contact.name}`}
                    >
                      <PhoneCall className="w-5 h-5" />
                      <span>{t('contactsCallNow')}</span>
                    </button>

                    {/* 2. WhatsApp Message */}
                    <button
                      onClick={() => openWhatsAppMessage(contact.phone, preparedMsg)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white px-5 py-3.5 rounded-2xl font-bold text-base min-h-[52px] shadow-sm transition-transform active:scale-95"
                      aria-label={`WhatsApp ${contact.name}`}
                    >
                      <MessageCircle className="w-5 h-5 fill-white" />
                      <span>{t('contactsWhatsApp')}</span>
                    </button>

                    {/* 3. SMS Message Preview */}
                    <button
                      onClick={() => {
                        triggerHapticFeedback(40);
                        setMessageTarget(contact);
                      }}
                      className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-3.5 rounded-2xl font-bold text-base min-h-[52px] shadow-sm transition-transform active:scale-95"
                      aria-label={`Send help message to ${contact.name}`}
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span>{t('contactsSendMessage')}</span>
                    </button>

                    {/* 4. Secondary actions (Star primary, Edit, Delete) */}
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => handleTogglePrimary(contact)}
                        className={`p-3 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors ${
                          contact.isPrimary
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                        }`}
                        title={
                          contact.isPrimary
                            ? 'Primary Emergency Contact'
                            : 'Set as Primary Emergency Contact'
                        }
                        aria-label="Set as Primary Emergency Contact"
                      >
                        <Star
                          className={`w-6 h-6 ${contact.isPrimary ? 'fill-amber-400 text-amber-500' : ''}`}
                        />
                      </button>

                      <button
                        onClick={() => openEditModal(contact)}
                        className="p-3 rounded-xl text-sahaaya-muted hover:text-sahaaya-primary hover:bg-sahaaya-cream min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sahaaya-primary"
                        aria-label="Edit contact"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => {
                          triggerHapticFeedback(50);
                          setContactToDelete(contact);
                        }}
                        className="p-3 rounded-xl text-sahaaya-muted hover:text-sahaaya-alert hover:bg-rose-50 min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sahaaya-alert"
                        aria-label="Delete contact"
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

          <label className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-6 h-6 text-sahaaya-primary rounded accent-sahaaya-primary cursor-pointer"
            />
            <span className="text-base font-bold text-emerald-950">
              {language === 'ml'
                ? 'പ്രധാന അടിയന്തിര കോൺടാക്റ്റ് ആക്കുക (Primary for SOS)'
                : 'Set as Primary Emergency Contact (Called during SOS)'}
            </span>
          </label>

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
              "{getPreparedHelpMessage(messageTarget.name, language)}"
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-sahaaya-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMessageTarget(null)}
              >
                {t('btnCancel')}
              </Button>
              <button
                type="button"
                onClick={() => {
                  sendSMSMessage(messageTarget.phone, getPreparedHelpMessage(messageTarget.name, language));
                  setMessageTarget(null);
                }}
                className="inline-flex items-center justify-center gap-2 bg-sahaaya-primary hover:bg-sahaaya-primaryHover text-white px-6 py-3.5 rounded-2xl font-bold text-lg min-h-[52px] shadow-sm w-full sm:w-auto"
              >
                <MessageSquare className="w-5 h-5" />
                <span>{language === 'ml' ? 'സന്ദേശം അയക്കുക (SMS)' : 'Open SMS App'}</span>
              </button>
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
