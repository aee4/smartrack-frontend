import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import * as authService from '@/services/authService';
import type { User as ApiUser } from '@/services/authService';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: 'student' | 'lecturer' | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

interface DecodedToken {
  id: string;
  name: string;
  role: 'student' | 'lecturer';
  iat: number;
  exp: number;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const emptyAuthState = {
  user: null,
  token: null,
  role: null,
};

const normalizeUser = (apiUser: ApiUser, fallback: DecodedToken): User => ({
  id: apiUser.id ?? apiUser._id ?? fallback.id,
  name: apiUser.name ?? fallback.name,
  email: apiUser.email,
  role: apiUser.role ?? fallback.role,
});

const decodeToken = (token: string): DecodedToken => {
  const decoded = jwtDecode<DecodedToken>(token);

  if (decoded.exp * 1000 < Date.now()) {
    throw new Error('Token expired');
  }

  return decoded;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<'student' | 'lecturer' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const storedToken = localStorage.getItem('smartattend_token');

    if (!storedToken) {
      setLoading(false);
      return;
    }

    const hydrateUser = async () => {
      try {
        const decoded = decodeToken(storedToken);
        const me = await authService.getMe();
        const nextUser = normalizeUser(me.user, decoded);

        setUser(nextUser);
        setToken(storedToken);
        setRole(nextUser.role);
      } catch {
        localStorage.removeItem('smartattend_token');
        setUser(emptyAuthState.user);
        setToken(emptyAuthState.token);
        setRole(emptyAuthState.role);
      } finally {
        setLoading(false);
      }
    };

    hydrateUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    const decoded = decodeToken(response.token);
    const nextUser = normalizeUser(response.user, decoded);

    setUser(nextUser);
    setToken(response.token);
    setRole(nextUser.role);
  };

  const logout = () => {
    setUser(emptyAuthState.user);
    setToken(emptyAuthState.token);
    setRole(emptyAuthState.role);
    authService.logout();
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      role,
      login,
      logout,
      loading,
    }),
    [user, token, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
