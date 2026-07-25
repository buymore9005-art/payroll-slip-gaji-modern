import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/permissions';
describe('role permissions', () => {
  it('memberi semua izin kepada super admin', () => expect(hasPermission('super_admin', 'settings.manage')).toBe(true));
  it('memberi HRD akses karyawan tetapi bukan finalisasi payroll', () => {
    expect(hasPermission('hrd','employees.write')).toBe(true);
    expect(hasPermission('hrd','payroll.finalize')).toBe(false);
  });
  it('memberi admin payroll akses ekspor massal tetapi bukan manajemen user', () => {
    expect(hasPermission('admin_payroll','payslip.export.bulk')).toBe(true);
    expect(hasPermission('admin_payroll','users.manage')).toBe(false);
  });
});
