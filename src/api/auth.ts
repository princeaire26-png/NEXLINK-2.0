/**
 * Auth API endpoints
 */

import { api } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/api/v1/auth/login', data),
  
  register: (data: RegisterRequest) => api.post<AuthResponse>('/api/v1/auth/register', data),
  
  refresh: (refreshToken: string) => 
    api.post<RefreshResponse>('/api/v1/auth/refresh', { refreshToken }),
  
  logout: () => api.post<{ message: string }>('/api/v1/auth/logout'),
};
