import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AnimatePresence, motion } from 'framer-motion';
import { isAxiosError } from 'axios';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ArrowLeftIcon, CheckIcon, ClockIcon } from '@/components/icons';
import * as attendanceService from '@/services/attendanceService';
import { getDeviceId } from '@/utils/deviceId';


type Step = 1 | 2 | 3;

interface ScanPayload {
  sessionId: string;
  qrToken: string;
}

const steps: Array<{ id: Step; label: string }> = [
  { id: 1, label: 'Scan QR' },
  { id: 2, label: 'Verify Location' },
  { id: 3, label: 'Confirmed' },
];

function StudentNavbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-gold bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Link href="/" className="font-serif text-3xl font-semibold text-gold">
          SmartAttend
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-muted sm:inline">{user?.name ?? 'Student'}</span>
          <button type="button" onClick={logout} className="font-semibold text-gold transition hover:text-ink">
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

function parseScannedResult(value: string, fallbackSessionId = ''): ScanPayload | null {
  const trimmedValue = value.trim();

  try {
    const parsed = JSON.parse(trimmedValue) as Partial<ScanPayload>;

    if (parsed.sessionId && parsed.qrToken) {
      return {
        sessionId: parsed.sessionId,
        qrToken: parsed.qrToken,
      };
    }
  } catch {
    if (fallbackSessionId && trimmedValue) {
      return {
        sessionId: fallbackSessionId,
        qrToken: trimmedValue,
      };
    }
  }

  return null;
}

function getSubmissionErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return 'Attendance submission failed. Please try again.';
  }

  const message = String(error.response?.data?.message ?? error.response?.data ?? '').toLowerCase();

  if (message.includes('invalid or expired qr code')) return 'This QR code is invalid or has expired';
  if (message.includes('qr code has expired')) return 'QR code has expired. Ask your lecturer to refresh it.';
  if (message.includes('session is no longer active')) return 'This session has been closed by your lecturer.';
  if (message.includes('device has already submitted attendance')) return 'You have already checked in for this session.';
  if (message.includes('too far from the classroom')) return 'You are too far from the classroom. Move closer and try again.';

  return 'Attendance submission failed. Please try again.';
}

function getSessionCourse(session: unknown) {
  if (session && typeof session === 'object' && 'course' in session) {
    return String((session as { course?: string }).course ?? '');
  }

  return null;
}

export default function StudentScan() {
  const router = useRouter();
  const { latitude, longitude, error: locationError, loading: locationLoading, getLocation } = useGeolocation();
  const [step, setStep] = useState<Step>(1);
  const [toast, setToast] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scanPayload, setScanPayload] = useState<ScanPayload | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState<'present' | 'late' | null>(null);
  const [confirmedCourse, setConfirmedCourse] = useState('Attendance confirmed');
  const [confirmedTimestamp, setConfirmedTimestamp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const submittedRef = useRef(false);

  const timestamp = useMemo(
    () =>
      confirmedTimestamp ||
      new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date()),
    [confirmedTimestamp],
  );

  const handleScannedValue = async (value: string, fallbackSessionId = '') => {
    const parsed = parseScannedResult(value, fallbackSessionId);

    if (!parsed) {
      setToast('This QR code is invalid or has expired');
      return;
    }

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Scanner may already be stopped by the browser.
      }
      scannerRef.current = null;
    }

    setScanPayload(parsed);
    submittedRef.current = false;
    setStep(2);
  };

  useEffect(() => {
    if (step !== 1 || scannerRef.current) return undefined;

    let mounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;

        const scanner = new Html5Qrcode('smartattend-qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            handleScannedValue(decodedText);
          },
          () => undefined,
        );
      } catch {
        if (mounted) {
          setToast('Camera permission is required to scan QR code');
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => undefined);
      }
    };
  }, [step]);

  useEffect(() => {
    if (step !== 2) return;
    getLocation();
  }, [getLocation, step]);

  useEffect(() => {
    if (step !== 2) return;
    if (locationError) return;
    if (latitude === null || longitude === null) return;

    setStep(3);
  }, [latitude, locationError, longitude, step]);

  useEffect(() => {
    if (step !== 3 || !scanPayload || submittedRef.current) return;
    if (latitude === null || longitude === null) return;

    const submit = async () => {
      submittedRef.current = true;
      setSubmitting(true);

      try {
        const result = await attendanceService.submitAttendance(
          scanPayload.sessionId,
          scanPayload.qrToken,
          getDeviceId(),
          latitude,
          longitude,
        );
        const attendance = result.attendance ?? result.record ?? result;
        const status = (result.status ?? attendance.status ?? 'present') as 'present' | 'late';

        setSubmittedStatus(status);
        setConfirmedCourse(getSessionCourse(attendance.sessionId) ?? result.session?.course ?? 'Attendance confirmed');
        setConfirmedTimestamp(
          new Intl.DateTimeFormat('en', {
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(attendance.timestamp ?? Date.now())),
        );
      } catch (error) {
        setToast(getSubmissionErrorMessage(error));
        setStep(1);
        setScanPayload(null);
        setSubmittedStatus(null);
        submittedRef.current = false;
      } finally {
        setSubmitting(false);
      }
    };

    submit();
  }, [latitude, longitude, scanPayload, step]);

  const submitManualCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fallbackSessionId = typeof router.query.sessionId === 'string' ? router.query.sessionId : '';
    handleScannedValue(manualCode, fallbackSessionId);
  };

  const tryAgain = () => {
    getLocation();
  };

  return (
    <ProtectedRoute requiredRole="student">
      <>
        <Head>
          <title>Mark Attendance | SmartAttend</title>
          <meta name="description" content="Scan a SmartAttend QR code." />
        </Head>

        <div className="min-h-screen bg-white text-ink">
          <StudentNavbar />

          <main className="mx-auto max-w-3xl px-5 py-8">
            <Link
              href="/student/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-gold"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to dashboard
            </Link>

            <section className="mt-6">
              <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">Mark Attendance</h1>
              <p className="mt-3 text-muted">Scan the QR code displayed by your lecturer.</p>
            </section>

            <nav className="mt-8 grid grid-cols-3 gap-2 border-b border-border">
              {steps.map((item) => {
                const complete = step > item.id;
                const active = step === item.id;

                return (
                  <div
                    key={item.id}
                    className={`pb-3 text-center text-xs font-bold uppercase tracking-[0.08em] transition sm:text-sm ${
                      active || complete ? 'border-b-2 border-gold text-gold' : 'border-b-2 border-transparent text-muted'
                    }`}
                  >
                    {complete ? (
                      <span className="inline-flex items-center gap-1 text-gold">
                        <CheckIcon className="h-4 w-4" />
                        {item.label}
                      </span>
                    ) : (
                      item.label
                    )}
                  </div>
                );
              })}
            </nav>

            <section className="relative mt-10 min-h-[470px] overflow-hidden">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="scan"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="relative aspect-square w-full max-w-[300px] overflow-hidden border border-ink">
                      {['left-4 top-4 border-l border-t', 'right-4 top-4 border-r border-t', 'bottom-4 left-4 border-b border-l', 'bottom-4 right-4 border-b border-r'].map(
                        (position) => (
                          <motion.span
                            key={position}
                            animate={{ opacity: [0.55, 1, 0.55] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                            className={`pointer-events-none absolute z-10 h-12 w-12 border-gold ${position}`}
                          />
                        ),
                      )}
                      <div id="smartattend-qr-reader" className="h-full w-full" />
                    </div>
                    <p className="mt-6 text-sm text-muted">Point your camera at the QR code on the screen</p>
                    <form onSubmit={submitManualCode} className="mt-6 flex w-full max-w-sm flex-col gap-3">
                      <label className="text-left text-sm font-medium text-muted" htmlFor="manual-code">
                        Enter code manually
                      </label>
                      <input
                        id="manual-code"
                        value={manualCode}
                        placeholder="Paste the full QR code here"
                        onChange={(event) => setManualCode(event.target.value)}
                        className="border border-border px-4 py-3 text-sm outline-none transition focus:border-ink focus:ring-1 focus:ring-gold"
                      />
                      <button
                        type="submit"
                        className="border border-gold px-6 py-3 text-sm font-semibold text-gold transition duration-200 hover:scale-[1.02] hover:bg-gold hover:text-ink"
                      >
                        Submit Code
                      </button>
                    </form>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="verify"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="flex flex-col items-center text-center"
                  >
                    {locationError ? (
                      <>
                        <p className="text-sm font-semibold text-red-600">{locationError}</p>
                        <button
                          type="button"
                          onClick={tryAgain}
                          className="mt-6 border border-gold px-6 py-3 text-sm font-semibold text-gold transition hover:bg-gold hover:text-ink"
                        >
                          Try Again
                        </button>
                      </>
                    ) : (
                      <>
                        <h2 className="font-serif text-4xl font-semibold text-gold">
                          Verifying your location...
                        </h2>
                        <div className="mt-10 h-20 w-20 animate-spin rounded-full border-2 border-border border-t-gold" />
                        <p className="mt-8 text-sm text-muted">
                          {locationLoading ? 'Please ensure location permission is granted' : 'Preparing verification'}
                        </p>
                      </>
                    )}
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="confirmed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="relative flex flex-col items-center overflow-hidden py-4 text-center"
                  >
                    {submittedStatus && <ConfettiBurst />}
                    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
                      <motion.path
                        d="M31 63 L52 84 L91 38"
                        fill="none"
                        stroke="#C9A84C"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: submittedStatus ? 1 : 0.35 }}
                        transition={{ duration: 0.75, ease: 'easeOut' }}
                      />
                    </svg>
                    <h2 className="mt-4 font-serif text-4xl font-semibold text-gold">
                      {submitting ? 'Submitting Attendance...' : 'Attendance Marked!'}
                    </h2>
                    {submittedStatus && (
                      <span
                        className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase text-white ${
                          submittedStatus === 'present' ? 'bg-green-600' : 'bg-amber-500'
                        }`}
                      >
                        {submittedStatus === 'present' ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <ClockIcon className="h-4 w-4" />
                        )}
                        {submittedStatus === 'present' ? 'Present' : 'Late'}
                      </span>
                    )}
                    <p className="mt-6 font-serif text-2xl font-semibold text-ink">{confirmedCourse}</p>
                    <p className="mt-2 text-sm text-muted">{timestamp}</p>
                    <Link
                      href="/student/dashboard"
                      className="mt-9 bg-ink px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md"
                    >
                      Back to Dashboard
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </main>
        </div>
        <Toast message={toast} onClose={() => setToast('')} />
      </>
    </ProtectedRoute>
  );
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 18 }, (_, index) => index);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-52 max-w-sm overflow-hidden">
      {pieces.map((piece) => {
        const left = 12 + ((piece * 17) % 76);
        const color = piece % 3 === 0 ? '#C9A84C' : piece % 3 === 1 ? '#0A0A0A' : '#E8C97A';

        return (
          <motion.span
            key={piece}
            initial={{ opacity: 0, y: 30, x: 0, rotate: 0 }}
            animate={{
              opacity: [0, 1, 0],
              y: [-4, 72 + (piece % 5) * 12],
              x: (piece % 2 === 0 ? 1 : -1) * (24 + (piece % 6) * 9),
              rotate: 160 + piece * 18,
            }}
            transition={{ duration: 1.6, ease: 'easeOut', delay: piece * 0.018 }}
            className="absolute top-10 h-2 w-1.5"
            style={{ left: `${left}%`, backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}
