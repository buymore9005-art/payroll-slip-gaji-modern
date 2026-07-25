import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, type Permission } from '@/lib/permissions';
import { Skeleton } from '@/components/ui/Skeleton';
import { signOut } from '@/services/auth.service';
import { Button } from '@/components/ui/Button';

export function ProtectedRoute({ permission }: { permission?: Permission }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="mx-auto size-16 rounded-2xl" />
          <Skeleton className="mx-auto h-7 w-52" />
          <Skeleton className="mx-auto h-4 w-72" />
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!profile.is_active) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="surface max-w-lg p-8 text-center">
          <ShieldAlert className="mx-auto size-12 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold">Akun dinonaktifkan</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Hubungi Super Admin untuk mengaktifkan kembali akses Anda.
          </p>
          <Button className="mt-6" variant="secondary" onClick={() => void signOut()}>Keluar</Button>
        </div>
      </main>
    );
  }
  if (permission && !hasPermission(profile.role, permission)) {
    return <Navigate to="/app/dashboard" replace state={{ accessDenied: true }} />;
  }
  return <Outlet />;
}
