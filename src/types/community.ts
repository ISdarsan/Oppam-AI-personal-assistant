// Types for the community backend (roles, help requests, family connect, SOS).
export type Role = 'senior' | 'helper' | 'family';

export interface SessionUser {
  user_id: string;
  name: string;
  role: Role;
  area?: string | null;
  token: string;
}

export type HelpCategory =
  | 'medicine'
  | 'grocery'
  | 'hospital_assistance'
  | 'transportation'
  | 'ration_shop'
  | 'bank'
  | 'government_office'
  | 'other';

export type HelpPriority = 'low' | 'normal' | 'high' | 'urgent';
export type RequestStatus = 'OPEN' | 'ACCEPTED' | 'ON_THE_WAY' | 'COMPLETED' | 'CANCELLED';

export interface HelpDraft {
  title: string;
  category: HelpCategory;
  description: string;
  priority: HelpPriority;
  requires_confirmation?: boolean;
}

export interface InterpretRequestResult {
  interpreted: HelpDraft;
  source: 'ollama' | 'fallback';
  model_used: string | null;
  spoken_response: string;
  created: boolean;
}

export interface CommunityRequest {
  request_id: string;
  senior_id: string;
  senior_name: string;
  title: string;
  category: HelpCategory;
  description: string;
  priority: HelpPriority;
  location_hint: string | null;
  status: RequestStatus;
  helper_id: string | null;
  helper_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyConnection {
  connection_id: number;
  status: 'INVITED' | 'PENDING' | 'APPROVED' | 'REVOKED';
  senior_id: string;
  senior_name: string;
  family_id: string | null;
  family_name: string | null;
  code: string | null;
  created_at: string;
  updated_at: string;
}

export interface SosEvent {
  event_id: string;
  senior_id: string;
  senior_name: string;
  message: string | null;
  location_hint: string | null;
  status: 'ACTIVE' | 'ACKNOWLEDGED';
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  notified_family_count?: number;
}

export interface AppNotification {
  notification_id: string;
  type: string;
  message: string;
  request_id: string | null;
  sos_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface FamilyUpdates {
  seniors: { senior_id: string; name: string }[];
  requests: {
    request_id: string;
    senior_id: string;
    title: string;
    category: HelpCategory;
    status: RequestStatus;
    helper_name: string | null;
    updated_at: string;
  }[];
  sos_events: {
    event_id: string;
    senior_id: string;
    message: string | null;
    location_hint: string | null;
    status: 'ACTIVE' | 'ACKNOWLEDGED';
    created_at: string;
    acknowledged_by: string | null;
  }[];
}
