/**
 * API Client for NEXLINK Server
 * 
 * Handles authentication, request signing, and error handling.
 */

const API_URL = import.meta.env.VITE_API_URL;

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error('VITE_API_URL not configured');
  }

  const token = localStorage.getItem('nexlink_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token && token !== 'demo-token') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: 'UNKNOWN_ERROR', 
      message: `Request failed (${response.status})` 
    }));
    throw new ApiError(response.status, error.error || 'UNKNOWN_ERROR', error.message || 'Request failed');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  
  post: <T>(endpoint: string, body?: any) => 
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

export { ApiError };
