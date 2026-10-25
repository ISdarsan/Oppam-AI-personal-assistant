import { AssistantResponse, ExplainResponse, HealthStatus, Language } from '../types';

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
        message: e instanceof Error ? e.message : 'Cannot reach backend service.',
      };
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
        'Cannot connect to Sahaaya AI service. Ensure backend is running.',
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
        'Cannot connect to Sahaaya AI service.',
        'CONNECTION_ERROR',
        'Verify backend server status.'
      );
    }
  },
};
