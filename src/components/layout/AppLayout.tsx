import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { RouteLoading } from '@/components/common/RouteLoading';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'payroll-sidebar-collapsed';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const state = location.state as { accessDenied?: boolean } | null;
    if (state?.accessDenied) toast.error('Anda tidak memiliki akses ke halaman tersebut.');
  }, [location.state]);

  return (
    <div className={cn(
      'min-h-screen transition-[padding] duration-300 ease-out',
      collapsed ? 'lg:pl-20' : 'lg:pl-72',
    )}>
      <Sidebar open={mobileOpen} collapsed={collapsed} onClose={() => setMobileOpen(false)} />
      <div className="min-h-screen">
        <Topbar
          collapsed={collapsed}
          onMenu={() => setMobileOpen(true)}
          onToggleSidebar={() => setCollapsed(value => !value)}
        />
        <main className="mx-auto w-full max-w-[1720px] p-4 sm:p-6 lg:p-8">
          <div className="page-enter">
            <Suspense fallback={<RouteLoading compact />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
