import { Bell, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/ui/Button';
import { ROLE_LABELS } from '@/lib/constants';

const titles: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/employees': 'Data Karyawan',
  '/app/organization': 'Master Organisasi',
  '/app/import-employees': 'Import Karyawan',
  '/app/import-payroll': 'Import Payroll',
  '/app/attendance': 'Kehadiran',
  '/app/payroll': 'Penggajian',
  '/app/payslips': 'Slip Gaji',
  '/app/reports': 'Laporan',
  '/app/activity': 'Riwayat Aktivitas',
  '/app/users': 'Pengguna & Role',
  '/app/settings': 'Pengaturan',
};

export function Topbar({
  collapsed,
  onMenu,
  onToggleSidebar,
}: {
  collapsed: boolean;
  onMenu: () => void;
  onToggleSidebar: () => void;
}) {
  const { pathname } = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { profile } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="glass sticky top-0 z-30 flex h-20 items-center justify-between rounded-none border-x-0 border-t-0 px-4 shadow-none sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" onClick={onMenu} className="lg:hidden" aria-label={t('Buka navigasi')}>
          <Menu className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden lg:inline-flex"
          aria-label={collapsed ? t('Expand Sidebar') : t('Collapse Sidebar')}
          title={collapsed ? t('Expand Sidebar') : t('Collapse Sidebar')}
        >
          {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </Button>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
            {t(titles[pathname] ?? 'Payroll Modern')}
          </p>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
            Kelola operasional payroll dalam satu ruang kerja.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <LanguageSwitcher />
        <Button variant="ghost" size="icon" aria-label={t('Notifikasi')}>
          <Bell className="size-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t('Ubah tema')}>
          {resolvedTheme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
        {profile && (
          <div className="ml-1 hidden items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800 sm:flex">
            <Avatar path={profile.avatar_path} name={profile.full_name} className="size-9" />
            <div className="hidden min-w-0 xl:block">
              <p className="max-w-40 truncate text-xs font-bold text-slate-800 dark:text-white">{profile.full_name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{ROLE_LABELS[profile.role]}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
