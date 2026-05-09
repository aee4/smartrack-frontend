import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import SkullCanvas from '@/components/SkullCanvas';
import { LockIcon, MapPinIcon, BoltIcon } from '@/components/icons';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const features = [
  {
    icon: <LockIcon className="h-10 w-10" />,
    title: 'Anti-Proxy Protection',
    description: 'QR + GPS + Device fingerprinting eliminates ghost attendance',
  },
  {
    icon: <MapPinIcon className="h-10 w-10" />,
    title: 'Dynamic Location',
    description: 'Classroom location captured automatically on session start',
  },
  {
    icon: <BoltIcon className="h-10 w-10" />,
    title: 'Live Dashboard',
    description: 'Attendance updates in real time as students check in',
  },
];

const steps = [
  {
    title: 'Lecturer starts session',
    description: 'Location captured, QR generated',
  },
  {
    title: 'Student scans QR',
    description: 'GPS verified, device checked',
  },
  {
    title: 'Attendance recorded',
    description: 'Live dashboard updates instantly',
  },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>SmartAttend | Attendance, Reimagined.</title>
        <meta
          name="description"
          content="Smart. Secure. Real-time attendance for universities."
        />
      </Head>

      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="font-serif text-3xl font-semibold text-gold">
            SmartAttend
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hidden text-sm font-medium text-muted transition hover:text-ink sm:inline">
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      <main className="bg-white text-ink">
        <section className="relative flex min-h-screen overflow-hidden bg-white pt-20">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.14, delayChildren: 0.12 }}
              className="z-10 max-w-3xl"
            >
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="font-serif text-7xl font-semibold leading-[0.9] tracking-normal text-ink sm:text-8xl lg:text-9xl"
              >
                Attendance,
                <br />
                <span className="text-gold">Reimagined.</span>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="mt-8 max-w-xl text-lg leading-8 text-muted sm:text-xl"
              >
                Smart. Secure. Real-time. Built for universities that refuse to settle.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md"
                >
                  Get Started
                </Link>
                <a
                  href="#features"
                  className="rounded-full border border-gold px-7 py-3.5 text-sm font-semibold text-gold transition duration-200 hover:scale-[1.02] hover:shadow-md"
                >
                  Learn More
                </a>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.35 }}
              className="relative h-[360px] min-h-[320px] lg:h-[min(74vh,720px)] lg:min-h-[520px]"
            >
              <SkullCanvas tone="light" scale={1.08} />
            </motion.div>
          </div>
        </section>

        <section className="border-y border-border bg-[#F7F7F7]">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border px-6 py-7 text-center sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-8">
            {[
              ['100%', 'Proxy Prevention'],
              ['50m', 'Location Radius'],
              ['<1s', 'Real-time Updates'],
            ].map(([number, label]) => (
              <div key={label} className="py-4">
                <p className="font-serif text-5xl font-semibold text-gold">{number}</p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-ink">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="bg-white px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center font-serif text-6xl font-semibold text-ink md:text-7xl"
            >
              Why SmartAttend?
            </motion.h2>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {features.map((feature, index) => (
                <motion.article
                  key={feature.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.35 }}
                  variants={fadeUp}
                  transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.08 }}
                  className="border-t-2 border-gold bg-white p-8 shadow-[0_10px_35px_rgba(10,10,10,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-soft"
                >
                  <div className="text-3xl" aria-hidden="true">
                    {feature.icon}
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-ink">{feature.title}</h3>
                  <p className="mt-4 leading-7 text-muted">{feature.description}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#FAFAFA] px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center font-serif text-6xl font-semibold text-ink md:text-7xl"
            >
              Three steps. Zero fraud.
            </motion.h2>
            <div className="relative mt-16 grid gap-8 md:grid-cols-3">
              <div className="absolute left-0 right-0 top-10 hidden h-px bg-border md:block" />
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.35 }}
                  variants={fadeUp}
                  transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.1 }}
                  className="relative bg-[#FAFAFA] px-2 text-center"
                >
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-gold bg-[#FAFAFA] font-serif text-4xl font-semibold text-gold">
                    {index + 1}
                  </div>
                  <h3 className="mt-7 text-xl font-bold text-ink">{step.title}</h3>
                  <p className="mt-3 leading-7 text-muted">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink px-6 py-24 text-center lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.35 }}
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mx-auto max-w-4xl"
          >
            <h2 className="font-serif text-6xl font-semibold leading-tight text-white md:text-7xl">
              Ready to eliminate <span className="text-gold-light">proxy attendance?</span>
            </h2>
            <Link
              href="/login"
              className="mt-10 inline-flex rounded-full bg-gold px-8 py-4 text-sm font-bold text-ink shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md"
            >
              Start Now
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-gold bg-white px-6 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-3xl font-semibold text-ink">SmartAttend</p>
            <p className="mt-2 text-sm text-muted">© 2025</p>
            <p className="mt-3 text-sm text-muted">Built for universities. Powered by real-time technology.</p>
          </div>
          <div className="flex gap-6 text-sm font-medium text-muted">
            <Link href="/login" className="transition hover:text-ink">
              Login
            </Link>
            <Link href="/register" className="transition hover:text-ink">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
