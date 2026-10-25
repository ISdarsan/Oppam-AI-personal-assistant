import {
  AssistantResponse,
  ExplainResponse,
  HealthStatus,
  Language,
  SpeechTranscribeResponse,
  SpeechStatusResponse,
} from '../types';

export class ApiError extends Error {
  code: string;
  suggestion?: string;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', suggestion?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.suggestion = suggestion;
  }
}

const SARVAM_LANG_MAP: Record<string, string> = {
  ml: 'ml-IN',
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
};

export const api = {
  async getHealth(): Promise<HealthStatus> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`Health check returned HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      return {
        status: 'unavailable',
        ollama_connected: false,
        model_available: false,
        configured_model: 'gemma2:2b',
        available_models: [],
        sarvam_configured: false,
        sarvam_model: 'saaras:v4',
        message: e instanceof Error ? e.message : 'Cannot reach backend service.',
      };
    }
  },

  async getSpeechStatus(): Promise<SpeechStatusResponse> {
    try {
      const res = await fetch('/api/speech/status');
      if (!res.ok) {
        throw new Error(`Speech status check returned HTTP ${res.status}`);
      }
      return await res.json();
    } catch {
      return {
        configured: false,
        model: 'saaras:v4',
        provider: 'sarvam',
        message: 'Could not connect to backend speech service.',
      };
    }
  },

  async transcribeAudio(
    audioBlob: Blob,
    language: Language,
    filename = 'recording.webm'
  ): Promise<SpeechTranscribeResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    const targetLang = SARVAM_LANG_MAP[language] || (language === 'ml' ? 'ml-IN' : 'en-IN');
    formData.append('language', targetLang);

    try {
      const res = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          errData = { detail: { message: `Audio transcription failed with HTTP ${res.status}` } };
        }
        const detail = errData.detail || {};
        throw new ApiError(
          detail.message || 'Speech transcription failed.',
          detail.code || 'TRANSCRIPTION_FAILED',
          detail.suggestion
        );
      }

      return await res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        'Cannot connect to Koode speech service. Ensure backend is running.',
        'SPEECH_CONNECTION_ERROR',
        'Verify backend is running on port 8000.'
      );
    }
  },

  async interpretAssistant(text: string, language: Language, userTime?: string): Promise<AssistantResponse> {
    try {
      const res = await fetch('/api/assistant/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language,
          user_time: userTime || new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          errData = { detail: { message: `Request failed with HTTP ${res.status}` } };
        }
        const detail = errData.detail || {};
        throw new ApiError(
          detail.message || 'AI assistant is currently unavailable.',
          detail.code || 'AI_UNAVAILABLE',
          detail.suggestion
        );
      }

      return await res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        'Cannot connect to Koode AI service. Ensure backend is running.',
        'CONNECTION_ERROR',
        'Run uvicorn backend.app.main:app --reload'
      );
    }
  },

  async explainMessage(text: string, language: Language): Promise<ExplainResponse> {
    try {
      const res = await fetch('/api/messages/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          errData = { detail: { message: `Request failed with HTTP ${res.status}` } };
        }
        const detail = errData.detail || {};
        throw new ApiError(
          detail.message || 'Failed to explain message.',
          detail.code || 'EXPLAIN_ERROR',
          detail.suggestion
        );
      }

      return await res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        'Cannot connect to Koode AI service.',
        'CONNECTION_ERROR',
        'Check backend connection.'
      );
    }
  },
};
