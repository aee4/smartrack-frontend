import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LecturerSidebar } from '@/components/lecturer-sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toast } from '@/components/Toast';
import * as attendanceService from '@/services/attendanceService';
import * as sessionService from '@/services/sessionService';


type Filter = 'all' | 'present' | 'late' | 'absent';

interface Session {
  _id: string;
  course: string;
  startTime: string;
  endTime?: string;
  activeStatus: boolean;
}

interface Analytics {
  present: number;
  late: number;
  absent: number;
}

interface StudentRef {
  name?: string;
  email?: string;
}

interface AttendanceRecord {
  _id: string;
  studentId?: StudentRef | string;
  status: 'present' | 'late' | 'absent';
  timestamp: string;
}

interface OverTimePoint {
  minute: number;
  count: number;
}

function unwrapData<T>(result: unknown, key: string): T {
  if (result && typeof result === 'object' && key in result) {
    return (result as Record<string, T>)[key];
  }

  return result as T;
}

function getStudentName(record: AttendanceRecord) {
  if (record.studentId && typeof record.studentId === 'object' && record.studentId.name) {
    return record.studentId.name;
  }

  return 'Unknown Student';
}

function getStudentEmail(record: AttendanceRecord) {
  if (record.studentId && typeof record.studentId === 'object' && record.studentId.email) {
    return record.studentId.email;
  }

  return '—';
}

function formatRecordTime(value: string) {
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const controls = animate(latest.current, value, {
      duration: 0.75,
      ease: 'easeOut',
      onUpdate: (next) => {
        latest.current = next;
        setDisplay(Math.round(next));
      },
    });
    return () => controls.stop();
  }, [value]);

  return <span className={className}>{display}</span>;
}

function formatSessionRange(session: Session | null) {
  if (!session?.startTime) return '—';

  const date = new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(session.startTime));
  const start = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(session.startTime),
  );
  const end = session.endTime
    ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(session.endTime))
    : 'Ongoing';

  return `${date} • ${start} - ${end}`;
}

function DonutChart({ analytics }: { analytics: Analytics }) {
  const { present, late, absent } = analytics;
  const total = present + late + absent;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const presentLength = total === 0 ? 0 : (present / total) * circumference;
  const lateLength = total === 0 ? 0 : (late / total) * circumference;
  const absentLength = total === 0 ? circumference : (absent / total) * circumference;
  const attendanceRate = total === 0 ? 0 : Math.round(((present + late) / total) * 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-52 w-52">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#F3F3F3" strokeWidth="22" />
          {[
            { color: '#C9A84C', length: presentLength, offset: 0 },
            { color: '#F59E0B', length: lateLength, offset: -presentLength },
            { color: '#E5E5E5', length: absentLength, offset: -(presentLength + lateLength) },
          ].map((segment) => (
            <motion.circle
              key={segment.color}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="22"
              strokeLinecap="round"
              strokeDasharray={`${segment.length} ${Math.max(circumference - segment.length, 0)}`}
              strokeDashoffset={segment.offset}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-serif text-5xl font-semibold text-gold">{attendanceRate}%</p>
          <p className="text-xs text-muted">attendance rate</p>
        </div>
      </div>
      <div className="mt-6 grid w-full gap-3 text-sm text-muted sm:grid-cols-3">
        {[
          ['#C9A84C', 'Present', present],
          ['#F59E0B', 'Late', late],
          ['#E5E5E5', 'Absent', absent],
        ].map(([color, label, count]) => (
          <div key={label} className="flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color as string }} />
            <span>{label}: {count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ points }: { points: OverTimePoint[] }) {
  const chartPoints = points.length > 0 ? points : [{ minute: 0, count: 0 }, { minute: 30, count: 0 }];
  const width = 620;
  const height = 260;
  const padding = 38;
  const maxX = Math.max(30, ...chartPoints.map((point) => point.minute));
  const maxY = Math.max(1, ...chartPoints.map((point) => point.count));
  const mapX = (minute: number) => padding + (minute / maxX) * (width - padding * 2);
  const mapY = (count: number) => height - padding - (count / maxY) * (height - padding * 2);
  const linePath = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${mapX(point.minute)} ${mapY(point.count)}`).join(' ');
  const areaPath = `${linePath} L ${mapX(chartPoints[chartPoints.length - 1].minute)} ${height - padding} L ${mapX(chartPoints[0].minute)} ${height - padding} Z`;
  const thresholdX = mapX(10);

  return (
    <div>
      {points.length === 0 && <p className="mb-4 text-sm text-muted">No check-ins recorded</p>}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <path d={areaPath} fill="#C9A84C" opacity="0.12" />
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#E5E5E5" />
        <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#E5E5E5" />
        <line x1={thresholdX} x2={thresholdX} y1={padding} y2={height - padding} stroke="#DC2626" strokeDasharray="5 5" />
        <text x={thresholdX + 8} y={padding + 12} className="fill-red-600 text-[11px]">Late threshold</text>
        <motion.path
          d={linePath}
          fill="none"
          stroke="#C9A84C"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        {chartPoints.map((point) => (
          <circle key={`${point.minute}-${point.count}`} cx={mapX(point.minute)} cy={mapY(point.count)} r="4" fill="#C9A84C" />
        ))}
        {[0, Math.round(maxX / 3), Math.round((maxX / 3) * 2), maxX].map((minute) => (
          <text key={minute} x={mapX(minute)} y={height - 10} textAnchor="middle" className="fill-muted text-[11px]">
            {minute}m
          </text>
        ))}
        {[0, Math.ceil(maxY / 2), maxY].map((count) => (
          <text key={count} x={12} y={mapY(count) + 4} className="fill-muted text-[11px]">
            {count}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({ present: 0, late: 0, absent: 0 });
  const [students, setStudents] = useState<AttendanceRecord[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadAnalytics = async () => {
      setLoading(true);

      try {
        const [sessionRes, analyticsRes, attendanceRes] = await Promise.all([
          sessionService.getSession(id),
          attendanceService.getAnalytics(id),
          attendanceService.getSessionAttendance(id),
        ]);

        const nextSession = unwrapData<Session>(sessionRes, 'session');
        const nextAnalytics = unwrapData<Analytics>(analyticsRes, 'analytics');
        const nextStudents = unwrapData<AttendanceRecord[]>(attendanceRes, 'attendance');

        setSession(nextSession);
        setAnalytics({
          present: nextAnalytics?.present ?? 0,
          late: nextAnalytics?.late ?? 0,
          absent: nextAnalytics?.absent ?? 0,
        });
        setStudents(Array.isArray(nextStudents) ? nextStudents : []);
      } catch {
        setToast('Failed to load analytics');
        window.setTimeout(() => router.replace('/lecturer/dashboard'), 900);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [id, router]);

  const overTime = useMemo(() => {
    if (!session?.startTime) return [];

    return students
      .filter((student) => student.status !== 'absent')
      .map((student) => ({
        minute: Math.max(
          0,
          Math.floor((new Date(student.timestamp).getTime() - new Date(session.startTime).getTime()) / 60000),
        ),
      }))
      .sort((a, b) => a.minute - b.minute)
      .map((item, index) => ({ minute: item.minute, count: index + 1 }));
  }, [session?.startTime, students]);

  const filteredStudents = students.filter((student) => {
    const matchesFilter = filter === 'all' || student.status === filter;
    const normalized = `${getStudentName(student)} ${getStudentEmail(student)}`.toLowerCase();
    return matchesFilter && normalized.includes(query.toLowerCase());
  });

  const totalEnrolled = analytics.present + analytics.late + analytics.absent;
  const cards = [
    { label: 'Total Enrolled', value: totalEnrolled, color: 'text-ink', border: 'border-t-ink' },
    { label: 'Present', value: analytics.present, color: 'text-gold', border: 'border-t-gold' },
    { label: 'Late', value: analytics.late, color: 'text-amber-500', border: 'border-t-amber-500' },
    { label: 'Absent', value: analytics.absent, color: 'text-red-600', border: 'border-t-red-600' },
  ];

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
          <title>Session Analytics | SmartAttend</title>
        </Head>
        <div className="min-h-screen bg-white text-ink">
          <div className="hidden fixed inset-y-0 left-0 z-30 w-72 lg:block">
            <LecturerSidebar activeLabel="Analytics" />
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
                  <LecturerSidebar activeLabel="Analytics" onClose={() => setMobileSidebarOpen(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <main className="lg:pl-72">
            <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Link href="/lecturer/dashboard" className="text-sm font-semibold text-muted transition hover:text-gold">
                    ← Back to dashboard
                  </Link>
                  <h1 className="mt-5 font-serif text-4xl font-semibold text-ink md:text-5xl">
                    {session?.course ?? 'Session Analytics'}
                  </h1>
                  <p className="mt-2 text-muted">Session Analytics</p>
                </div>
                <div className="flex flex-col gap-3 lg:items-end">
                  <p className="text-sm text-muted">{formatSessionRange(session)}</p>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting}
                    className="w-fit border border-gold px-4 py-2 text-sm font-semibold text-gold transition duration-200 hover:scale-[1.02] hover:bg-gold hover:text-ink hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                  <article key={card.label} className={`border border-border border-t-2 ${card.border} bg-white p-6 shadow-[0_12px_30px_rgba(10,10,10,0.04)]`}>
                    <p className="text-sm font-medium text-muted">{card.label}</p>
                    {loading ? (
                      <div className="skeleton-shimmer mt-5 h-12 w-20" />
                    ) : (
                      <p className={`mt-4 font-serif text-5xl font-semibold ${card.color}`}>
                        <CountUp value={card.value} />
                      </p>
                    )}
                  </article>
                ))}
              </section>

              <div className="mt-10 grid gap-8 xl:grid-cols-2">
                <section className="border border-border bg-white p-6 shadow-[0_10px_28px_rgba(10,10,10,0.035)]">
                  <h2 className="font-serif text-3xl font-semibold text-ink">Attendance Breakdown</h2>
                  <div className="mt-8"><DonutChart analytics={analytics} /></div>
                </section>
                <section className="border border-border bg-white p-6 shadow-[0_10px_28px_rgba(10,10,10,0.035)]">
                  <h2 className="font-serif text-3xl font-semibold text-ink">Check-ins Over Time</h2>
                  <div className="mt-8"><LineChart points={overTime} /></div>
                </section>
              </div>

              <section className="mt-10">
                <h2 className="font-serif text-3xl font-semibold text-ink">Student Breakdown</h2>
                <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <label className="group block w-full max-w-md">
                    <span className="sr-only">Search by name or email</span>
                    <span className="relative block">
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by name or email..."
                        className="peer w-full border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink focus:ring-1 focus:ring-gold"
                      />
                      <span className="absolute bottom-0 left-0 h-px w-0 bg-gold transition-all duration-300 peer-focus:w-full" />
                    </span>
                  </label>
                  <div className="flex gap-4 overflow-x-auto text-sm font-semibold">
                    {(['all', 'present', 'late', 'absent'] as Filter[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setFilter(tab)}
                        className={`border-b-2 pb-2 capitalize transition ${filter === tab ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-ink'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto border border-border bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-[#FAFAFA] text-xs uppercase tracking-[0.12em] text-muted">
                      <tr>
                        <th className="px-4 py-4">#</th>
                        <th className="px-4 py-4">Student Name</th>
                        <th className="px-4 py-4">Email</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Check-in Time</th>
                      </tr>
                    </thead>
                    <motion.tbody initial="hidden" animate="visible" transition={{ staggerChildren: 0.05 }} className="divide-y divide-border">
                      {loading ? (
                        [1, 2, 3].map((item) => (
                          <tr key={item}>
                            <td className="px-4 py-4" colSpan={5}>
                              <div className="skeleton-shimmer h-5 w-full" />
                            </td>
                          </tr>
                        ))
                      ) : filteredStudents.length === 0 ? (
                        <tr>
                          <td className="px-4 py-10 text-center text-muted" colSpan={5}>
                            No attendance records found.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student, index) => (
                          <motion.tr key={`${student._id}-${filter}-${query}`} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.25 }}>
                            <td className="px-4 py-4 text-muted">{index + 1}</td>
                            <td className="px-4 py-4 font-semibold text-ink">{getStudentName(student)}</td>
                            <td className="px-4 py-4 text-muted">{getStudentEmail(student)}</td>
                            <td className="px-4 py-4">
                              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase text-white ${student.status === 'present' ? 'bg-green-600' : student.status === 'late' ? 'bg-amber-500' : 'bg-red-600'}`}>
                                {student.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-muted">{formatRecordTime(student.timestamp)}</td>
                          </motion.tr>
                        ))
                      )}
                    </motion.tbody>
                  </table>
                </div>
              </section>
            </div>
          </main>
        </div>
        <Toast message={toast} onClose={() => setToast('')} />
      </>
    </ProtectedRoute>
  );
}
