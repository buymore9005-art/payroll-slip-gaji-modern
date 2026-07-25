import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { accessDenied?: boolean } | null;
    if (state?.accessDenied) toast.error('Anda tidak memiliki akses ke halaman tersebut.');
  }, [location.state]);

  return (
    <div className="min-h-screen lg:pl-72">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="min-h-screen">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1720px] p-4 sm:p-6 lg:p-8">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
