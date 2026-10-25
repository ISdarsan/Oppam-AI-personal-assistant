export type Language =
  | 'en' // English
  | 'ml' // Malayalam (മലയാളം)
  | 'es' // Spanish (Español)
  | 'fr' // French (Français)
  | 'de' // German (Deutsch)
  | 'pt' // Portuguese (Português)
  | 'it' // Italian (Italiano)
  | 'ar' // Arabic (العربية)
  | 'ja' // Japanese (日本語)
  | 'zh'; // Chinese (中文)

export type TextSize = 'normal' | 'large' | 'xlarge';

export type ReminderCategory = 'medicine' | 'doctor' | 'call' | 'water' | 'general';

export interface Reminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24-hour)
  description?: string;
  category?: ReminderCategory;
  completed: boolean;
  completedAt?: number;
  createdAt: number;
}

export interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  notes?: string;
  isPrimary?: boolean;
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
  category?: ReminderCategory;
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
