import api from './api';

export interface Session {
  _id: string;
  lecturerId?: string;
  course: string;
  activeStatus: boolean;
  startTime: string | null;
  endTime?: string | null;
  latitude?: number;
  longitude?: number;
  radius?: number;
  qrToken?: string;
  qrExpiry?: string;
  studentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionResponse {
  session: Session;
  qrCode?: string;
}

export interface SessionsResponse {
  sessions: Session[];
}

export const createSession = async (course: string): Promise<SessionResponse> => {
  const response = await api.post<SessionResponse>('/api/sessions', { course });
  return response.data;
};

export const startSession = async (id: string, latitude: number, longitude: number): Promise<SessionResponse> => {
  const response = await api.patch<SessionResponse>(`/api/sessions/${id}/start`, {
    latitude,
    longitude,
  });

  return response.data;
};

export const stopSession = async (id: string): Promise<SessionResponse> => {
  const response = await api.patch<SessionResponse>(`/api/sessions/${id}/stop`);
  return response.data;
};

export const getSession = async (id: string): Promise<SessionResponse> => {
  const response = await api.get<SessionResponse>(`/api/sessions/${id}`);
  return response.data;
};

export const getMySessions = async (): Promise<SessionsResponse> => {
  const response = await api.get<SessionsResponse>('/api/sessions/my');
  return response.data;
};
