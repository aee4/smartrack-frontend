import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { isAxiosError } from 'axios';
import { FormEvent, useEffect, useState } from 'react';
import {
  BrandLink,
  DecorativePanel,
  PasswordToggle,
  Role,
  RoleSelector,
  SubmitButton,
  TextField,
  fieldVariants,
} from '@/components/auth-ui';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const router = useRouter();
  const { isAuthenticated, role: authenticatedRole, login } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegisteredSuccess, setShowRegisteredSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !authenticatedRole) return;

    router.replace(authenticatedRole === 'lecturer' ? '/lecturer/dashboard' : '/student/dashboard');
  }, [authenticatedRole, isAuthenticated, router]);

  useEffect(() => {
    if (router.query.registered !== 'true') return;

    setShowRegisteredSuccess(true);
    const timeout = window.setTimeout(() => setShowRegisteredSuccess(false), 4000);

    return () => window.clearTimeout(timeout);
  }, [router.query.registered]);

  const clearError = () => {
    if (error) setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (loginError) {
      if (isAxiosError(loginError) && loginError.response?.status === 401) {
        setError('Invalid email or password');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In | SmartAttend</title>
        <meta name="description" content="Sign in to SmartAttend." />
      </Head>

      <main className="grid min-h-screen bg-white text-ink md:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex min-h-screen items-center px-6 py-10 sm:px-10 lg:px-16"
        >
          <div className="mx-auto w-full max-w-md">
            <BrandLink />

            <motion.div
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.08, delayChildren: 0.12 }}
              className="mt-16"
            >
              <motion.h1
                variants={fieldVariants}
                className="font-serif text-5xl font-semibold leading-tight text-ink"
              >
                Welcome back.
              </motion.h1>
              <motion.p variants={fieldVariants} className="mt-3 text-base text-muted">
                Sign in to your account
              </motion.p>

              {showRegisteredSuccess && (
                <motion.div
                  variants={fieldVariants}
                  className="mt-6 border-l-4 border-gold bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
                >
                  Account created successfully. Please sign in.
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="mt-10 space-y-6">
                <motion.div variants={fieldVariants}>
                  <RoleSelector
                    selectedRole={role}
                    onSelect={(nextRole) => {
                      clearError();
                      setRole(nextRole);
                    }}
                  />
                </motion.div>

                <motion.div variants={fieldVariants}>
                  <TextField
                    id="login-email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(value) => {
                      clearError();
                      setEmail(value);
                    }}
                    autoComplete="email"
                  />
                </motion.div>

                <motion.div variants={fieldVariants}>
                  <TextField
                    id="login-password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(value) => {
                      clearError();
                      setPassword(value);
                    }}
                    autoComplete="current-password"
                  >
                    <PasswordToggle
                      visible={showPassword}
                      onToggle={() => setShowPassword((current) => !current)}
                    />
                  </TextField>
                </motion.div>

                <motion.div variants={fieldVariants} className="pt-2">
                  <SubmitButton disabled={loading}>
                    <span className="inline-flex items-center justify-center gap-3">
                      {loading && (
                        <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-white" />
                      )}
                      Sign In
                    </span>
                  </SubmitButton>
                </motion.div>
                {error && (
                  <p className="text-sm font-medium text-red-600">{error}</p>
                )}
              </form>

              <motion.p variants={fieldVariants} className="mt-7 text-center text-sm text-muted">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-gold transition hover:text-ink">
                  Register
                </Link>
              </motion.p>
            </motion.div>
          </div>
        </motion.section>

        <DecorativePanel
          direction="right"
          quote="No proxies. No shortcuts. Just presence."
        />
      </main>
    </>
  );
}
