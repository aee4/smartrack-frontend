import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AnimatePresence, motion } from 'framer-motion';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LecturerSidebar } from '@/components/lecturer-sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import * as attendanceService from '@/services/attendanceService';
import * as sessionService from '@/services/sessionService';

interface Analytics {
  present: number;
  late: number;
  absent: number;
}

interface Session {
  _id: string;
  course: string;
  activeStatus: boolean;
  startTime: string | null;
  endTime?: string | null;
  studentCount?: number;
  analytics?: Analytics;
}

const emptyAnalytics: Analytics = {
  present: 0,
  late: 0,
  absent: 0,
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function formatDateTime(value: string | null) {
  if (!value) return 'Not started';

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeAnalytics(result: unknown): Analytics {
  const analytics =
    result && typeof result === 'object' && 'analytics' in result
      ? (result as { analytics?: Partial<Analytics> }).analytics
      : (result as Partial<Analytics> | undefined);

  return {
    present: analytics?.present ?? 0,
    late: analytics?.late ?? 0,
    absent: analytics?.absent ?? 0,
  };
}

function getSessionAnalytics(session: Session): Analytics {
  return session.analytics ?? emptyAnalytics;
}

function formatAttendanceRate(analytics: Analytics) {
  const total = analytics.present + analytics.late + analytics.absent;
  if (total === 0) return '0%';

  return `${Math.round(((analytics.present + analytics.late) / total) * 100)}%`;
}

function sumAnalytics(sessions: Session[]): Analytics {
  return sessions.reduce(
    (current, session) => {
      const analytics = getSessionAnalytics(session);

      return {
        present: current.present + analytics.present,
        late: current.late + analytics.late,
        absent: current.absent + analytics.absent,
      };
    },
    { ...emptyAnalytics },
  );
}

export default function LecturerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [toast, setToast] = useState('');

  const activeSessions = useMemo(() => sessions.filter((session) => session.activeStatus), [sessions]);
  const draftSessions = useMemo(
    () => sessions.filter((session) => !session.activeStatus && session.startTime === null),
    [sessions],
  );
  const pastSessions = useMemo(
    () => sessions.filter((session) => !session.activeStatus && session.startTime !== null),
    [sessions],
  );
  const activeSession = activeSessions[0];
  const totalAnalytics = useMemo(() => sumAnalytics(sessions), [sessions]);
  const today = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const stats = useMemo(
    () => [
      { label: 'Total Sessions', value: sessions.length.toString(), highlight: false },
      { label: 'Active Sessions', value: activeSessions.length.toString(), highlight: true },
      { label: 'Students Tracked', value: (totalAnalytics.present + totalAnalytics.late).toString(), highlight: false },
      { label: 'Average Attendance', value: formatAttendanceRate(totalAnalytics), highlight: false },
    ],
    [activeSessions.length, sessions.length, totalAnalytics],
  );

  const overview = useMemo(
    () => [
      { label: 'Present', value: totalAnalytics.present, color: 'text-green-600' },
      { label: 'Late', value: totalAnalytics.late, color: 'text-amber-500' },
      { label: 'Absent', value: totalAnalytics.absent, color: 'text-red-600' },
      { label: 'Past Sessions', value: pastSessions.length, color: 'text-ink' },
    ],
    [pastSessions.length, totalAnalytics],
  );

  const openModal = () => setModalOpen(true);

  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);

      try {
        const result = await sessionService.getMySessions();
        const loadedSessions: Session[] = Array.isArray(result) ? result : result.sessions ?? [];
        const sessionsWithAnalytics = await Promise.all(
          loadedSessions.map(async (session) => {
            try {
              const analytics = await attendanceService.getAnalytics(session._id);
              return { ...session, analytics: normalizeAnalytics(analytics) };
            } catch {
              return { ...session, analytics: emptyAnalytics };
            }
          }),
        );

        setSessions(sessionsWithAnalytics);
      } catch {
        setToast('Failed to load sessions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadSessions();
    }
  }, [user]);

  const closeModal = () => {
    setModalOpen(false);
    setCourseName('');
  };

  const createSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModalLoading(true);

    try {
      const result = await sessionService.createSession(courseName);
      const createdSession = result.session ?? result;

      setSessions((current) => [{ ...createdSession, analytics: emptyAnalytics }, ...current]);
      setCourseName('');
      setModalOpen(false);
      setToast('Session created successfully');
      router.push(`/lecturer/session/${createdSession._id}`);
    } catch {
      setToast('Failed to create session. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const renderLoadingCards = (count: number) =>
    Array.from({ length: count }, (_, index) => (
      <article
        key={index}
        className="border border-border border-l-4 border-l-gold bg-white p-5 shadow-[0_10px_28px_rgba(10,10,10,0.035)]"
      >
        <div className="skeleton-shimmer h-7 w-3/4" />
        <div className="skeleton-shimmer mt-4 h-4 w-44" />
        <div className="skeleton-shimmer mt-3 h-4 w-24" />
      </article>
    ));

  const renderSessionCard = (session: Session) => {
    const analytics = getSessionAnalytics(session);
    const checkIns = analytics.present + analytics.late;

    return (
      <motion.article
        key={session._id}
        variants={cardVariants}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="border border-border border-l-4 border-l-gold bg-white p-5 shadow-[0_10px_28px_rgba(10,10,10,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-soft"
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="font-serif text-2xl font-bold text-ink">{session.course}</h3>
            <p className="mt-2 text-sm text-muted">{formatDateTime(session.startTime)}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
              <span className="text-green-600">{analytics.present} present</span>
              <span className="text-amber-500">{analytics.late} late</span>
              <span className="text-red-600">{analytics.absent} absent</span>
              <span className="text-ink">{formatAttendanceRate(analytics)} rate</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                session.activeStatus
                  ? 'bg-gold text-ink'
                  : session.startTime === null
                    ? 'bg-[#EFEFEF] text-muted'
                    : 'bg-ink text-white'
              }`}
            >
              {session.activeStatus ? 'Active' : session.startTime === null ? 'Draft' : 'Closed'}
            </span>
            <span className="text-sm font-semibold text-muted">{checkIns} check-ins</span>
            <Link
              href={`/lecturer/session/${session._id}`}
              className="border border-ink px-4 py-2 text-sm font-semibold text-ink transition duration-200 hover:bg-ink hover:text-white"
            >
              View
            </Link>
            <Link
              href={`/lecturer/analytics/${session._id}`}
              className="border border-gold px-4 py-2 text-sm font-semibold text-gold transition duration-200 hover:bg-gold hover:text-ink"
            >
              Analytics
            </Link>
          </div>
        </div>
      </motion.article>
    );
  };

  return (
    <ProtectedRoute requiredRole="lecturer">
      <>
        <Head>
          <title>Lecturer Dashboard | SmartAttend</title>
          <meta name="description" content="Manage SmartAttend lecturer sessions." />
        </Head>

        <div className="min-h-screen bg-white text-ink">
          <div className="hidden fixed inset-y-0 left-0 z-30 w-72 lg:block">
            <LecturerSidebar onNewSession={openModal} />
          </div>

          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white/95 px-5 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="border border-border px-3 py-2 text-xl leading-none text-ink transition hover:border-gold"
              aria-label="Open navigation"
            >
              Menu
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
                  <LecturerSidebar onNewSession={openModal} onClose={() => setMobileSidebarOpen(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="lg:pl-72">
            <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="font-serif text-4xl font-semibold leading-tight text-ink md:text-5xl"
                  >
                    Good morning, {user?.name ?? 'Lecturer'}.
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 }}
                    className="mt-3 text-muted"
                  >
                    Here&apos;s what&apos;s happening across your sessions.
                  </motion.p>
                </div>
                <p className="text-sm text-muted">{today}</p>
              </div>

              <motion.section
                initial="hidden"
                animate="visible"
                transition={{ staggerChildren: 0.08, delayChildren: 0.14 }}
                className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                {stats.map((stat) => (
                  <motion.article
                    key={stat.label}
                    variants={cardVariants}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="border border-border border-t-gold border-t-2 bg-white p-6 shadow-[0_12px_30px_rgba(10,10,10,0.04)]"
                  >
                    <p className="text-sm font-medium text-muted">{stat.label}</p>
                    {loading ? (
                      <div className="skeleton-shimmer mt-5 h-12 w-20" />
                    ) : (
                      <p className={`mt-4 font-serif text-5xl font-semibold ${stat.highlight ? 'text-gold' : 'text-ink'}`}>
                        {stat.value}
                      </p>
                    )}
                  </motion.article>
                ))}
              </motion.section>

              <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {overview.map((item) => (
                  <article key={item.label} className="border border-border bg-[#FAFAFA] p-5">
                    <p className="text-sm font-medium text-muted">{item.label}</p>
                    {loading ? (
                      <div className="skeleton-shimmer mt-4 h-10 w-16" />
                    ) : (
                      <p className={`mt-3 font-serif text-4xl font-semibold ${item.color}`}>{item.value}</p>
                    )}
                  </article>
                ))}
              </section>

              {activeSession && (
                <motion.section
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.35 }}
                  className="mt-8 flex flex-col gap-4 bg-gold px-5 py-4 text-ink sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="font-semibold">
                    <span className="mr-2 inline-flex h-3 w-3 rounded-full bg-green-600 align-middle">
                      <span className="h-3 w-3 animate-ping rounded-full bg-green-600" />
                    </span>
                    {activeSession.course} is currently active
                  </p>
                  <Link
                    href={`/lecturer/session/${activeSession._id}`}
                    className="self-start text-sm font-bold text-ink transition hover:translate-x-1 sm:self-auto"
                  >
                    View Session
                  </Link>
                </motion.section>
              )}

              <section className="mt-12">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-serif text-3xl font-semibold text-ink">Current Sessions</h2>
                  <button
                    type="button"
                    onClick={openModal}
                    className="bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md"
                  >
                    New Session +
                  </button>
                </div>

                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ staggerChildren: 0.08 }}
                  className="mt-6 space-y-4"
                >
                  {loading ? (
                    renderLoadingCards(3)
                  ) : sessions.length === 0 ? (
                    <div className="border border-border bg-white px-5 py-12 text-center shadow-[0_10px_28px_rgba(10,10,10,0.035)]">
                      <p className="text-muted">No sessions yet.</p>
                      <button
                        type="button"
                        onClick={openModal}
                        className="mt-4 text-sm font-semibold text-gold transition hover:text-ink"
                      >
                        Create your first session
                      </button>
                    </div>
                  ) : activeSessions.length === 0 && draftSessions.length === 0 ? (
                    <div className="border border-border bg-white px-5 py-8 text-center shadow-[0_10px_28px_rgba(10,10,10,0.035)]">
                      <p className="text-muted">No active or draft sessions right now.</p>
                    </div>
                  ) : (
                    [...activeSessions, ...draftSessions].map(renderSessionCard)
                  )}
                </motion.div>
              </section>

              <section className="mt-12">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-serif text-3xl font-semibold text-ink">Past Sessions</h2>
                  <span className="text-sm font-semibold text-muted">{pastSessions.length} closed</span>
                </div>

                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ staggerChildren: 0.08 }}
                  className="mt-6 space-y-4"
                >
                  {loading ? (
                    renderLoadingCards(2)
                  ) : pastSessions.length === 0 ? (
                    <div className="border border-border bg-white px-5 py-8 text-center shadow-[0_10px_28px_rgba(10,10,10,0.035)]">
                      <p className="text-muted">No past sessions yet.</p>
                    </div>
                  ) : (
                    pastSessions.map(renderSessionCard)
                  )}
                </motion.div>
              </section>
            </div>
          </main>
        </div>

        <AnimatePresence>
          {modalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-5"
              onClick={closeModal}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="w-full max-w-lg bg-white p-7 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 className="font-serif text-4xl font-semibold text-ink">Start a New Session</h2>
                <form onSubmit={createSession} className="mt-7 space-y-6">
                  <label htmlFor="course-name" className="group block">
                    <span className="text-sm font-medium text-muted">Course Name</span>
                    <span className="relative mt-2 block">
                      <input
                        id="course-name"
                        type="text"
                        value={courseName}
                        onChange={(event) => setCourseName(event.target.value)}
                        className="peer w-full border border-border bg-white px-4 py-3.5 text-base text-ink outline-none transition duration-200 focus:border-ink focus:ring-1 focus:ring-gold"
                        autoFocus
                      />
                      <span className="absolute bottom-0 left-0 h-px w-0 bg-gold transition-all duration-300 peer-focus:w-full" />
                    </span>
                  </label>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="border border-border px-5 py-3 text-sm font-semibold text-muted transition hover:border-ink hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="bg-ink px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        {modalLoading && (
                          <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-white" />
                        )}
                        Create Session
                      </span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <Toast message={toast} onClose={() => setToast('')} />
      </>
    </ProtectedRoute>
  );
}
