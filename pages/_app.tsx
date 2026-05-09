import type { AppProps } from 'next/app';
import { AnimatePresence, motion } from 'framer-motion';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { useRouter } from 'next/router';
import { AuthProvider } from '@/context/AuthContext';
import '@/styles/globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <main className={`${cormorant.variable} ${inter.variable} font-sans app-shell`}>
      <AuthProvider>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={router.asPath}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>
      </AuthProvider>
    </main>
  );
}
