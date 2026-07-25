import {
  Activity,
  BarChart3,
  Building2,
  CalendarCheck2,
  FileSpreadsheet,
  Gauge,
  Landmark,
  LogOut,
  ReceiptText,
  Settings,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { APP_NAME, ROLE_LABELS } from '@/lib/constants';
import { type Permission } from '@/lib/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { signOut } from '@/services/auth.service';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/ui/Button';

type NavigationItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  permission: Permission;
};

const navigation: NavigationItem[] = [
  { label: 'Dashboard', to: '/app/dashboard', icon: Gauge, permission: 'dashboard.read' },
  { label: 'Karyawan', to: '/app/employees', icon: Users, permission: 'employees.read' },
  { label: 'Organisasi', to: '/app/organization', icon: Landmark, permission: 'organization.write' },
  { label: 'Import Karyawan', to: '/app/import-employees', icon: FileSpreadsheet, permission: 'employees.import' },
  { label: 'Kehadiran', to: '/app/attendance', icon: CalendarCheck2, permission: 'attendance.read' },
  { label: 'Penggajian', to: '/app/payroll', icon: WalletCards, permission: 'payroll.read' },
  { label: 'Import Payroll', to: '/app/import-payroll', icon: FileSpreadsheet, permission: 'payroll.write' },
  { label: 'Slip Gaji', to: '/app/payslips', icon: ReceiptText, permission: 'payroll.read' },
  { label: 'Laporan', to: '/app/reports', icon: BarChart3, permission: 'payroll.read' },
  { label: 'Riwayat Aktivitas', to: '/app/activity', icon: Activity, permission: 'activity.read' },
  { label: 'Pengguna & Role', to: '/app/users', icon: Users, permission: 'users.manage' },
  { label: 'Pengaturan', to: '/app/settings', icon: Settings, permission: 'settings.manage' },
];

function SidebarContent({
  collapsed = false,
  onClose,
}: {
  collapsed?: boolean;
  onClose?: () => void;
}) {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const { t } = useTranslation();

  return (
    <aside className="flex h-full flex-col overflow-visible bg-slate-950 text-slate-200">
      <div className={cn(
        'flex h-20 items-center border-b border-white/10',
        collapsed ? 'justify-center px-3' : 'justify-between px-5',
      )}>
        <NavLink
          to="/app/dashboard"
          className="flex min-w-0 items-center gap-3"
          onClick={onClose}
          title={collapsed ? APP_NAME : undefined}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-lg shadow-brand-950">
            <Building2 className="size-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <p className="truncate font-extrabold text-white">{APP_NAME}</p>
              <p className="truncate text-[11px] text-slate-400">{t('Payroll & Slip Gaji')}</p>
            </div>
          )}
        </NavLink>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:bg-white/10 lg:hidden">
            <X className="size-5" />
          </Button>
        )}
      </div>

      <nav className={cn(
        'min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-visible py-5',
        collapsed ? 'px-2' : 'px-3',
      )}>
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-500">
            {t('Menu Utama')}
          </p>
        )}
        {navigation.filter(item => can(item.permission)).map(item => {
          const Icon = item.icon;
          const label = t(item.label);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              title={collapsed ? label : undefined}
              aria-label={label}
              className={({ isActive }) => cn(
                'group relative flex items-center rounded-xl py-2.5 text-sm font-semibold transition-all duration-200',
                collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-lg shadow-brand-950/40'
                  : 'text-slate-400 hover:bg-white/[0.07] hover:text-white',
              )}
            >
              <Icon className="size-[18px] shrink-0 transition-transform group-hover:scale-105" />
              {!collapsed && <span className="animate-fade-in">{label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-[calc(100%+.65rem)] z-[70] hidden whitespace-nowrap rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white shadow-xl group-hover:block">
                  {label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {profile && (
        <div className="border-t border-white/10 p-3">
          <div className={cn('rounded-2xl bg-white/5 p-3', collapsed && 'flex justify-center p-2')}>
            <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'gap-3')}>
              <Avatar path={profile.avatar_path} name={profile.full_name} className="size-10" />
              {!collapsed && (
                <div className="min-w-0 flex-1 animate-fade-in">
                  <p className="truncate text-sm font-bold text-white">{profile.full_name}</p>
                  <p className="truncate text-[11px] text-slate-400">{ROLE_LABELS[profile.role]}</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label={t('Keluar')}
                title={collapsed ? t('Keluar') : undefined}
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export function Sidebar({
  open,
  collapsed,
  onClose,
}: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div className={cn(
        'fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-300 ease-out lg:block',
        collapsed ? 'w-20' : 'w-72',
      )}>
        <SidebarContent collapsed={collapsed} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Tutup navigasi" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
              className="relative h-full w-[min(86vw,20rem)] shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            >
              <SidebarContent onClose={onClose} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
