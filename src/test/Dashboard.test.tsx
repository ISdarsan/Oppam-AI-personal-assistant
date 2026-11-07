import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardPage } from '../pages/DashboardPage';
import { LanguageProvider } from '../i18n/LanguageContext';
import { storage } from '../services/storage';

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('koode_settings', JSON.stringify({ language: 'en' }));
    vi.restoreAllMocks();
  });

  it('renders dashboard with greetings and action buttons', () => {
    render(
      <LanguageProvider>
        <DashboardPage onNavigate={vi.fn()} onOpenAddReminder={vi.fn()} />
      </LanguageProvider>
    );

    expect(screen.getByText(/Talk to Koode/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Add Reminder/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/What to remember today/i)).toBeInTheDocument();
  });

  it('displays empty state when no reminders exist', () => {
    render(
      <LanguageProvider>
        <DashboardPage onNavigate={vi.fn()} onOpenAddReminder={vi.fn()} />
      </LanguageProvider>
    );

    expect(screen.getByText(/You have no reminders scheduled for today/i)).toBeInTheDocument();
  });

  it('renders today reminders when present in storage', () => {
    const today = new Date().toISOString().slice(0, 10);
    storage.saveReminder({
      title: 'Blood Pressure Tablet',
      date: today,
      time: '20:00',
      description: 'Take with water',
      completed: false,
    });

    render(
      <LanguageProvider>
        <DashboardPage onNavigate={vi.fn()} onOpenAddReminder={vi.fn()} />
      </LanguageProvider>
    );

    expect(screen.getByText('Blood Pressure Tablet')).toBeInTheDocument();
  });
});
