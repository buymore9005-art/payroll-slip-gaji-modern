import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, type Permission } from '@/lib/permissions';
import { RouteLoading } from '@/components/common/RouteLoading';
import { signOut } from '@/services/auth.service';
import { Button } from '@/components/ui/Button';

export function ProtectedRoute({ permission }: { permission?: Permission }) {
  const { session, profile, status, profileError, refreshProfile } = useAuth();
  const location = useLocation();

  if (status === 'initializing') return <RouteLoading />;

  if (!session || status === 'unauthenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  if (status === 'profile-error' || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="surface max-w-lg p-8 text-center">
          <ShieldAlert className="mx-auto size-12 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold">Profil pengguna tidak dapat dimuat</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {profileError || 'Periksa koneksi lalu coba kembali.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => void signOut()}>Keluar</Button>
            <Button onClick={() => void refreshProfile()}>
              <RefreshCw className="size-4" /> Coba Lagi
            </Button>
          </div>
        </div>
      </main>
    );
  }

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
