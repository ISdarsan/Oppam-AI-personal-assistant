export type Language = 'en' | 'ml';
export type TextSize = 'normal' | 'large' | 'xlarge';

export interface Reminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24-hour)
  description?: string;
  completed: boolean;
  createdAt: number;
}

export interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  notes?: string;
}

export interface UserSettings {
  language: Language;
  displayName: string;
  textSize: TextSize;
  autoSpeak: boolean;
  speechRate: number;
  completedOnboarding: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  ollama_connected: boolean;
  model_available: boolean;
  configured_model: string;
  available_models: string[];
  message: string;
}

export interface ReminderIntentData {
  title: string;
  date?: string;
  time?: string;
  description?: string;
  requires_confirmation: boolean;
}

export interface AssistantResponse {
  intent: 'create_reminder' | 'view_reminders' | 'explain_message' | 'general_qa' | 'clarification_needed' | 'unknown';
  spoken_response: string;
  reminder_data?: ReminderIntentData | null;
  clarification_prompt?: string | null;
  model_used: string;
  confidence: number;
}

export interface ExplainResponse {
  simple_summary: string;
  key_details: string[];
  action_items: string[];
  warnings_and_checks: string[];
  is_suspicious: boolean;
  model_used: string;
}
