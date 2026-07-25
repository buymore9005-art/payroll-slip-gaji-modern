import type { PayrollDetailRow } from '@/types/database';

export type PayrollInput = Pick<PayrollDetailRow,
  'basic_salary' | 'fixed_allowance' | 'variable_allowance' | 'bonus' | 'incentive' |
  'overtime' | 'thr' | 'deduction' | 'loan' | 'bpjs' | 'tax'
>;
export type PayrollTotals = { totalIncome: number; totalDeduction: number; netSalary: number };
export type EmployeeFilters = { search?: string; divisionId?: string; positionId?: string; status?: string; archive?: 'active' | 'archived' | 'all' };
export type PayrollFilters = { search?: string; month?: string; year?: string; status?: string; divisionId?: string; positionId?: string };
export type ImportEmployeeRow = {
  rowNumber: number; nik: string; name: string; position: string; division: string; department: string;
  bankAccount: string; bankName: string; basicSalary: number; allowance: number; email: string; phone: string;
};
export type ImportRowError = { rowNumber: number; nik: string; messages: string[] };
export type ImportValidationResult = { validRows: ImportEmployeeRow[]; errors: ImportRowError[] };


export type ImportBatchResult = {
  batch_id: string;
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ row_number: number; key?: string; message: string }>;
};

export type PayrollImportRow = {
  rowNumber: number;
  employeeId: string;
  nik: string;
  name: string;
  period: string;
  basicSalary: number;
  allowance: number;
  bonus: number;
  overtime: number;
  incentive: number;
  deduction: number;
  bpjs: number;
  tax: number;
  thr: number;
  netSalary: number;
  status: 'draft' | 'finalized' | 'paid';
};

export type OrganizationImportEntity = 'divisions' | 'departments' | 'positions';

export type OrganizationImportRow = {
  rowNumber: number;
  division: string;
  department: string;
  name: string;
  description: string;
};

export type ImportPreview<Row> = {
  validRows: Row[];
  skippedRows: Array<{ rowNumber: number; key: string; message: string }>;
  errors: Array<{ rowNumber: number; key: string; messages: string[] }>;
};

export type BulkPayrollResult = {
  requested: number;
  updated: number;
  deleted?: number;
  skipped: number;
  errors: Array<{ id: string; message: string }>;
};
