import api from './api';

const BACKEND_URL = 'https://smartrack-backend.onrender.com';

export interface StudentRef {
  _id?: string;
  name?: string;
  email?: string;
}

export interface SessionRef {
  _id?: string;
  course?: string;
  startTime?: string;
}

export interface AttendanceRecord {
  _id: string;
  studentId?: StudentRef | string;
  sessionId?: SessionRef | string;
  studentName?: string;
  email?: string;
  status: 'present' | 'late';
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

export interface SubmitAttendanceResponse {
  attendance: AttendanceRecord;
  record?: AttendanceRecord;
  status: 'present' | 'late';
  session?: SessionRef;
}

export interface AttendanceListResponse {
  attendance: AttendanceRecord[];
  records?: AttendanceRecord[];
}

export interface AnalyticsResponse {
  present: number;
  late: number;
  absent: number;
  analytics?: {
    present: number;
    late: number;
    absent: number;
  };
}

export const submitAttendance = async (
  sessionId: string,
  qrToken: string,
  deviceId: string,
  latitude: number,
  longitude: number,
): Promise<SubmitAttendanceResponse> => {
  const response = await api.post<SubmitAttendanceResponse>(`${BACKEND_URL}/api/attendance/submit`, {
    sessionId,
    qrToken,
    deviceId,
    latitude,
    longitude,
  });

  return response.data;
};

export const getSessionAttendance = async (sessionId: string): Promise<AttendanceListResponse> => {
  const response = await api.get<AttendanceListResponse>(`${BACKEND_URL}/api/attendance/session/${sessionId}`);
  return response.data;
};

export const getMyAttendance = async (): Promise<AttendanceListResponse> => {
  const response = await api.get<AttendanceListResponse>(`${BACKEND_URL}/api/attendance/student/me`);
  return response.data;
};

export const getAnalytics = async (sessionId: string): Promise<AnalyticsResponse> => {
  const response = await api.get<AnalyticsResponse>(`${BACKEND_URL}/api/attendance/analytics/${sessionId}`);
  return response.data;
};

export const exportCSV = async (sessionId: string): Promise<void> => {
  const response = await api.get<Blob>(`${BACKEND_URL}/api/attendance/export/${sessionId}`, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `attendance_${sessionId}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};
