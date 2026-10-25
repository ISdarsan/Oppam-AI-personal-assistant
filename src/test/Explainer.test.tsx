import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExplainerPage } from '../pages/ExplainerPage';
import { LanguageProvider } from '../i18n/LanguageContext';
import { api } from '../services/api';

describe('ExplainerPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders explainer input area and sample buttons', () => {
    render(
      <LanguageProvider>
        <ExplainerPage />
      </LanguageProvider>
    );

    expect(screen.getByText('Help Me Understand')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste your message, SMS/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explain in Simple Words/i })).toBeInTheDocument();
  });

  it('renders explanation card with summary and details', async () => {
    vi.spyOn(api, 'explainMessage').mockResolvedValue({
      simple_summary: 'Your prescription is ready for pickup at the pharmacy.',
      key_details: ['Pharmacy appointment', 'Before 5 PM'],
      action_items: ['Pick up medicine before pharmacy closes'],
      warnings_and_checks: ['Verify with doctor if unsure'],
      is_suspicious: false,
      model_used: 'gemma2:2b',
    });

    render(
      <LanguageProvider>
        <ExplainerPage />
      </LanguageProvider>
    );

    const textarea = screen.getByPlaceholderText(/Paste your message, SMS/i);
    fireEvent.change(textarea, { target: { value: 'Your prescription is ready.' } });

    const btn = screen.getByRole('button', { name: /Explain in Simple Words/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('In Simple Words')).toBeInTheDocument();
    });

    expect(screen.getByText(/Your prescription is ready for pickup/i)).toBeInTheDocument();
    expect(screen.getByText('Important Details')).toBeInTheDocument();
    expect(screen.getByText('What You May Need To Do')).toBeInTheDocument();
  });

  it('highlights suspicious security warning when red flags are detected', async () => {
    vi.spyOn(api, 'explainMessage').mockResolvedValue({
      simple_summary: 'This message claims to be from a bank requesting an OTP.',
      key_details: ['Urgent request for OTP'],
      action_items: ['Do not share OTP'],
      warnings_and_checks: ['Never share OTP with anyone'],
      is_suspicious: true,
      model_used: 'gemma2:2b',
    });

    render(
      <LanguageProvider>
        <ExplainerPage />
      </LanguageProvider>
    );

    const textarea = screen.getByPlaceholderText(/Paste your message, SMS/i);
    fireEvent.change(textarea, { target: { value: 'Send OTP immediately' } });

    const btn = screen.getByRole('button', { name: /Explain in Simple Words/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('Security Warning!')).toBeInTheDocument();
    });

    expect(screen.getByText(/This message looks suspicious/i)).toBeInTheDocument();
  });
});
