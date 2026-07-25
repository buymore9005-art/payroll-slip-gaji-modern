import type { PayrollInput, PayrollTotals } from '@/types/domain';
const money = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round((number + Number.EPSILON) * 100) / 100) : 0;
};
export function calculatePayroll(input: PayrollInput): PayrollTotals {
  const totalIncome = money(input.basic_salary) + money(input.fixed_allowance) + money(input.variable_allowance) +
    money(input.bonus) + money(input.incentive) + money(input.overtime) + money(input.thr);
  const totalDeduction = money(input.deduction) + money(input.loan) + money(input.bpjs) + money(input.tax);
  return { totalIncome, totalDeduction, netSalary: Math.max(0, totalIncome - totalDeduction) };
}
