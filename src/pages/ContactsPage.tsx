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
  Send,
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
    const updated = { ...contact, isPrimary: !contact.isPrimary };
    storage.updateContact(updated);
    loadContacts();
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            {t('contactsTitle')}
          </h2>
          <p className="text-lg sm:text-xl text-emerald-900/80 mt-1 font-medium">{t('contactsSubtitle')}</p>
        </div>
        <Button
          size="lg"
          onClick={openAddModal}
          icon={<Plus className="w-6 h-6" strokeWidth={3} />}
          className="shadow-md flex-shrink-0 text-xl font-black"
        >
          {t('contactsAddNew')}
        </Button>
      </div>

      {/* Emergency Guidance Notice */}
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-5 sm:p-6 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <p className="text-base sm:text-lg text-emerald-950 font-bold leading-relaxed">
            {language === 'ml'
              ? 'സ്റ്റാർ (★) അടയാളമുള്ള ബന്ധുവിലേക്ക് ആയിരിക്കും അടിയന്തിര SOS കോൾ പോവുക.'
              : 'The contact marked with a star (★) will be called first during an Emergency SOS.'}
          </p>
        </div>
      </div>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <Card className="py-14 text-center flex flex-col items-center gap-4 bg-white border-2 border-stone-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Users className="w-9 h-9 text-emerald-800" strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">{t('contactsEmpty')}</h3>
          <Button size="lg" onClick={openAddModal} icon={<Plus className="w-6 h-6" strokeWidth={3} />}>
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
                className={`p-6 sm:p-7 bg-white border-2 transition-all ${
                  contact.isPrimary
                    ? 'border-emerald-600 shadow-md ring-4 ring-emerald-100'
                    : 'border-stone-300 hover:border-emerald-700/50 shadow-xs'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Contact Information */}
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-3xl sm:text-4xl flex-shrink-0 border-2 border-emerald-300 shadow-xs">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">
                          {contact.name}
                        </h3>
                        <span className="text-base font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 px-3.5 py-1 rounded-full">
                          {contact.relationship}
                        </span>
                        {contact.isPrimary && (
                          <span className="text-sm font-black bg-amber-100 text-amber-950 border-2 border-amber-400 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                            <Star className="w-4 h-4 fill-amber-500 text-amber-600" />
                            {language === 'ml' ? 'പ്രധാന നമ്പർ (Primary)' : 'Primary SOS Contact'}
                          </span>
                        )}
                      </div>
                      <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1.5 tracking-wider font-mono">
                        {contact.phone}
                      </p>
                      {contact.notes && (
                        <p className="text-lg text-stone-600 mt-1 font-medium">{contact.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Multi-Channel Quick Action Buttons (Call, WhatsApp, SMS Preview) */}
                  <div className="flex flex-wrap items-center gap-3 pt-4 lg:pt-0 border-t-2 lg:border-t-0 border-stone-200">
                    {/* 1. Direct Phone Call */}
                    <button
                      onClick={() => {
                        triggerHapticFeedback(80);
                        makePhoneCall(contact.phone);
                      }}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 bg-emerald-800 hover:bg-emerald-900 text-white px-6 py-4 rounded-2xl font-black text-lg sm:text-xl min-h-[56px] shadow-md transition-transform active:scale-95 cursor-pointer"
                      aria-label={`Call ${contact.name}`}
                    >
                      <PhoneCall className="w-6 h-6" strokeWidth={2.5} />
                      <span>{t('contactsCallNow')}</span>
                    </button>

                    {/* 2. Direct WhatsApp Chat */}
                    <button
                      onClick={() => {
                        triggerHapticFeedback(60);
                        openWhatsAppMessage(contact.phone, preparedMsg);
                      }}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white px-6 py-4 rounded-2xl font-black text-lg sm:text-xl min-h-[56px] shadow-md transition-transform active:scale-95 cursor-pointer"
                      aria-label={`WhatsApp ${contact.name}`}
                    >
                      <MessageCircle className="w-6 h-6 fill-white" />
                      <span>{t('contactsWhatsApp')}</span>
                    </button>

                    {/* 3. SMS Message Preview */}
                    <button
                      onClick={() => {
                        triggerHapticFeedback(40);
                        setMessageTarget(contact);
                      }}
                      className="inline-flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-800 text-white px-5 py-4 rounded-2xl font-black text-lg min-h-[56px] shadow-md transition-transform active:scale-95 cursor-pointer"
                      aria-label={`Send help message to ${contact.name}`}
                    >
                      <MessageSquare className="w-6 h-6" />
                      <span>{t('contactsSendMessage')}</span>
                    </button>

                    {/* Secondary actions (Primary toggle, Edit, Delete) */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        onClick={() => handleTogglePrimary(contact)}
                        className={`p-3 rounded-2xl min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors cursor-pointer ${
                          contact.isPrimary
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-stone-400 hover:text-amber-500 hover:bg-stone-100'
                        }`}
                        title={
                          contact.isPrimary
                            ? 'Primary Emergency Contact'
                            : 'Set as Primary Emergency Contact'
                        }
                        aria-label="Set as Primary Emergency Contact"
                      >
                        <Star
                          className={`w-7 h-7 ${contact.isPrimary ? 'fill-amber-400 text-amber-500' : ''}`}
                        />
                      </button>

                      <button
                        onClick={() => openEditModal(contact)}
                        className="p-3 rounded-2xl text-stone-600 hover:text-emerald-900 hover:bg-emerald-50 min-h-[50px] min-w-[50px] flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-emerald-700/30 cursor-pointer"
                        aria-label="Edit contact"
                      >
                        <Edit2 className="w-6 h-6" />
                      </button>

                      <button
                        onClick={() => {
                          triggerHapticFeedback(50);
                          setContactToDelete(contact);
                        }}
                        className="p-3 rounded-2xl text-stone-600 hover:text-rose-700 hover:bg-rose-50 min-h-[50px] min-w-[50px] flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-rose-500/30 cursor-pointer"
                        aria-label="Delete contact"
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

      {/* Add / Edit Contact Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingContact ? t('contactsEdit') : t('contactsAddNew')}
      >
        <form onSubmit={handleSaveContact} className="flex flex-col gap-6">
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

          <label className="flex items-center gap-3.5 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-7 h-7 text-emerald-800 rounded-lg accent-emerald-800 cursor-pointer"
            />
            <span className="text-lg font-black text-emerald-950">
              {language === 'ml'
                ? 'പ്രധാന അടിയന്തിര കോൺടാക്റ്റ് ആക്കുക (Primary for SOS)'
                : 'Set as Primary Emergency Contact (Called during SOS)'}
            </span>
          </label>

          {formError && (
            <p className="text-base font-black text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">{formError}</p>
          )}

          <div className="flex items-center justify-end gap-3.5 pt-5 border-t-2 border-stone-200">
            <Button type="button" variant="ghost" size="lg" onClick={closeModal}>
              {t('btnCancel')}
            </Button>
            <Button type="submit" variant="primary" size="lg">
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
          <div className="flex flex-col gap-6">
            <p className="text-xl text-emerald-950 font-bold leading-relaxed">
              {language === 'ml'
                ? `${messageTarget.name} എന്നവർക്ക് അയക്കാനുള്ള സന്ദേശം പരിശോധിക്കുക:`
                : `Review the prepared message to send to ${messageTarget.name}:`}
            </p>

            <div className="bg-stone-50 p-6 rounded-3xl border-2 border-stone-300 text-2xl font-bold text-emerald-950 leading-relaxed shadow-inner font-sans">
              "{getPreparedHelpMessage(messageTarget.name, language)}"
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3.5 pt-5 border-t-2 border-stone-200">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => setMessageTarget(null)}
              >
                {t('btnCancel')}
              </Button>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback(60);
                  sendSMSMessage(messageTarget.phone, getPreparedHelpMessage(messageTarget.name, language));
                  setMessageTarget(null);
                }}
                className="inline-flex items-center justify-center gap-2.5 bg-emerald-800 hover:bg-emerald-900 text-white px-7 py-4 rounded-2xl font-black text-xl min-h-[56px] shadow-md w-full sm:w-auto cursor-pointer"
              >
                <Send className="w-6 h-6" />
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
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 border-2 border-rose-300">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xl text-emerald-950 font-bold leading-relaxed">
                {t('contactsDeleteConfirmMsg')}
              </p>
              {contactToDelete && (
                <p className="text-2xl font-black text-emerald-950 mt-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  "{contactToDelete.name}" ({contactToDelete.phone})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3.5 pt-5 border-t-2 border-stone-200">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setContactToDelete(null)}
            >
              {t('btnCancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="lg"
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
