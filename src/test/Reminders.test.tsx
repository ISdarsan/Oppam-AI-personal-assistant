import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemindersPage } from '../pages/RemindersPage';
import { LanguageProvider } from '../i18n/LanguageContext';
import { storage } from '../services/storage';

describe('RemindersPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders reminders header and empty state', () => {
    render(
      <LanguageProvider>
        <RemindersPage />
      </LanguageProvider>
    );

    expect(screen.getByText('Daily Reminders')).toBeInTheDocument();
    expect(screen.getByText('No reminders created yet.')).toBeInTheDocument();
  });

  it('validates required fields on reminder submission', () => {
    render(
      <LanguageProvider>
        <RemindersPage isAddModalOpen={true} />
      </LanguageProvider>
    );

    // Click Save without filling title
    const saveBtn = screen.getByRole('button', { name: /Save Reminder/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/Please enter what to remind you about/i)).toBeInTheDocument();
  });

  it('creates and completes a reminder', () => {
    render(
      <LanguageProvider>
        <RemindersPage isAddModalOpen={true} />
      </LanguageProvider>
    );

    const titleInput = screen.getByLabelText(/What should I remind you about\?/i);
    fireEvent.change(titleInput, { target: { value: 'Eye Drops' } });

    const saveBtn = screen.getByRole('button', { name: /Save Reminder/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText('Eye Drops')).toBeInTheDocument();

    // Toggle complete
    const toggleBtn = screen.getByLabelText(/Mark as Done/i);
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('deletes a reminder with confirmation', () => {
    storage.saveReminder({
      title: 'Call Suresh',
      date: '2026-10-25',
      time: '18:00',
      completed: false,
    });

    render(
      <LanguageProvider>
        <RemindersPage />
      </LanguageProvider>
    );

    expect(screen.getByText('Call Suresh')).toBeInTheDocument();

    const deleteBtn = screen.getByLabelText(/Delete reminder/i);
    fireEvent.click(deleteBtn);

    // Confirm dialog appears
    expect(screen.getByText(/Are you sure you want to delete this reminder\?/i)).toBeInTheDocument();

    // Confirm delete
    const confirmDeleteBtn = screen.getByTestId('confirm-delete-btn');
    fireEvent.click(confirmDeleteBtn);

    expect(screen.queryByText('Call Suresh')).not.toBeInTheDocument();
  });
});
