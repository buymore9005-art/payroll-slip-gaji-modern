import { describe, expect, it } from 'vitest';
import { calculatePayroll } from '@/utils/payroll';
const base = {
  basic_salary: 8_000_000, fixed_allowance: 1_000_000, variable_allowance: 500_000,
  bonus: 300_000, incentive: 200_000, overtime: 250_000, thr: 0,
  deduction: 100_000, loan: 200_000, bpjs: 150_000, tax: 250_000
};
describe('calculatePayroll', () => {
  it('menghitung pendapatan, potongan, dan gaji bersih', () =>
    expect(calculatePayroll(base)).toEqual({ totalIncome: 10_250_000, totalDeduction: 700_000, netSalary: 9_550_000 }));
  it('menormalkan angka negatif dan NaN menjadi nol', () =>
    expect(calculatePayroll({ ...base, basic_salary: -1, bonus: Number.NaN }))
      .toEqual({ totalIncome: 1_950_000, totalDeduction: 700_000, netSalary: 1_250_000 }));
  it('tidak menghasilkan gaji bersih negatif', () =>
    expect(calculatePayroll({ ...base, deduction: 99_000_000 }).netSalary).toBe(0));
});
