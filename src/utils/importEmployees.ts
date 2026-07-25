import type { ImportEmployeeRow, ImportRowError, ImportValidationResult } from '@/types/domain';

export const IMPORT_HEADERS = ['NIK','Nama','Jabatan','Divisi','Departemen','Rekening','Bank','Gaji Pokok','Tunjangan','Email','HP'] as const;
export type RawImportRow = Record<string, unknown>;
const text = (value: unknown) => value == null ? '' : String(value).trim();
function numberValue(value: unknown): number {
  if (typeof value === 'number') return value;
  const raw = text(value).replace(/\s/g, '').replace(/^Rp/i, '');
  if (!raw) return 0;
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : (raw.match(/\./g)?.length ?? 0) > 1 ? raw.replace(/\./g, '') : raw;
  const numeric = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function validateImportRows(rows: RawImportRow[]): ImportValidationResult {
  const validRows: ImportEmployeeRow[] = [];
  const errors: ImportRowError[] = [];
  const seen = new Set<string>();
  rows.forEach((raw, index) => {
    if (Object.values(raw).every((value) => text(value) === '')) return;
    const rowNumber = index + 2;
    const nik = text(raw.NIK), name = text(raw.Nama), position = text(raw.Jabatan);
    const division = text(raw.Divisi), department = text(raw.Departemen), bankAccount = text(raw.Rekening);
    const bankName = text(raw.Bank), basicSalary = numberValue(raw['Gaji Pokok']), allowance = numberValue(raw.Tunjangan);
    const email = text(raw.Email), phone = text(raw.HP);
    const messages: string[] = [];
    const nikKey = nik.toLocaleLowerCase('id-ID');
    if (!nik) messages.push('NIK wajib diisi.');
    else if (seen.has(nikKey)) messages.push('NIK duplikat di dalam file.');
    if (!name) messages.push('Nama wajib diisi.');
    if (!position) messages.push('Jabatan wajib diisi.');
    if (!division) messages.push('Divisi wajib diisi.');
    if (!department) messages.push('Departemen wajib diisi.');
    if (!bankAccount) messages.push('Rekening wajib diisi.');
    if (!bankName) messages.push('Bank wajib diisi.');
    if (!Number.isFinite(basicSalary) || basicSalary < 0) messages.push('Gaji Pokok harus berupa angka nol atau lebih.');
    if (!Number.isFinite(allowance) || allowance < 0) messages.push('Tunjangan harus berupa angka nol atau lebih.');
    if (email && !emailValid(email)) messages.push('Email tidak valid.');
    if (nik) seen.add(nikKey);
    if (messages.length) { errors.push({ rowNumber, nik, messages }); return; }
    validRows.push({ rowNumber, nik, name, position, division, department, bankAccount, bankName,
      basicSalary, allowance, email, phone });
  });
  return { validRows, errors };
}
