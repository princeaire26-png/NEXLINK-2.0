/**
 * Enrollment API
 */

import { api } from './client';

export interface CreateEnrollmentResponse {
  enrollmentToken: string;
  deviceId: string;
  expiresAt: string;
}

export interface EnrollmentStatusResponse {
  valid: boolean;
  used: boolean;
  expired: boolean;
  expiresAt: string;
}

export interface EnrollDeviceRequest {
  enrollmentToken: string;
  deviceId: string;
  publicKey: string;
  signature: string;
  osType: 'windows' | 'linux' | 'macos';
  osVersion?: string;
  agentVersion?: string;
  timestamp: number;
}

export interface EnrollDeviceResponse {
  deviceId: string;
  deviceIdentity: string;
  status: string;
  message: string;
}

export const enrollmentApi = {
  create: (deviceName: string) =>
    api.post<CreateEnrollmentResponse>('/api/v1/enrollment/create', { deviceName }),

  status: (token: string) =>
    api.get<EnrollmentStatusResponse>(`/api/v1/enrollment/status/${token}`),

  enroll: (data: EnrollDeviceRequest) =>
    api.post<EnrollDeviceResponse>('/api/v1/enrollment/enroll', data),

  cancel: (token: string) =>
    api.post<{ cancelled: boolean }>(`/api/v1/enrollment/cancel/${token}`),
};
