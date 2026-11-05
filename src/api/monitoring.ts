/**
 * Monitoring API
 */

import { api } from './client';

export interface DeviceMetrics {
  deviceId: string;
  deviceIdentity: string;
  name: string;
  status: string;
  lastSeen?: string;
  lastMetricsAt?: string;
  metrics: {
    cpu: number | null;
    cpuCores: number | null;
    memory: {
      total: number | null;
      used: number | null;
      percent: number | null;
    };
    disk: {
      total: number | null;
      used: number | null;
      percent: number | null;
    };
    uptime: number | null;
  } | null;
}

export interface DeviceStatus {
  deviceId: string;
  deviceIdentity: string;
  name: string;
  status: string;
  approved: boolean;
  isOnline: boolean;
  lastSeen?: string;
  osType: string;
  osVersion?: string;
  agentVersion?: string;
}

export interface MonitoringSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  pendingDevices: number;
  revokedDevices: number;
}

export const monitoringApi = {
  getMetrics: (deviceId: string) =>
    api.get<DeviceMetrics>(`/api/v1/monitoring/devices/${deviceId}/metrics`),

  getStatus: (deviceId: string) =>
    api.get<DeviceStatus>(`/api/v1/monitoring/devices/${deviceId}/status`),

  getSummary: () => api.get<MonitoringSummary>('/api/v1/monitoring/summary'),
};
