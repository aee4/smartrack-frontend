import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { label: 'Dashboard', icon: '📋', href: '/lecturer/dashboard' },
  { label: 'New Session', icon: '➕', href: null },
  { label: 'Session History', icon: '🕓', href: null },
];

export function LecturerSidebar({
  activeLabel = 'Dashboard',
  onNewSession,
  onClose,
}: {
  activeLabel?: string;
  onNewSession?: () => void;
  onClose?: () => void;
}) {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full flex-col border-r border-gold bg-white">
      <div className="px-7 py-8">
        <Link href="/" className="font-serif text-4xl font-semibold text-gold">
          SmartAttend
        </Link>
      </div>

      <nav className="mt-4 space-y-2 px-4">
        {navItems.map((item) => {
          const active = item.label === activeLabel;
          const className = `flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left text-sm font-medium transition duration-200 ${
            active
              ? 'border-gold bg-[#FAFAFA] text-ink'
              : 'border-transparent text-muted hover:border-gold hover:text-ink'
          }`;

          if (item.href) {
            return (
              <Link key={item.label} href={item.href} onClick={onClose} className={className}>
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (item.label === 'New Session') onNewSession?.();
                onClose?.();
              }}
              className={className}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border px-7 py-7">
        <p className="text-sm font-semibold text-ink">{user?.name ?? 'Lecturer'}</p>
        <p className="mt-1 text-xs text-muted">{user?.email ?? ''}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-4 inline-block text-sm font-semibold text-gold transition hover:text-ink"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
