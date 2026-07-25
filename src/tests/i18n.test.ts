import { describe, expect, it } from 'vitest';
import { translatePhrase } from '@/i18n/messages';

describe('translatePhrase', () => {
  it('menerjemahkan frasa aplikasi ke English dan Chinese', () => {
    expect(translatePhrase('Dashboard Payroll', 'en')).toBe('Payroll Dashboard');
    expect(translatePhrase('Dashboard Payroll', 'zh-CN')).toBe('薪资仪表板');
  });

  it('menjaga Bahasa Indonesia sebagai sumber', () => {
    expect(translatePhrase('Tambah Karyawan', 'id')).toBe('Tambah Karyawan');
  });

  it('menerjemahkan pesan hasil import dinamis', () => {
    expect(translatePhrase('10 berhasil, 2 gagal, 3 dilewati', 'en'))
      .toBe('10 successful, 2 failed, 3 skipped');
  });
});
