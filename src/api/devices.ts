/**
 * Device API endpoints
 */

import { api } from './client';

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  status: 'online' | 'offline' | 'pending' | 'revoked';
  osType: string;
  osVersion?: string;
  agentVersion?: string;
  publicKey: string;
  lastSeen?: string;
  createdAt: string;
  approved: boolean;
}

export interface DeviceListResponse {
  devices: Device[];
  total: number;
}

export interface RegisterDeviceRequest {
  name: string;
  publicKey: string;
  osType: 'windows' | 'linux' | 'macos';
  osVersion?: string;
  agentVersion?: string;
}

export interface RegisterDeviceResponse {
  id: string;
  deviceId: string;
  name: string;
  status: string;
  approved: boolean;
  enrollmentToken: string;
}

export const devicesApi = {
  list: () => api.get<DeviceListResponse>('/api/v1/devices'),
  
  get: (id: string) => api.get<Device>(`/api/v1/devices/${id}`),
  
  register: (data: RegisterDeviceRequest) => 
    api.post<RegisterDeviceResponse>('/api/v1/devices', data),
  
  approve: (id: string) => 
    api.patch<{ id: string; approved: boolean }>(`/api/v1/devices/${id}/approve`),
  
  revoke: (id: string) => 
    api.patch<{ id: string; revoked: boolean }>(`/api/v1/devices/${id}/revoke`),
  
  delete: (id: string) => api.delete<void>(`/api/v1/devices/${id}`),
};
