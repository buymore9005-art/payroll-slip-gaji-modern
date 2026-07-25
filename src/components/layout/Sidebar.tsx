import {
  Activity,
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
  { label: 'Slip Gaji', to: '/app/payslips', icon: ReceiptText, permission: 'payroll.read' },
  { label: 'Riwayat Aktivitas', to: '/app/activity', icon: Activity, permission: 'activity.read' },
  { label: 'Pengguna & Role', to: '/app/users', icon: Users, permission: 'users.manage' },
  { label: 'Pengaturan', to: '/app/settings', icon: Settings, permission: 'settings.manage' },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { profile } = useAuth();
  const { can } = usePermissions();

  return (
    <aside className="flex h-full flex-col bg-slate-950 text-slate-200">
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
        <NavLink to="/app/dashboard" className="flex min-w-0 items-center gap-3" onClick={onClose}>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-lg shadow-brand-950">
            <Building2 className="size-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-extrabold text-white">{APP_NAME}</p>
            <p className="truncate text-[11px] text-slate-400">Payroll & Slip Gaji</p>
          </div>
        </NavLink>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:bg-white/10 lg:hidden">
            <X className="size-5" />
          </Button>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-500">Menu Utama</p>
        {navigation.filter(item => can(item.permission)).map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-lg shadow-brand-950/40'
                  : 'text-slate-400 hover:bg-white/[0.07] hover:text-white',
              )}
            >
              <Icon className="size-[18px] shrink-0 transition-transform group-hover:scale-105" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {profile && (
        <div className="border-t border-white/10 p-3">
          <div className="rounded-2xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <Avatar path={profile.avatar_path} name={profile.full_name} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{profile.full_name}</p>
                <p className="truncate text-[11px] text-slate-400">{ROLE_LABELS[profile.role]}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Keluar"
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

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <SidebarContent />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Tutup navigasi"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={onClose}
            />
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
