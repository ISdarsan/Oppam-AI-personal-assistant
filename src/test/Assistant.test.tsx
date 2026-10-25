import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssistantPage } from '../pages/AssistantPage';
import { LanguageProvider } from '../i18n/LanguageContext';
import { api, ApiError } from '../services/api';

describe('AssistantPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders microphone button and text fallback input', () => {
    render(
      <LanguageProvider>
        <AssistantPage />
      </LanguageProvider>
    );

    expect(screen.getByText('Talk with Koode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tap to Speak/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Remind me to take my medicine/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask Koode/i })).toBeInTheDocument();
  });

  it('displays structured confirmation card when reminder intent is returned', async () => {
    vi.spyOn(api, 'interpretAssistant').mockResolvedValue({
      intent: 'create_reminder',
      spoken_response: 'I will help you set a reminder to call your daughter.',
      reminder_data: {
        title: 'Call daughter',
        date: '2026-10-25',
        time: '18:00',
        requires_confirmation: true,
      },
      model_used: 'gemma2:2b',
      confidence: 0.98,
    });

    render(
      <LanguageProvider>
        <AssistantPage />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText(/Remind me to take my medicine/i);
    fireEvent.change(input, { target: { value: 'Remind me to call my daughter at 6 PM' } });

    const askBtn = screen.getByRole('button', { name: /Ask Koode/i });
    fireEvent.click(askBtn);

    await waitFor(() => {
      expect(screen.getByText(/Would you like me to save this reminder\?/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Call daughter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yes, Save Reminder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /No, Discard/i })).toBeInTheDocument();
  });

  it('displays understandable error message when AI service is unavailable', async () => {
    vi.spyOn(api, 'interpretAssistant').mockRejectedValue(
      new ApiError('Ollama service is not reachable', 'AI_UNAVAILABLE', 'Run ollama serve')
    );

    render(
      <LanguageProvider>
        <AssistantPage />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText(/Remind me to take my medicine/i);
    fireEvent.change(input, { target: { value: 'Hello' } });

    const askBtn = screen.getByRole('button', { name: /Ask Koode/i });
    fireEvent.click(askBtn);

    await waitFor(() => {
      expect(screen.getByText(/AI Service Notice/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Ollama service is not reachable/i)).toBeInTheDocument();
  });
});
