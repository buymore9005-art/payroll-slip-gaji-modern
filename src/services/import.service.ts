import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import { IMPORT_HEADERS, validateImportRows, type RawImportRow } from '@/utils/importEmployees';
import {
  ORGANIZATION_IMPORT_HEADERS,
  validateOrganizationImportRows,
} from '@/utils/importOrganization';
import {
  PAYROLL_IMPORT_HEADERS,
  validatePayrollImportRows,
} from '@/utils/importPayroll';
import type {
  ImportBatchResult,
  ImportEmployeeRow,
  ImportPreview,
  ImportValidationResult,
  OrganizationImportEntity,
  OrganizationImportRow,
  PayrollImportRow,
} from '@/types/domain';

type WorkbookRow = Record<string, unknown>;

async function readWorkbook(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'xlsx' && extension !== 'xls') {
    throw new Error('Gunakan file Excel berformat .xlsx atau .xls.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Ukuran file maksimal 10 MB.');

  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Workbook tidak memiliki worksheet.');
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const headers = (matrix[0] ?? []).map(value => String(value).trim());
  const rows = XLSX.utils.sheet_to_json<WorkbookRow>(sheet, {
    defval: '',
    raw: false,
  });
  return { headers, rows };
}

function assertHeaders(headers: string[], required: readonly string[]) {
  const missing = required.filter(header => !headers.includes(header));
  if (missing.length) throw new Error(`Kolom template tidak lengkap: ${missing.join(', ')}.`);
}

function assertNotEmpty(valid: number, errors: number, skipped = 0) {
  if (valid + errors + skipped === 0) throw new Error('File tidak memiliki data untuk diproses.');
}

export async function parseEmployeeWorkbook(file: File): Promise<ImportValidationResult> {
  const { headers, rows } = await readWorkbook(file);
  assertHeaders(headers, IMPORT_HEADERS);
  const result = validateImportRows(rows as RawImportRow[]);
  assertNotEmpty(result.validRows.length, result.errors.length);
  return result;
}

export async function parsePayrollWorkbook(file: File): Promise<ImportPreview<PayrollImportRow>> {
  const { headers, rows } = await readWorkbook(file);
  assertHeaders(headers, PAYROLL_IMPORT_HEADERS);
  const result = validatePayrollImportRows(rows);
  assertNotEmpty(result.validRows.length, result.errors.length, result.skippedRows.length);
  return result;
}

export async function parseOrganizationWorkbook(
  file: File,
  entity: OrganizationImportEntity,
): Promise<ImportPreview<OrganizationImportRow>> {
  const { headers, rows } = await readWorkbook(file);
  assertHeaders(headers, ORGANIZATION_IMPORT_HEADERS[entity]);
  const result = validateOrganizationImportRows(entity, rows);
  assertNotEmpty(result.validRows.length, result.errors.length, result.skippedRows.length);
  return result;
}

function normalizeBatchResult(data: unknown): ImportBatchResult {
  const value = (data ?? {}) as Partial<ImportBatchResult>;
  return {
    batch_id: String(value.batch_id ?? ''),
    total: Number(value.total ?? 0),
    success: Number(value.success ?? 0),
    failed: Number(value.failed ?? 0),
    skipped: Number(value.skipped ?? 0),
    errors: Array.isArray(value.errors) ? value.errors : [],
  };
}

export async function executeEmployeeImport(input: {
  rows: ImportEmployeeRow[];
  fileName: string;
  userId?: string;
  onProgress?: (value: number) => void;
}): Promise<ImportBatchResult> {
  input.onProgress?.(12);
  const payload = input.rows.map(row => ({
    row_number: row.rowNumber,
    nik: row.nik,
    name: row.name,
    position: row.position,
    division: row.division,
    department: row.department,
    bank_account: row.bankAccount,
    bank_name: row.bankName,
    basic_salary: row.basicSalary,
    allowance: row.allowance,
    email: row.email,
    phone: row.phone,
  }));
  input.onProgress?.(35);
  const { data, error } = await supabase.rpc('import_employee_batch', {
    p_rows: payload,
    p_file_name: input.fileName,
  });
  if (error) throw new Error(error.message);
  input.onProgress?.(100);
  const result = normalizeBatchResult(data);
  await logActivity({
    action: 'IMPORT',
    entityType: 'employees',
    entityId: result.batch_id || null,
    description: `Import ${input.fileName}: ${result.success} berhasil, ${result.failed} gagal, ${result.skipped} dilewati`,
    metadata: result as never,
  });
  return result;
}

export async function executePayrollImport(input: {
  rows: PayrollImportRow[];
  fileName: string;
  onProgress?: (value: number) => void;
}): Promise<ImportBatchResult> {
  input.onProgress?.(15);
  const payload = input.rows.map(row => ({
    row_number: row.rowNumber,
    employee_id: row.employeeId || null,
    nik: row.nik,
    name: row.name,
    period: row.period,
    basic_salary: row.basicSalary,
    allowance: row.allowance,
    bonus: row.bonus,
    overtime: row.overtime,
    incentive: row.incentive,
    deduction: row.deduction,
    bpjs: row.bpjs,
    tax: row.tax,
    thr: row.thr,
    net_salary: row.netSalary,
    status: row.status,
  }));
  input.onProgress?.(38);
  const { data, error } = await supabase.rpc('import_payroll_batch', {
    p_rows: payload,
    p_file_name: input.fileName,
  });
  if (error) throw new Error(error.message);
  input.onProgress?.(100);
  const result = normalizeBatchResult(data);
  await logActivity({
    action: 'IMPORT',
    entityType: 'payroll',
    entityId: result.batch_id || null,
    description: `Import payroll ${input.fileName}: ${result.success} berhasil, ${result.failed} gagal, ${result.skipped} dilewati`,
    metadata: result as never,
  });
  return result;
}

export async function executeOrganizationImport(input: {
  entity: OrganizationImportEntity;
  rows: OrganizationImportRow[];
  fileName: string;
  onProgress?: (value: number) => void;
}): Promise<ImportBatchResult> {
  input.onProgress?.(18);
  const payload = input.rows.map(row => ({
    row_number: row.rowNumber,
    division: row.division,
    department: row.department,
    name: row.name,
    description: row.description,
  }));
  input.onProgress?.(42);
  const { data, error } = await supabase.rpc('import_organization_batch', {
    p_entity: input.entity,
    p_rows: payload,
    p_file_name: input.fileName,
  });
  if (error) throw new Error(error.message);
  input.onProgress?.(100);
  const result = normalizeBatchResult(data);
  await logActivity({
    action: 'IMPORT',
    entityType: input.entity,
    entityId: result.batch_id || null,
    description: `Import ${input.entity} ${input.fileName}: ${result.success} berhasil, ${result.failed} gagal, ${result.skipped} dilewati`,
    metadata: result as never,
  });
  return result;
}
