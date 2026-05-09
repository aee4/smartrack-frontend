import Head from 'next/head';
import Link from 'next/link';
import { Fragment } from 'react';
import { motion } from 'framer-motion';
import PadlockCanvas from '@/components/PadlockCanvas';
import { LockIcon, MapPinIcon, BoltIcon } from '@/components/icons';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const features = [
  {
    icon: <LockIcon className="h-7 w-7 text-gold" />,
    title: 'Anti-Proxy Protection',
    description: 'Triple-layer verification — QR code, GPS coordinates, and device fingerprinting. Every check-in is real.',
  },
  {
    icon: <MapPinIcon className="h-7 w-7 text-gold" />,
    title: 'Dynamic Location',
    description: 'Session location is captured the moment a lecturer starts class. No setup. No configuration. Any room, any time.',
  },
  {
    icon: <BoltIcon className="h-7 w-7 text-gold" />,
    title: 'Live Dashboard',
    description: 'Watch attendance populate in real time. Present, late, and absent counts update the instant students check in.',
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
        className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-white/95 py-5 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="font-serif text-3xl font-semibold text-gold">
            SmartAttend
          </Link>
          <div className="flex items-center gap-7">
            <Link href="/login" className="hidden text-lg font-semibold text-muted transition hover:text-ink sm:inline">
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-ink px-8 py-3.5 text-lg font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      <main className="bg-white text-ink">
        <section className="relative flex min-h-screen overflow-hidden bg-white pt-20 text-ink">
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-28 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.14, delayChildren: 0.12 }}
              className="z-10 max-w-6xl"
            >
              <motion.div
                variants={fadeUp}
                className="mb-10 inline-flex items-center gap-3 rounded-full bg-gray-100 px-4 py-2 text-xs font-black uppercase tracking-tight text-ink shadow-sm"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] text-white">✓</span>
                Trusted by modern universities
              </motion.div>
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="font-sans text-6xl font-black leading-[0.9] tracking-[-0.07em] text-black sm:text-8xl lg:text-[8.5rem]"
              >
                Start secure
                <br />
                <span className="font-light text-gray-400">attendance, today</span>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="mt-8 max-w-xl text-lg font-medium leading-8 text-muted"
              >
                SmartAttend gives universities QR, GPS, and device verification in one clean real-time attendance system.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-16 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
                <Link
                  href="/login"
                  className="w-fit rounded-full bg-black px-9 py-5 text-sm font-bold text-white shadow-[0_18px_35px_rgba(0,0,0,0.22)] transition duration-200 hover:scale-[1.03]"
                >
                  Get Started
                </Link>
                <div className="grid gap-6 text-xs font-bold uppercase tracking-tight text-muted sm:grid-cols-3">
                  <span className="flex items-center gap-2">
                    <LockIcon className="h-4 w-4 text-gold" />
                    No proxy attendance
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4 text-gold" />
                    GPS verified
                  </span>
                  <span className="flex items-center gap-2">
                    <BoltIcon className="h-4 w-4 text-gold" />
                    Live updates
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="bg-white px-6 py-10 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-md bg-[#F5F4F1] px-6 py-16 text-center">
            <h2 className="text-4xl font-black tracking-tight text-[#303844]">Education</h2>
            <p className="mt-4 text-lg text-muted">Stop guessing. Real attendance insight for every class.</p>
            <div className="mt-16 grid gap-12 sm:grid-cols-3">
              {[
                ['100%', 'Proxy Prevention', <LockIcon key="proxy" className="h-12 w-12" />],
                ['50m', 'Location Radius', <MapPinIcon key="location" className="h-12 w-12" />],
                ['<1s', 'Live Updates', <BoltIcon key="updates" className="h-12 w-12" />],
              ].map(([number, label, icon]) => (
                <div key={label as string} className="group flex flex-col items-center">
                  <div className="text-[#7E96AA]">{icon}</div>
                  <p className="mt-7 text-4xl font-black tracking-tight text-[#303844] transition duration-300 group-hover:scale-105">{number}</p>
                  <div className="mt-5 h-0.5 w-9 bg-gold" />
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-[#6F7F91]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-white px-6 py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center font-serif text-6xl font-semibold text-ink"
            >
              Why SmartAttend?
            </motion.h2>
            <div className="mx-auto mt-4 h-0.5 w-20 bg-gold" />
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-muted">
              Built from the ground up to solve the problems universities actually face.
            </p>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {features.map((feature, index) => (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.15 }}
                  className="border border-gray-100 bg-white p-10 transition duration-300 hover:border-l-4 hover:border-l-gold hover:shadow-lg"
                >
                  <div className="w-fit rounded-xl bg-gold/10 p-3" aria-hidden="true">
                    {feature.icon}
                  </div>
                  <h3 className="mt-6 font-serif text-xl font-bold text-ink">{feature.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-muted">{feature.description}</p>
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
