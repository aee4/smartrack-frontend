import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketHookResult {
  lastUpdate: AttendanceUpdate | null;
  connected: boolean;
}

interface AttendanceUpdate {
  studentName: string;
  studentId: string;
  status: 'present' | 'late';
  timestamp: string;
  latitude: number;
  longitude: number;
}

export function useSocket(sessionId: string): SocketHookResult {
  const [lastUpdate, setLastUpdate] = useState<AttendanceUpdate | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId || !process.env.NEXT_PUBLIC_SOCKET_URL) return undefined;

    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL);

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:session', { sessionId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('attendance:update', (payload: AttendanceUpdate) => {
      setLastUpdate(payload);
    });

    return () => {
      socket.emit('leave:session', { sessionId });
      socket.disconnect();
    };
  }, [sessionId]);

  return { lastUpdate, connected };
}
