import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Demo mode is ONLY enabled when explicitly set via environment variable
// In production builds, this is always false
const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('nexlink_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('nexlink_token');
  });

  const login = useCallback(async (email: string, password: string) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    
    if (!apiUrl) {
      throw new Error('API URL not configured. Set VITE_API_URL environment variable.');
    }
    
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || `Login failed (${response.status})`);
    }
    
    const data = await response.json();
    setUser(data.user);
    setAccessToken(data.accessToken);
    localStorage.setItem('nexlink_user', JSON.stringify(data.user));
    localStorage.setItem('nexlink_token', data.accessToken);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    
    if (!apiUrl) {
      throw new Error('API URL not configured. Set VITE_API_URL environment variable.');
    }
    
    const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(error.message || `Registration failed (${response.status})`);
    }
    
    const data = await response.json();
    setUser(data.user);
    setAccessToken(data.accessToken);
    localStorage.setItem('nexlink_user', JSON.stringify(data.user));
    localStorage.setItem('nexlink_token', data.accessToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('nexlink_user');
    localStorage.removeItem('nexlink_token');
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      accessToken,
      login: DEMO_MODE ? createDemoLogin(login) : login,
      register: DEMO_MODE ? createDemoRegister(register) : register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Demo mode wrappers — only used when VITE_DEMO_MODE=true in development
function createDemoLogin(realLogin: (email: string, password: string) => Promise<void>) {
  return async (email: string, password: string) => {
    try {
      await realLogin(email, password);
    } catch {
      // Demo fallback — only in explicit demo mode
      console.warn('[DEMO MODE] Server unavailable, using demo authentication');
      const demoUser: User = {
        id: 'demo-user-1',
        email,
        name: email.split('@')[0],
        role: 'owner',
      };
      localStorage.setItem('nexlink_user', JSON.stringify(demoUser));
      localStorage.setItem('nexlink_token', 'demo-token');
      window.location.reload();
    }
  };
}

function createDemoRegister(realRegister: (email: string, password: string, name: string) => Promise<void>) {
  return async (email: string, password: string, name: string) => {
    try {
      await realRegister(email, password, name);
    } catch {
      console.warn('[DEMO MODE] Server unavailable, using demo authentication');
      const demoUser: User = {
        id: 'demo-user-1',
        email,
        name,
        role: 'owner',
      };
      localStorage.setItem('nexlink_user', JSON.stringify(demoUser));
      localStorage.setItem('nexlink_token', 'demo-token');
      window.location.reload();
    }
  };
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
