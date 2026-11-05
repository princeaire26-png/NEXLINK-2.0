/**
 * Sessions API
 */

import { api } from './client';

export interface Session {
  id: string;
  type: 'remote_desktop' | 'terminal' | 'file_transfer' | 'ai_assistant';
  status: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  deviceId: string;
  deviceName?: string;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
}

export interface StartSessionRequest {
  deviceId: string;
  type: 'remote_desktop' | 'terminal' | 'file_transfer' | 'ai_assistant';
}

export interface StartSessionResponse {
  id: string;
  type: string;
  status: string;
  startedAt: string;
}

export const sessionsApi = {
  list: () => api.get<SessionListResponse>('/api/v1/sessions'),

  start: (data: StartSessionRequest) =>
    api.post<StartSessionResponse>('/api/v1/sessions', data),

  end: (sessionId: string) =>
    api.post<{ id: string; status: string; duration: number }>(`/api/v1/sessions/${sessionId}/end`),
};
