import type { AppRole } from '@/types/database';
export type Permission =
  | 'dashboard.read' | 'employees.read' | 'employees.write' | 'organization.write' | 'employees.import'
  | 'attendance.read' | 'attendance.write' | 'payroll.read' | 'payroll.write' | 'payroll.finalize'
  | 'payslip.export.single' | 'payslip.export.bulk' | 'activity.read' | 'users.manage' | 'settings.manage';
const all: Permission[] = [
  'dashboard.read','employees.read','employees.write','organization.write','employees.import',
  'attendance.read','attendance.write','payroll.read','payroll.write','payroll.finalize',
  'payslip.export.single','payslip.export.bulk','activity.read','users.manage','settings.manage'
];
export const PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: all,
  hrd: ['dashboard.read','employees.read','employees.write','organization.write','employees.import',
    'attendance.read','attendance.write','payroll.read','payslip.export.single'],
  admin_payroll: ['dashboard.read','employees.read','attendance.read','payroll.read','payroll.write',
    'payroll.finalize','payslip.export.single','payslip.export.bulk']
};
export function hasPermission(role: AppRole | undefined | null, permission: Permission) {
  return role ? PERMISSIONS[role].includes(permission) : false;
}
