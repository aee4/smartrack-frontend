import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import PadlockCanvas from '@/components/PadlockCanvas';
import { GraduationCapIcon, TeacherIcon } from '@/components/icons';

export type Role = 'student' | 'lecturer';

export const roles: Array<{ id: Role; icon: ReactNode; label: string }> = [
  { id: 'student', icon: <GraduationCapIcon className="h-6 w-6" />, label: 'Student' },
  { id: 'lecturer', icon: <TeacherIcon className="h-6 w-6" />, label: 'Lecturer' },
];

export const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export function BrandLink({ align = 'left' }: { align?: 'left' | 'right' }) {
  return (
    <Link
      href="/"
      className={`block font-serif text-3xl font-semibold text-gold ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      SmartAttend
    </Link>
  );
}

export function RoleSelector({
  selectedRole,
  onSelect,
}: {
  selectedRole: Role;
  onSelect: (role: Role) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-muted">Choose your role</p>
      <div className="grid grid-cols-2 gap-3">
        {roles.map((role) => {
          const selected = role.id === selectedRole;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelect(role.id)}
              className={`border px-4 py-4 text-left transition duration-200 hover:border-gold ${
                selected ? 'border-gold text-gold shadow-sm' : 'border-border text-ink'
              }`}
              aria-pressed={selected}
            >
              <span className="block text-2xl" aria-hidden="true">
                {role.icon}
              </span>
              <span className="mt-3 block text-sm font-semibold">{role.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TextField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  children,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  children?: ReactNode;
}) {
  return (
    <label htmlFor={id} className="group block">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="relative mt-2 block">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="peer w-full border border-border bg-white px-4 py-3.5 pr-12 text-base text-ink outline-none transition duration-200 focus:border-ink focus:ring-1 focus:ring-gold"
          required
        />
        {children}
        <span className="absolute bottom-0 left-0 h-px w-0 bg-gold transition-all duration-300 peer-focus:w-full" />
      </span>
    </label>
  );
}

export function PasswordToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition hover:text-gold"
    >
      {visible ? 'Hide' : 'Show'}
    </button>
  );
}

export function SubmitButton({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full bg-ink px-6 py-4 font-serif text-2xl font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
    >
      {children}
    </button>
  );
}

export function DecorativePanel({
  quote,
  direction,
}: {
  quote: string;
  direction: 'left' | 'right';
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: direction === 'left' ? -32 : 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="flex min-h-28 items-center justify-center bg-ink px-6 py-8 md:min-h-screen"
    >
      <div className="hidden w-full max-w-lg md:block">
        <div className="mx-auto h-[390px] w-full max-w-md bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,transparent_70%)] opacity-70">
          <PadlockCanvas variant="dark" scale={0.9} />
        </div>
        <p className="mx-auto mt-10 max-w-md text-center font-serif text-4xl font-medium italic leading-tight text-gold">
          {quote}
        </p>
      </div>
      <p className="text-center font-serif text-2xl font-medium italic text-gold md:hidden">
        {quote}
      </p>
    </motion.aside>
  );
}
