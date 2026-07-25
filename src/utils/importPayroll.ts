import type { ImportPreview, PayrollImportRow } from '@/types/domain';
import { importNumber, importText, isEmptyImportRow, normalizeMonth } from '@/utils/importCommon';

export const PAYROLL_IMPORT_HEADERS = [
  'Employee ID', 'NIK', 'Nama', 'Periode', 'Gaji Pokok', 'Tunjangan',
  'Bonus', 'Lembur', 'Insentif', 'Potongan', 'BPJS', 'Pajak', 'THR',
  'Total Bersih', 'Status',
] as const;

type RawRow = Record<string, unknown>;
const statusMap: Record<string, PayrollImportRow['status']> = {
  draft: 'draft',
  final: 'finalized',
  finalized: 'finalized',
  dibayar: 'paid',
  paid: 'paid',
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function validatePayrollImportRows(rows: RawRow[]): ImportPreview<PayrollImportRow> {
  const validRows: PayrollImportRow[] = [];
  const skippedRows: ImportPreview<PayrollImportRow>['skippedRows'] = [];
  const errors: ImportPreview<PayrollImportRow>['errors'] = [];
  const seen = new Set<string>();

  rows.forEach((raw, index) => {
    if (isEmptyImportRow(raw)) return;
    const rowNumber = index + 2;
    const employeeId = importText(raw['Employee ID']);
    const nik = importText(raw.NIK);
    const name = importText(raw.Nama);
    const period = normalizeMonth(raw.Periode);
    const basicSalary = importNumber(raw['Gaji Pokok']);
    const allowance = importNumber(raw.Tunjangan);
    const bonus = importNumber(raw.Bonus);
    const overtime = importNumber(raw.Lembur);
    const incentive = importNumber(raw.Insentif);
    const deduction = importNumber(raw.Potongan);
    const bpjs = importNumber(raw.BPJS);
    const tax = importNumber(raw.Pajak);
    const thr = importNumber(raw.THR);
    const netSalary = importNumber(raw['Total Bersih']);
    const statusRaw = importText(raw.Status).toLocaleLowerCase('id-ID');
    const status = statusMap[statusRaw];
    const messages: string[] = [];

    if (!employeeId && !nik) messages.push('Employee ID atau NIK wajib diisi.');
    if (employeeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(employeeId)) {
      messages.push('Employee ID harus berupa UUID yang valid.');
    }
    if (!name) messages.push('Nama wajib diisi.');
    if (!period) messages.push('Periode wajib menggunakan format YYYY-MM.');
    const amounts = {
      'Gaji Pokok': basicSalary, Tunjangan: allowance, Bonus: bonus, Lembur: overtime,
      Insentif: incentive, Potongan: deduction, BPJS: bpjs, Pajak: tax, THR: thr,
      'Total Bersih': netSalary,
    };
    for (const [label, value] of Object.entries(amounts)) {
      if (!Number.isFinite(value) || value < 0) messages.push(`${label} harus berupa angka nol atau lebih.`);
    }
    if (!status) messages.push('Status harus Draft, Final, atau Dibayar.');

    const expectedNet = roundMoney(
      basicSalary + allowance + bonus + overtime + incentive + thr
      - deduction - bpjs - tax,
    );
    if (Number.isFinite(netSalary) && Math.abs(expectedNet - netSalary) > 1) {
      messages.push(`Total Bersih tidak sesuai. Nilai yang benar ${expectedNet}.`);
    }

    const uniqueKey = `${employeeId || nik.toLocaleLowerCase('id-ID')}:${period}`;
    if (seen.has(uniqueKey)) {
      skippedRows.push({ rowNumber, key: nik || employeeId, message: 'Karyawan dan periode duplikat di dalam file.' });
      return;
    }
    seen.add(uniqueKey);

    if (messages.length || !status) {
      errors.push({ rowNumber, key: nik || employeeId, messages });
      return;
    }

    validRows.push({
      rowNumber, employeeId, nik, name, period, basicSalary, allowance, bonus,
      overtime, incentive, deduction, bpjs, tax, thr, netSalary, status: status as PayrollImportRow['status'],
    });
  });

  return { validRows, skippedRows, errors };
}
