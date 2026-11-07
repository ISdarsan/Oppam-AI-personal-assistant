import { session } from './session';
import {
  AppNotification,
  CommunityRequest,
  FamilyConnection,
  FamilyUpdates,
  HelpDraft,
  InterpretRequestResult,
  Role,
  SessionUser,
  SosEvent,
} from '../types/community';
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

/** Authenticated JSON call to the community backend. A 401 means the session is stale: sign the user out. */
async function authed<T>(method: string, path: string, body?: unknown): Promise<T> {
  const user = session.get();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(user ? { Authorization: `Bearer ${user.token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the Oppam server.', 'CONNECTION_ERROR', 'Check that the backend is running.');
  }
  if (!res.ok) {
    let detail: { code?: string; message?: string; suggestion?: string } = {};
    try {
      const data = await res.json();
      detail = Array.isArray(data.detail) ? { message: data.detail[0]?.msg } : data.detail || {};
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401 && user) session.clear();
    throw new ApiError(
      detail.message || `Request failed (HTTP ${res.status})`,
      detail.code || `HTTP_${res.status}`,
      detail.suggestion
    );
  }
  return (await res.json()) as T;
}

export const api = {
  // ---- Community backend ----
  login: (name: string, role: Role, area?: string) =>
    authed<SessionUser>('POST', '/demo/login', { name, role, ...(area ? { area } : {}) }),
  interpretRequest: (text: string, language: string) =>
    authed<InterpretRequestResult>('POST', '/ai/interpret-request', { text, language }),
  createRequest: (draft: HelpDraft) =>
    authed<CommunityRequest>('POST', '/community/requests', {
      title: draft.title,
      category: draft.category,
      description: draft.description,
      priority: draft.priority,
    }),
  listRequests: () => authed<{ requests: CommunityRequest[]; count: number }>('GET', '/community/requests'),
  acceptRequest: (id: string) => authed<CommunityRequest>('POST', `/community/requests/${id}/accept`),
  setRequestStatus: (id: string, status: 'ON_THE_WAY' | 'COMPLETED' | 'CANCELLED') =>
    authed<CommunityRequest>('PATCH', `/community/requests/${id}/status`, { status }),
  createInvitation: () => authed<{ connection_id: number; code: string; status: string }>('POST', '/family/invitation'),
  linkWithCode: (code: string) => authed<FamilyConnection>('POST', '/family/link', { code }),
  approveLink: (connection_id: number, approve: boolean) =>
    authed<FamilyConnection>('POST', '/family/approve', { connection_id, approve }),
  revokeLink: (connection_id: number) => authed<FamilyConnection>('POST', '/family/revoke', { connection_id }),
  linkedConnections: () => authed<{ connections: FamilyConnection[]; count: number }>('GET', '/family/linked-senior'),
  familyUpdates: () => authed<FamilyUpdates>('GET', '/family/updates'),
  triggerSos: (message?: string) => authed<SosEvent>('POST', '/sos', message ? { message } : {}),
  listSos: () => authed<{ events: SosEvent[]; count: number }>('GET', '/sos'),
  acknowledgeSos: (id: string) => authed<SosEvent>('POST', `/sos/${id}/acknowledge`),
  notifications: () => authed<{ notifications: AppNotification[]; unread_count: number }>('GET', '/notifications'),
  markNotificationRead: (id: string) => authed<AppNotification>('PATCH', `/notifications/${id}/read`),

  // ---- Existing local-first endpoints ----
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
        configured_model: 'gemma3:4b',
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
        'Cannot connect to Oppam speech service. Ensure backend is running.',
        'SPEECH_CONNECTION_ERROR',
        'Verify backend is running on port 8000.'
      );
    }
  },

  async interpretAssistant(text: string, language: Language, userTime?: string, history: { role: 'user' | 'assistant'; text: string }[] = []): Promise<AssistantResponse> {
    try {
      const res = await fetch('/api/assistant/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language,
          user_time: userTime || new Date().toISOString(),
          history,
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
        'Cannot connect to Oppam service. Ensure backend is running.',
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
        'Cannot connect to Oppam service.',
        'CONNECTION_ERROR',
        'Check backend connection.'
      );
    }
  },
};
