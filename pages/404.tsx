import Head from 'next/head';
import Link from 'next/link';
import PadlockCanvas from '@/components/PadlockCanvas';

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 | SmartAttend</title>
      </Head>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 text-center text-ink">
        <div className="absolute inset-0 opacity-20">
          <PadlockCanvas variant="light" scale={0.72} />
        </div>
        <section className="relative z-10">
          <p className="font-serif text-9xl font-semibold text-gold">404</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-ink">Page not found.</h1>
          <p className="mt-3 text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/"
            className="mt-8 inline-flex bg-ink px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md"
          >
            Go Home
          </Link>
        </section>
      </main>
    </>
  );
}
