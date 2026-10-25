import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, ApiError } from '../services/api';

describe('Speech API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getSpeechStatus returns configured status from backend', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true,
        model: 'saaras:v4',
        provider: 'sarvam',
        message: 'Sarvam AI speech recognition is ready.',
      }),
    });
    global.fetch = mockFetch;

    const status = await api.getSpeechStatus();
    expect(status.configured).toBe(true);
    expect(status.model).toBe('saaras:v4');
    expect(status.provider).toBe('sarvam');
    expect(mockFetch).toHaveBeenCalledWith('/api/speech/status');
  });

  it('transcribeAudio sends multipart FormData and returns Sarvam transcript', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        transcript: 'വൈകുന്നേരം 6 മണിക്ക് വിളിക്കുക',
        language_code: 'ml-IN',
        request_id: 'req-sarvam-123',
        model: 'saaras:v4',
        mode: 'transcribe',
      }),
    });
    global.fetch = mockFetch;

    const dummyBlob = new Blob(['dummy audio bytes'], { type: 'audio/webm' });
    const response = await api.transcribeAudio(dummyBlob, 'ml');

    expect(response.transcript).toBe('വൈകുന്നേരം 6 മണിക്ക് വിളിക്കുക');
    expect(response.language_code).toBe('ml-IN');
    expect(response.model).toBe('saaras:v4');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/speech/transcribe',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
  });

  it('transcribeAudio handles structured error from backend', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        detail: {
          code: 'SARVAM_NOT_CONFIGURED',
          message: 'Sarvam API key is not configured on the backend.',
          suggestion: 'Set SARVAM_API_KEY in .env file.',
        },
      }),
    });
    global.fetch = mockFetch;

    const dummyBlob = new Blob(['dummy audio bytes'], { type: 'audio/webm' });
    await expect(api.transcribeAudio(dummyBlob, 'en')).rejects.toThrow(ApiError);
  });
});
