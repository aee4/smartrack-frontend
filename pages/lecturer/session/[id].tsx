import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AnimatePresence, animate, motion } from 'framer-motion';
import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LecturerSidebar } from '@/components/lecturer-sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSocket } from '@/hooks/useSocket';
import * as attendanceService from '@/services/attendanceService';
import * as sessionService from '@/services/sessionService';

interface Session {
  _id: string;
  course: string;
  activeStatus: boolean;
  startTime: string | null;
  qrToken?: string;
  qrExpiry?: string;
}

interface StudentRef {
  name?: string;
  email?: string;
}

interface AttendanceRow {
  _id: string;
  studentId?: StudentRef | string;
  studentName?: string;
  email?: string;
  status: 'present' | 'late';
  timestamp: string;
}

interface Analytics {
  present: number;
  late: number;
  absent: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function unwrapData<T>(result: unknown, key: string): T {
  if (result && typeof result === 'object' && key in result) {
    return (result as Record<string, T>)[key];
  }

  return result as T;
}

function formatStartTime(value?: string | null) {
  if (!value) return 'Not started';

  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTableTime(value: string) {
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function getStudentName(row: AttendanceRow) {
  if (row.studentId && typeof row.studentId === 'object' && row.studentId.name) return row.studentId.name;
  return row.studentName ?? 'Unknown Student';
}

function getStudentEmail(row: AttendanceRow) {
  if (row.studentId && typeof row.studentId === 'object' && row.studentId.email) return row.studentId.email;
  return row.email ?? '—';
}

function CountUpNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const latestValue = useRef(0);

  useEffect(() => {
    const controls = animate(latestValue.current, value, {
      duration: 0.7,
      ease: 'easeOut',
      onUpdate: (latest) => {
        latestValue.current = latest;
        setDisplayValue(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [value]);

  return <span className={className}>{displayValue}</span>;
}

export default function SessionDetail() {
  const router = useRouter();
  const { user } = useAuth();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const { latitude, longitude, error: locationError, getLocation } = useGeolocation();
  const { lastUpdate, connected } = useSocket(id);

  const [session, setSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({ present: 0, late: 0, absent: 0 });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  const [flashRowIds, setFlashRowIds] = useState<string[]>([]);

  const sessionActive = Boolean(session?.activeStatus);
  const qrExpired = remainingMs <= 0;

  const generateQrFromSession = useCallback(async (nextSession: Session) => {
    if (nextSession.activeStatus && nextSession.qrToken) {
      const qrData = JSON.stringify({ sessionId: nextSession._id, qrToken: nextSession.qrToken });
      const dataUrl = await QRCode.toDataURL(qrData);
      setQrCode(dataUrl);
    }
  }, []);

  useEffect(() => {
    if (!id || !user) return;

    const loadSession = async () => {
      setLoading(true);

      try {
        const [sessionResult, attendanceResult, analyticsResult] = await Promise.all([
          sessionService.getSession(id),
          attendanceService.getSessionAttendance(id),
          attendanceService.getAnalytics(id),
        ]);

        const nextSession = unwrapData<Session>(sessionResult, 'session');
        const nextAttendance = unwrapData<AttendanceRow[]>(attendanceResult, 'attendance');
        const nextAnalytics = unwrapData<Analytics>(analyticsResult, 'analytics');

        setSession(nextSession);
        setAttendance(Array.isArray(nextAttendance) ? nextAttendance : []);
        setAnalytics({
          present: nextAnalytics?.present ?? 0,
          late: nextAnalytics?.late ?? 0,
          absent: nextAnalytics?.absent ?? 0,
        });
        await generateQrFromSession(nextSession);
      } catch {
        setToast('Failed to load session');
        window.setTimeout(() => router.replace('/lecturer/dashboard'), 900);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [generateQrFromSession, id, router, user]);

  useEffect(() => {
    const updateRemaining = () => {
      if (!session?.qrExpiry) {
        setRemainingMs(0);
        return;
      }

      setRemainingMs(Math.max(0, new Date(session.qrExpiry).getTime() - Date.now()));
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(interval);
  }, [session?.qrExpiry]);

  useEffect(() => {
    if (!lastUpdate) return;

    const idForRow = `socket-${lastUpdate.studentId}-${lastUpdate.timestamp}`;
    const nextRow: AttendanceRow = {
      _id: idForRow,
      studentId: {
        name: lastUpdate.studentName,
      },
      status: lastUpdate.status,
      timestamp: lastUpdate.timestamp,
    };

    setAttendance((current) => [nextRow, ...current]);
    setAnalytics((current) => ({
      ...current,
      present: lastUpdate.status === 'present' ? current.present + 1 : current.present,
      late: lastUpdate.status === 'late' ? current.late + 1 : current.late,
    }));
    setFlashRowIds((current) => [...current, idForRow]);
    window.setTimeout(() => {
      setFlashRowIds((current) => current.filter((rowId) => rowId !== idForRow));
    }, 2000);
  }, [lastUpdate]);

  useEffect(() => {
    if (!pendingStart) return;

    if (locationError) {
      setToast(locationError);
      setPendingStart(false);
      setStarting(false);
      return;
    }

    if (latitude === null || longitude === null || !id) return;

    const start = async () => {
      try {
        const result = await sessionService.startSession(id, latitude, longitude);
        const nextSession = unwrapData<Session>(result, 'session');
        const nextQrCode = (result as { qrCode?: string }).qrCode;

        setSession(nextSession);
        setQrCode(nextQrCode ?? null);
        setToast('Session started successfully');
      } catch {
        setToast('Failed to start session. Please try again.');
      } finally {
        setPendingStart(false);
        setStarting(false);
      }
    };

    start();
  }, [id, latitude, locationError, longitude, pendingStart]);

  const handleStartSession = () => {
    setStarting(true);
    setPendingStart(true);
    getLocation();
  };

  const handleStopSession = async () => {
    if (!id) return;

    setStopping(true);

    try {
      const result = await sessionService.stopSession(id);
      const nextSession = unwrapData<Session>(result, 'session');
      setSession(nextSession);
      setQrCode(null);
      setStopModalOpen(false);
      setToast('Session stopped successfully');
    } catch {
      setToast('Failed to stop session. Please try again.');
    } finally {
      setStopping(false);
    }
  };

  const handleExport = async () => {
    if (!id) return;

    setExporting(true);

    try {
      await attendanceService.exportCSV(id);
    } catch {
      setToast('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="lecturer">
      <>
        <Head>
          <title>{session?.course ?? 'Session'} | SmartAttend</title>
          <meta name="description" content="View SmartAttend session details." />
        </Head>

        <div className="min-h-screen bg-white text-ink">
          <div className="hidden fixed inset-y-0 left-0 z-30 w-72 lg:block">
            <LecturerSidebar />
          </div>

          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white/95 px-5 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="border border-border px-3 py-2 text-xl leading-none text-ink transition hover:border-gold"
              aria-label="Open navigation"
            >
              ☰
            </button>
            <Link href="/" className="font-serif text-3xl font-semibold text-gold">
              SmartAttend
            </Link>
            <span className="w-11" />
          </header>

          <AnimatePresence>
            {mobileSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/45 lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="h-full w-80 max-w-[86vw]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <LecturerSidebar onClose={() => setMobileSidebarOpen(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="lg:pl-72">
            <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <Link
                    href="/lecturer/dashboard"
                    className="inline-flex items-center text-sm font-semibold text-muted transition hover:text-gold"
                  >
                    ← Back to dashboard
                  </Link>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <motion.h1
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="font-serif text-4xl font-semibold leading-tight text-ink md:text-5xl"
                    >
                      {session?.course ?? 'Loading session...'}
                    </motion.h1>
                    <span
                      className={`w-fit px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                        sessionActive ? 'bg-gold text-ink' : 'bg-[#EDEDED] text-muted'
                      }`}
                    >
                      {sessionActive ? '🟢 Active' : '⚫ Closed'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Session started at {formatStartTime(session?.startTime)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {session && !session.activeStatus && session.startTime === null && (
                    <button
                      type="button"
                      onClick={handleStartSession}
                      disabled={starting}
                      className="w-fit border border-gold px-5 py-3 text-sm font-semibold text-gold transition duration-200 hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="inline-flex items-center gap-2">
                        {starting && <span className="h-4 w-4 animate-spin rounded-full border border-gold/40 border-t-gold" />}
                        Start Session
                      </span>
                    </button>
                  )}
                  {sessionActive && (
                    <button
                      type="button"
                      onClick={() => setStopModalOpen(true)}
                      className="w-fit border border-red-600 px-5 py-3 text-sm font-semibold text-red-600 transition duration-200 hover:bg-red-600 hover:text-white"
                    >
                      Stop Session
                    </button>
                  )}
                </div>
              </div>

              {!sessionActive && session?.startTime !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="mt-8 border border-border bg-[#F7F7F7] px-5 py-4 text-sm font-semibold text-muted"
                >
                  Session Closed
                </motion.div>
              )}

              <div className="mt-10 grid gap-8 lg:grid-cols-[0.4fr_0.6fr]">
                <aside className="lg:sticky lg:top-8 lg:self-start">
                  <section className="border border-border bg-white p-6 shadow-[0_12px_30px_rgba(10,10,10,0.04)]">
                    <h2 className="font-serif text-3xl font-semibold text-gold">Scan to Attend</h2>

                    {loading ? (
                      <div className="skeleton-shimmer mt-7 h-64 w-full" />
                    ) : sessionActive && qrCode ? (
                      <div className="mt-7 text-center">
                        <div className="mx-auto inline-block border border-gold p-4">
                          <img src={qrCode} alt="QR Code" className="h-[250px] w-[250px]" />
                        </div>

                        <p className="mt-7 text-sm font-medium text-muted">QR expires in</p>
                        {qrExpired ? (
                          <p className="mt-2 text-sm font-semibold text-red-600">
                            QR Expired — Restart session to regenerate
                          </p>
                        ) : (
                          <p className="mt-1 font-serif text-5xl font-semibold text-gold">
                            {formatCountdown(remainingMs)}
                          </p>
                        )}
                        <p className="mt-4 text-sm text-muted">QR refreshes automatically every 5 minutes</p>
                      </div>
                    ) : (
                      <div className="mt-7 flex min-h-[330px] items-center justify-center border border-border bg-[#F3F3F3] px-8 text-center text-muted">
                        Session is closed. No new attendance accepted.
                      </div>
                    )}
                  </section>
                </aside>

                <section>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    transition={{ staggerChildren: 0.08 }}
                    className="grid gap-4 sm:grid-cols-3"
                  >
                    {[
                      { label: 'Present', icon: '✅', value: analytics.present, color: 'text-gold' },
                      { label: 'Late', icon: '🕐', value: analytics.late, color: 'text-amber-500' },
                      { label: 'Absent', icon: '❌', value: analytics.absent, color: 'text-red-600' },
                    ].map((counter) => (
                      <motion.article
                        key={counter.label}
                        variants={fadeUp}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="border border-border bg-white p-5 shadow-[0_10px_28px_rgba(10,10,10,0.035)]"
                      >
                        <p className="text-sm font-medium text-muted">
                          <span aria-hidden="true">{counter.icon}</span> {counter.label}
                        </p>
                        <p className={`mt-3 font-serif text-5xl font-semibold ${counter.color}`}>
                          <CountUpNumber value={counter.value} />
                        </p>
                      </motion.article>
                    ))}
                  </motion.div>

                  <section className="mt-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="font-serif text-3xl font-semibold text-ink">Live Attendance</h2>
                      <button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting}
                        className="w-fit border border-gold px-4 py-2 text-sm font-semibold text-gold transition duration-200 hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Export CSV
                      </button>
                    </div>

                    <div className={`mt-5 flex items-center gap-2 border border-border bg-[#FAFAFA] px-4 py-3 text-sm font-semibold ${connected ? 'text-ink' : 'text-muted'}`}>
                      {connected ? (
                        <>
                          <span className="relative flex h-3 w-3" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-600 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                          </span>
                          Live — updating in real time
                        </>
                      ) : (
                        <>⚪ Reconnecting...</>
                      )}
                    </div>

                    <div className="mt-4 overflow-x-auto border border-border bg-white">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-border bg-[#FAFAFA] text-xs uppercase tracking-[0.12em] text-muted">
                          <tr>
                            <th className="px-4 py-4 font-semibold">#</th>
                            <th className="px-4 py-4 font-semibold">Student Name</th>
                            <th className="px-4 py-4 font-semibold">Email</th>
                            <th className="px-4 py-4 font-semibold">Status</th>
                            <th className="px-4 py-4 font-semibold">Time</th>
                          </tr>
                        </thead>
                        <motion.tbody
                          initial="hidden"
                          animate="visible"
                          transition={{ staggerChildren: 0.06 }}
                          className="divide-y divide-border"
                        >
                          {loading ? (
                            [1, 2, 3].map((item) => (
                              <tr key={item}>
                                <td className="px-4 py-4" colSpan={5}>
                                  <div className="skeleton-shimmer h-5 w-full" />
                                </td>
                              </tr>
                            ))
                          ) : attendance.length === 0 ? (
                            <tr>
                              <td className="px-4 py-10 text-center text-muted" colSpan={5}>
                                No students have checked in yet.
                              </td>
                            </tr>
                          ) : (
                            attendance.map((row, index) => {
                              const flashing = flashRowIds.includes(row._id);

                              return (
                                <motion.tr
                                  key={row._id}
                                  layout
                                  variants={fadeUp}
                                  initial="hidden"
                                  animate="visible"
                                  transition={{ duration: 0.35, ease: 'easeOut' }}
                                  className={`transition-colors duration-500 ${
                                    flashing ? 'border-l-4 border-l-gold bg-[#FFF8E3]' : 'border-l-4 border-l-transparent'
                                  }`}
                                >
                                  <td className="px-4 py-4 text-muted">{index + 1}</td>
                                  <td className="px-4 py-4 font-semibold text-ink">{getStudentName(row)}</td>
                                  <td className="px-4 py-4 text-muted">{getStudentEmail(row)}</td>
                                  <td className="px-4 py-4">
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase text-white ${
                                        row.status === 'present' ? 'bg-green-600' : 'bg-amber-500'
                                      }`}
                                    >
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-muted">{formatTableTime(row.timestamp)}</td>
                                </motion.tr>
                              );
                            })
                          )}
                        </motion.tbody>
                      </table>
                    </div>
                  </section>
                </section>
              </div>
            </div>
          </main>
        </div>

        <AnimatePresence>
          {stopModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-5"
              onClick={() => setStopModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="w-full max-w-md bg-white p-7 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 className="font-serif text-4xl font-semibold text-ink">Stop this session?</h2>
                <p className="mt-4 leading-7 text-muted">
                  Students will no longer be able to submit attendance.
                </p>
                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setStopModalOpen(false)}
                    className="border border-border px-5 py-3 text-sm font-semibold text-muted transition hover:border-ink hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStopSession}
                    disabled={stopping}
                    className="bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {stopping && (
                        <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-white" />
                      )}
                      Stop Session
                    </span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <Toast message={toast} onClose={() => setToast('')} />
      </>
    </ProtectedRoute>
  );
}
