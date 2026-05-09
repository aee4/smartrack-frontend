import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Props {
  children: React.ReactNode;
  requiredRole: 'student' | 'lecturer';
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const router = useRouter();
  const { isAuthenticated, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (role !== requiredRole) {
      router.replace(role === 'lecturer' ? '/lecturer/dashboard' : '/student/dashboard');
    }
  }, [isAuthenticated, loading, requiredRole, role, router]);

  if (loading || !isAuthenticated || role !== requiredRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-border border-t-gold" />
      </div>
    );
  }

  return <>{children}</>;
}
