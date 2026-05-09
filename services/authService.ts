import api from './api';

export type AuthRole = 'student' | 'lecturer';

export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: AuthRole;
  studentId?: string;
  courses?: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export const register = async (
  name: string,
  email: string,
  password: string,
  role: AuthRole,
  studentId?: string,
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/auth/register', {
    name,
    email,
    password,
    role,
    studentId,
  });

  return response.data;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/auth/login', {
    email,
    password,
  });

  const { token } = response.data;

  if (token && typeof window !== 'undefined') {
    localStorage.setItem('smartattend_token', token);
  }

  return response.data;
};

export const getMe = async (): Promise<MeResponse> => {
  const response = await api.get<MeResponse>('/api/auth/me');
  return response.data;
};

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('smartattend_token');
    window.location.href = '/login';
  }
};
