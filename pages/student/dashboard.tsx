import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import * as attendanceService from '@/services/attendanceService';

// const mockStudent = {
//   name: 'Kwame Asante',
//   email: 'kwame@university.edu',
//   studentId: 'STU001',
//   role: 'student',
// };
//
// const mockAttendanceHistory = [
//   { _id: 'a1', course: 'CS101 — Intro to Programming', date: '2025-05-09', time: '08:32 AM', status: 'present' },
//   { _id: 'a2', course: 'CS301 — Data Structures', date: '2025-05-08', time: '10:14 AM', status: 'late' },
// ];

interface AttendanceRecord {
  _id: string;
  sessionId?: {
    course?: string;
    startTime?: string;
  };
  status: 'present' | 'late';
  timestamp: string;
}

interface CourseStat {
  course: string;
  attended: number;
  total: number;
  percentage: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function unwrapAttendance(result: unknown): AttendanceRecord[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'attendance' in result) {
    const attendance = (result as { attendance?: AttendanceRecord[] }).attendance;
    return Array.isArray(attendance) ? attendance : [];
  }
  if (result && typeof result === 'object' && 'records' in result) {
    const records = (result as { records?: AttendanceRecord[] }).records;
    return Array.isArray(records) ? records : [];
  }
  return [];
}

function formatDate(value?: string) {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StudentNavbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-gold bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
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

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [toast, setToast] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const loadAttendance = async () => {
      setLoading(true);

      try {
        const result = await attendanceService.getMyAttendance();
        setAttendanceHistory(unwrapAttendance(result));
      } catch {
        setToast('Failed to load attendance history.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadAttendance();
    }
  }, [user]);

  const courseStatsArray = useMemo(() => {
    const courseStats = attendanceHistory.reduce((acc, record) => {
      const course = record.sessionId?.course || 'Unknown Course';

      if (!acc[course]) {
        acc[course] = { course, attended: 0, total: 0, percentage: 0 };
      }

      acc[course].attended += 1;
      acc[course].total += 1;
      acc[course].percentage = Math.round((acc[course].attended / acc[course].total) * 100);

      return acc;
    }, {} as Record<string, CourseStat>);

    return Object.values(courseStats);
  }, [attendanceHistory]);

  const visibleHistory = showAll ? attendanceHistory : attendanceHistory.slice(0, 6);

  return (
    <ProtectedRoute requiredRole="student">
      <>
        <Head>
          <title>Student Dashboard | SmartAttend</title>
          <meta name="description" content="Track your SmartAttend attendance." />
        </Head>

        <div className="min-h-screen bg-white text-ink">
          <StudentNavbar />

          <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <motion.section
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.1 }}
              className="text-center sm:text-left"
            >
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="font-serif text-5xl font-semibold leading-tight text-ink sm:text-6xl"
              >
                Hello, {user?.name?.split(' ')[0] ?? 'Student'}.
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-3 text-muted">
                Track your attendance across all courses.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-9 flex justify-center sm:justify-start">
                <Link
                  href="/student/scan"
                  className="inline-flex items-center gap-3 border border-ink bg-ink px-8 py-4 font-serif text-xl font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:border-gold hover:shadow-[0_0_0_4px_rgba(201,168,76,0.18)]"
                >
                  <span aria-hidden="true">▣</span>
                  Scan QR Code
                </Link>
              </motion.div>
            </motion.section>

            <section className="mt-14">
              <h2 className="font-serif text-3xl font-semibold text-ink">Your Attendance</h2>
              <motion.div
                initial="hidden"
                animate="visible"
                transition={{ staggerChildren: 0.1, delayChildren: 0.15 }}
                className="mt-6 grid gap-4 lg:grid-cols-3"
              >
                {loading
                  ? [1, 2, 3].map((item) => (
                      <article key={item} className="border border-border bg-white p-5 shadow-[0_10px_28px_rgba(10,10,10,0.035)]">
                        <div className="skeleton-shimmer h-7 w-3/4" />
                        <div className="skeleton-shimmer mt-6 h-2 w-full" />
                        <div className="skeleton-shimmer mt-4 h-4 w-36" />
                      </article>
                    ))
                  : courseStatsArray.length === 0 ? (
                      <div className="border border-border bg-white px-5 py-12 text-center text-muted shadow-[0_10px_28px_rgba(10,10,10,0.035)] lg:col-span-3">
                        No attendance records yet. Scan a QR code to get started.
                      </div>
                    ) : (
                      courseStatsArray.map((course) => (
                        <motion.article
                          key={course.course}
                          variants={fadeUp}
                          transition={{ duration: 0.45, ease: 'easeOut' }}
                          className="border border-border bg-white p-5 shadow-[0_10px_28px_rgba(10,10,10,0.035)]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="font-serif text-2xl font-bold leading-tight text-ink">{course.course}</h3>
                            <p className="font-serif text-5xl font-semibold text-gold">{course.percentage}%</p>
                          </div>
                          <div className="mt-6 h-2 overflow-hidden bg-[#EDEDED]">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${course.percentage}%` }}
                              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.25 }}
                              className="h-full bg-gold"
                            />
                          </div>
                          <p className="mt-3 text-sm text-muted">
                            {course.attended} of {course.total} sessions attended
                          </p>
                          {course.percentage < 75 && (
                            <p className="mt-3 text-sm font-semibold text-red-600">⚠️ Below minimum attendance</p>
                          )}
                        </motion.article>
                      ))
                    )}
              </motion.div>
            </section>

            <section className="mt-14">
              <h2 className="font-serif text-3xl font-semibold text-ink">Recent Activity</h2>
              <div className="mt-6 overflow-x-auto border border-border bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-[#FAFAFA] text-xs uppercase tracking-[0.12em] text-muted">
                    <tr>
                      <th className="px-4 py-4 font-semibold">Course</th>
                      <th className="px-4 py-4 font-semibold">Date</th>
                      <th className="px-4 py-4 font-semibold">Time</th>
                      <th className="px-4 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    initial="hidden"
                    animate="visible"
                    transition={{ staggerChildren: 0.055, delayChildren: 0.2 }}
                  >
                    {loading ? (
                      [1, 2, 3].map((item) => (
                        <tr key={item}>
                          <td className="px-4 py-4" colSpan={4}>
                            <div className="skeleton-shimmer h-5 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : visibleHistory.length === 0 ? (
                      <tr>
                        <td className="px-4 py-10 text-center text-muted" colSpan={4}>
                          No attendance records yet. Scan a QR code to get started.
                        </td>
                      </tr>
                    ) : (
                      visibleHistory.map((record, index) => (
                        <motion.tr
                          key={record._id}
                          variants={fadeUp}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}
                        >
                          <td className="px-4 py-4 font-medium text-ink">{record.sessionId?.course ?? 'Unknown Course'}</td>
                          <td className="px-4 py-4 text-muted">{formatDate(record.sessionId?.startTime)}</td>
                          <td className="px-4 py-4 text-muted">{formatTime(record.timestamp)}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold uppercase text-white ${
                                record.status === 'present' ? 'bg-green-600' : 'bg-amber-500'
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </motion.tbody>
                </table>
              </div>
              {attendanceHistory.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAll((current) => !current)}
                  className="mt-5 inline-block text-sm font-semibold text-gold transition hover:text-ink"
                >
                  {showAll ? 'Show Less' : 'View All'}
                </button>
              )}
            </section>
          </main>
        </div>
        <Toast message={toast} onClose={() => setToast('')} />
      </>
    </ProtectedRoute>
  );
}
