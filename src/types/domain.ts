import type { PayrollDetailRow } from '@/types/database';

export type PayrollInput = Pick<PayrollDetailRow,
  'basic_salary' | 'fixed_allowance' | 'variable_allowance' | 'bonus' | 'incentive' |
  'overtime' | 'thr' | 'deduction' | 'loan' | 'bpjs' | 'tax'
>;
export type PayrollTotals = { totalIncome: number; totalDeduction: number; netSalary: number };
export type EmployeeFilters = { search?: string; divisionId?: string; positionId?: string; status?: string };
export type PayrollFilters = { search?: string; month?: string; year?: string; status?: string; divisionId?: string; positionId?: string };
export type ImportEmployeeRow = {
  rowNumber: number; nik: string; name: string; position: string; division: string; department: string;
  bankAccount: string; bankName: string; basicSalary: number; allowance: number; email: string; phone: string;
};
export type ImportRowError = { rowNumber: number; nik: string; messages: string[] };
export type ImportValidationResult = { validRows: ImportEmployeeRow[]; errors: ImportRowError[] };
