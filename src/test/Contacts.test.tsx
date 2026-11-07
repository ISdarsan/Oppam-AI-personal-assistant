import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ContactsPage } from '../pages/ContactsPage';
import { LanguageProvider } from '../i18n/LanguageContext';

describe('ContactsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('koode_settings', JSON.stringify({ language: 'en' }));
  });

  it('renders contacts list with default trusted contact and call button', () => {
    render(
      <LanguageProvider>
        <ContactsPage />
      </LanguageProvider>
    );

    expect(screen.getByText('Family & Trusted Contacts')).toBeInTheDocument();
    expect(screen.getByText('Lakshmi')).toBeInTheDocument();
    expect(screen.getByText('Call Now')).toBeInTheDocument();
  });

  it('adds a new contact', () => {
    render(
      <LanguageProvider>
        <ContactsPage />
      </LanguageProvider>
    );

    const addBtn = screen.getByRole('button', { name: /Add New Contact/i });
    fireEvent.click(addBtn);

    const nameInput = screen.getByLabelText(/^Name$/i);
    const phoneInput = screen.getByLabelText(/^Phone Number$/i);

    fireEvent.change(nameInput, { target: { value: 'Dr. Mohan' } });
    fireEvent.change(phoneInput, { target: { value: '9847111222' } });

    const saveBtn = screen.getByRole('button', { name: /^Save$/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText('Dr. Mohan')).toBeInTheDocument();
  });

  it('opens prepared help message preview', () => {
    render(
      <LanguageProvider>
        <ContactsPage />
      </LanguageProvider>
    );

    const sendMsgBtn = screen.getByLabelText(/Send help message to Lakshmi/i);
    fireEvent.click(sendMsgBtn);

    expect(screen.getByText(/Review the prepared message to send to Lakshmi/i)).toBeInTheDocument();
    expect(screen.getByText(/Hello Lakshmi, I need a little help/i)).toBeInTheDocument();
  });
});
