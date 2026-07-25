import type { AppRole, EmploymentStatus, PayrollStatus } from '@/types/database';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Payroll Modern';
export const STORAGE_BUCKET = 'payroll-assets';
export const ROLE_LABELS: Record<AppRole, string> = { super_admin: 'Super Admin', hrd: 'HRD', admin_payroll: 'Admin Payroll' };
export const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  permanent: 'Tetap', contract: 'Kontrak', probation: 'Probation', intern: 'Magang', inactive: 'Tidak Aktif'
};
export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: 'Draft', finalized: 'Final', paid: 'Dibayar', cancelled: 'Dibatalkan'
};
