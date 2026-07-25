import type {
  ImportPreview,
  OrganizationImportEntity,
  OrganizationImportRow,
} from '@/types/domain';
import { importText, isEmptyImportRow, normalizedKey } from '@/utils/importCommon';

export const ORGANIZATION_IMPORT_HEADERS: Record<OrganizationImportEntity, readonly string[]> = {
  divisions: ['Nama', 'Deskripsi'],
  departments: ['Divisi', 'Nama', 'Deskripsi'],
  positions: ['Divisi', 'Departemen', 'Nama', 'Deskripsi'],
};

export function validateOrganizationImportRows(
  entity: OrganizationImportEntity,
  rows: Array<Record<string, unknown>>,
): ImportPreview<OrganizationImportRow> {
  const validRows: OrganizationImportRow[] = [];
  const skippedRows: ImportPreview<OrganizationImportRow>['skippedRows'] = [];
  const errors: ImportPreview<OrganizationImportRow>['errors'] = [];
  const seen = new Set<string>();

  rows.forEach((raw, index) => {
    if (isEmptyImportRow(raw)) return;
    const rowNumber = index + 2;
    const division = importText(raw.Divisi);
    const department = importText(raw.Departemen);
    const name = importText(raw.Nama);
    const description = importText(raw.Deskripsi);
    const messages: string[] = [];

    if (!name) messages.push('Nama wajib diisi.');
    if (entity !== 'divisions' && !division) messages.push('Divisi wajib diisi.');
    if (entity === 'positions' && !department) messages.push('Departemen wajib diisi.');

    const key = [division, department, name].map(normalizedKey).join(':');
    if (seen.has(key)) {
      skippedRows.push({ rowNumber, key: name, message: 'Data duplikat di dalam file.' });
      return;
    }
    seen.add(key);

    if (messages.length) {
      errors.push({ rowNumber, key: name, messages });
      return;
    }
    validRows.push({ rowNumber, division, department, name, description });
  });

  return { validRows, skippedRows, errors };
}
