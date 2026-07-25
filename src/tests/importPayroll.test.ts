import { describe, expect, it } from 'vitest';
import { validatePayrollImportRows } from '@/utils/importPayroll';

const valid = {
  'Employee ID': '',
  NIK: 'EMP-001',
  Nama: 'Rizky Pratama',
  Periode: '2026-07',
  'Gaji Pokok': 10_000_000,
  Tunjangan: 1_000_000,
  Bonus: 500_000,
  Lembur: 250_000,
  Insentif: 200_000,
  Potongan: 100_000,
  BPJS: 150_000,
  Pajak: 300_000,
  THR: 0,
  'Total Bersih': 11_400_000,
  Status: 'Draft',
};

describe('validatePayrollImportRows', () => {
  it('menerima payroll valid dan menormalkan periode/status', () => {
    const result = validatePayrollImportRows([valid]);
    expect(result.errors).toHaveLength(0);
    expect(result.validRows[0]).toMatchObject({
      nik: 'EMP-001',
      period: '2026-07-01',
      status: 'draft',
      netSalary: 11_400_000,
    });
  });

  it('menolak total bersih yang tidak konsisten', () => {
    const result = validatePayrollImportRows([{ ...valid, 'Total Bersih': 1 }]);
    expect(result.validRows).toHaveLength(0);
    expect(result.errors[0].messages.join(' ')).toContain('Total Bersih tidak sesuai');
  });

  it('melewati duplikat karyawan dan periode dalam file', () => {
    const result = validatePayrollImportRows([valid, valid]);
    expect(result.validRows).toHaveLength(1);
    expect(result.skippedRows).toHaveLength(1);
  });
});
