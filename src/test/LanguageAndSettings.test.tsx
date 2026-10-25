import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsPage } from '../pages/SettingsPage';
import { LanguageProvider } from '../i18n/LanguageContext';
import { storage } from '../services/storage';

describe('Settings and Language Switching', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders settings and allows switching language to Malayalam', () => {
    render(
      <LanguageProvider>
        <SettingsPage />
      </LanguageProvider>
    );

    expect(screen.getByText('Settings & Privacy')).toBeInTheDocument();

    // Click Malayalam language button
    const mlBtn = screen.getByText('മലയാളം');
    fireEvent.click(mlBtn);

    // Language in HTML document root should now be ml
    expect(document.documentElement.getAttribute('lang')).toBe('ml');
    expect(screen.getByText('ക്രമീകരണങ്ങളും സ്വകാര്യതയും')).toBeInTheDocument();
  });

  it('updates and persists preferred display name', () => {
    render(
      <LanguageProvider>
        <SettingsPage />
      </LanguageProvider>
    );

    const nameInput = screen.getByLabelText(/Your Preferred Name/i);
    fireEvent.change(nameInput, { target: { value: 'Grandma Vimala' } });

    const saveBtn = screen.getByRole('button', { name: /^Save$/i });
    fireEvent.click(saveBtn);

    const saved = storage.getSettings();
    expect(saved.displayName).toBe('Grandma Vimala');
  });

  it('changes text size preference', () => {
    render(
      <LanguageProvider>
        <SettingsPage />
      </LanguageProvider>
    );

    const xlargeBtn = screen.getByText('Extra Large');
    fireEvent.click(xlargeBtn);

    expect(document.documentElement.classList.contains('text-size-xlarge')).toBe(true);
  });
});
