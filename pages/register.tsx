import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AnimatePresence, motion } from 'framer-motion';
import { isAxiosError } from 'axios';
import { FormEvent, useState } from 'react';
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
import * as authService from '@/services/authService';

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearError = () => {
    if (error) setError('');
  };

  const getRegistrationError = (registrationError: unknown) => {
    if (!isAxiosError(registrationError)) {
      return 'Registration failed. Please try again.';
    }

    const responseMessage = JSON.stringify(registrationError.response?.data ?? '').toLowerCase();

    if (
      registrationError.response?.status === 409 ||
      responseMessage.includes('duplicate') ||
      responseMessage.includes('already exists')
    ) {
      return 'An account with this email already exists';
    }

    return 'Registration failed. Please try again.';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (role === 'student' && !studentId.trim()) {
      setError('Student ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.register(
        name,
        email,
        password,
        role,
        role === 'student' ? studentId : undefined,
      );
      router.push('/login?registered=true');
    } catch (registrationError) {
      setError(getRegistrationError(registrationError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Account | SmartAttend</title>
        <meta name="description" content="Create your SmartAttend account." />
      </Head>

      <main className="grid min-h-screen bg-white text-ink md:grid-cols-2">
        <div className="order-2 md:order-1">
          <DecorativePanel
            direction="left"
            quote="Your identity. Your attendance. Verified."
          />
        </div>

        <motion.section
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="order-1 flex min-h-screen items-center px-6 py-10 sm:px-10 lg:px-16 md:order-2"
        >
          <div className="mx-auto w-full max-w-md">
            <BrandLink align="right" />

            <motion.div
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.075, delayChildren: 0.12 }}
              className="mt-12"
            >
              <motion.h1
                variants={fieldVariants}
                className="font-serif text-5xl font-semibold leading-tight text-ink"
              >
                Create account.
              </motion.h1>
              <motion.p variants={fieldVariants} className="mt-3 text-base text-muted">
                Join SmartAttend today
              </motion.p>

              <form onSubmit={handleSubmit} className="mt-9 space-y-5">
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
                    id="register-full-name"
                    label="Full Name"
                    value={name}
                    onChange={(value) => {
                      clearError();
                      setName(value);
                    }}
                    autoComplete="name"
                  />
                </motion.div>

                <motion.div variants={fieldVariants}>
                  <TextField
                    id="register-email"
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

                <AnimatePresence initial={false}>
                  {role === 'student' && (
                    <motion.div
                      key="student-id"
                      initial={{ opacity: 0, height: 0, y: -8 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -8 }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <TextField
                        id="register-student-id"
                        label="Student ID"
                        value={studentId}
                        onChange={(value) => {
                          clearError();
                          setStudentId(value);
                        }}
                        autoComplete="off"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={fieldVariants}>
                  <TextField
                    id="register-password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(value) => {
                      clearError();
                      setPassword(value);
                    }}
                    autoComplete="new-password"
                  >
                    <PasswordToggle
                      visible={showPassword}
                      onToggle={() => setShowPassword((current) => !current)}
                    />
                  </TextField>
                </motion.div>

                <motion.div variants={fieldVariants}>
                  <TextField
                    id="register-confirm-password"
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(value) => {
                      clearError();
                      setConfirmPassword(value);
                    }}
                    autoComplete="new-password"
                  >
                    <PasswordToggle
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((current) => !current)}
                    />
                  </TextField>
                </motion.div>

                <motion.div variants={fieldVariants} className="pt-2">
                  <SubmitButton disabled={loading}>
                    <span className="inline-flex items-center justify-center gap-3">
                      {loading && (
                        <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-white" />
                      )}
                      Create Account
                    </span>
                  </SubmitButton>
                </motion.div>
                {error && (
                  <p className="text-sm font-medium text-red-600">{error}</p>
                )}
              </form>

              <motion.p variants={fieldVariants} className="mt-6 text-center text-sm text-muted">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-gold transition hover:text-ink">
                  Sign In
                </Link>
              </motion.p>
            </motion.div>
          </div>
        </motion.section>
      </main>
    </>
  );
}
