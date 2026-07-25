import { describe, expect, it } from 'vitest';
import { validateOrganizationImportRows } from '@/utils/importOrganization';

describe('validateOrganizationImportRows', () => {
  it('memvalidasi divisi', () => {
    const result = validateOrganizationImportRows('divisions', [
      { Nama: 'Technology', Deskripsi: 'Engineering and infrastructure' },
    ]);
    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('mewajibkan divisi untuk departemen', () => {
    const result = validateOrganizationImportRows('departments', [
      { Divisi: '', Nama: 'Engineering', Deskripsi: '' },
    ]);
    expect(result.validRows).toHaveLength(0);
    expect(result.errors[0].messages).toContain('Divisi wajib diisi.');
  });

  it('mendeteksi duplikat tanpa membedakan kapital', () => {
    const result = validateOrganizationImportRows('positions', [
      { Divisi: 'Technology', Departemen: 'Engineering', Nama: 'Developer', Deskripsi: '' },
      { Divisi: 'technology', Departemen: 'engineering', Nama: 'developer', Deskripsi: '' },
    ]);
    expect(result.validRows).toHaveLength(1);
    expect(result.skippedRows).toHaveLength(1);
  });
});
