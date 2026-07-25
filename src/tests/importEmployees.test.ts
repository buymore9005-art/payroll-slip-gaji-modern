import { describe, expect, it } from 'vitest';
import { validateImportRows } from '@/utils/importEmployees';
const valid = {
  NIK: 'EMP-001', Nama: 'Ayu Lestari', Jabatan: 'Analis', Divisi: 'Finance',
  Departemen: 'Accounting', Rekening: '001234', Bank: 'BCA',
  'Gaji Pokok': 7000000, Tunjangan: 500000, Email: 'ayu@example.com', HP: '08123'
};
describe('validateImportRows', () => {
  it('menerima baris valid dan menjaga nilai teks', () =>
    expect(validateImportRows([valid]).validRows[0]).toMatchObject({ nik:'EMP-001', bankAccount:'001234', phone:'08123' }));
  it('melewati baris kosong', () => expect(validateImportRows([{}, valid]).errors).toHaveLength(0));
  it('membaca format angka Indonesia', () =>
    expect(validateImportRows([{ ...valid, 'Gaji Pokok':'7.500.000', Tunjangan:'Rp1.000.000' }]).validRows[0])
      .toMatchObject({ basicSalary:7500000, allowance:1000000 }));
  it('menolak NIK duplikat dan email tidak valid', () => {
    const result = validateImportRows([valid, { ...valid, Email:'salah' }]);
    expect(result.validRows).toHaveLength(1);
    expect(result.errors[0].messages.join(' ')).toContain('duplikat');
  });
});
