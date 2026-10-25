import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssistantPage } from '../pages/AssistantPage';
import { LanguageProvider } from '../i18n/LanguageContext';
import { api, ApiError } from '../services/api';
import { storage } from '../services/storage';

describe('AssistantPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders microphone button, privacy disclosure, and text fallback input', () => {
    render(
      <LanguageProvider>
        <AssistantPage />
      </LanguageProvider>
    );

    expect(screen.getByText('Talk with Koode')).toBeInTheDocument();
    expect(screen.getByText(/Voice Transcription Notice/i)).toBeInTheDocument();
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
        category: 'call',
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

  it('saves reminder to storage only after explicit user confirmation', async () => {
    vi.spyOn(api, 'interpretAssistant').mockResolvedValue({
      intent: 'create_reminder',
      spoken_response: 'Setting a reminder for your medicine.',
      reminder_data: {
        title: 'Pressure tablet',
        category: 'medicine',
        date: '2026-10-25',
        time: '20:00',
        requires_confirmation: true,
      },
      model_used: 'gemma2:2b',
      confidence: 0.95,
    });

    const onSavedMock = vi.fn();

    render(
      <LanguageProvider>
        <AssistantPage onReminderSaved={onSavedMock} />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText(/Remind me to take my medicine/i);
    fireEvent.change(input, { target: { value: 'Remind me to take BP tablet at 8 PM' } });

    fireEvent.click(screen.getByRole('button', { name: /Ask Koode/i }));

    await waitFor(() => {
      expect(screen.getByText('Pressure tablet')).toBeInTheDocument();
    });

    // Before clicking Save, storage has 0 reminders
    expect(storage.getReminders().length).toBe(0);

    // Tap confirm button
    const confirmBtn = screen.getByRole('button', { name: /Yes, Save Reminder/i });
    fireEvent.click(confirmBtn);

    // Now storage has 1 reminder saved
    expect(storage.getReminders().length).toBe(1);
    expect(storage.getReminders()[0].title).toBe('Pressure tablet');
    expect(storage.getReminders()[0].category).toBe('medicine');
    expect(onSavedMock).toHaveBeenCalled();
  });

  it('allows user to edit text before sending to AI', async () => {
    const interpretSpy = vi.spyOn(api, 'interpretAssistant').mockResolvedValue({
      intent: 'general_qa',
      spoken_response: 'Hello! I am Koode, here to help you.',
      model_used: 'gemma2:2b',
      confidence: 0.99,
    });

    render(
      <LanguageProvider>
        <AssistantPage />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText(/Remind me to take my medicine/i) as HTMLTextAreaElement;
    // User types original
    fireEvent.change(input, { target: { value: 'Hello Koode' } });
    // User corrects/edits it
    fireEvent.change(input, { target: { value: 'Good morning Koode' } });

    fireEvent.click(screen.getByRole('button', { name: /Ask Koode/i }));

    expect(interpretSpy).toHaveBeenCalledWith('Good morning Koode', 'en', expect.any(String));
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
