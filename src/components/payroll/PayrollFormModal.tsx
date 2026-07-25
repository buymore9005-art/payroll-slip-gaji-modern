import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Calculator } from 'lucide-react';
import { z } from 'zod';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { EmployeeDirectoryRow, PayrollDetailRow } from '@/types/database';
import type { PayrollPayload } from '@/services/payroll.service';
import { calculatePayroll } from '@/utils/payroll';
import { currentPeriod, formatCurrency, fromMonthInput, toMonthInput } from '@/utils/format';

const schema = z.object({
  employee_id: z.string().uuid('Pilih karyawan.'),
  period: z.string().min(7, 'Pilih periode.'),
  basic_salary: z.number().min(0),
  fixed_allowance: z.number().min(0),
  variable_allowance: z.number().min(0),
  bonus: z.number().min(0),
  incentive: z.number().min(0),
  overtime: z.number().min(0),
  thr: z.number().min(0),
  deduction: z.number().min(0),
  loan: z.number().min(0),
  bpjs: z.number().min(0),
  tax: z.number().min(0),
  notes: z.string(),
});
type FormValues = z.infer<typeof schema>;

const blank: FormValues = {
  employee_id: '',
  period: toMonthInput(currentPeriod()),
  basic_salary: 0,
  fixed_allowance: 0,
  variable_allowance: 0,
  bonus: 0,
  incentive: 0,
  overtime: 0,
  thr: 0,
  deduction: 0,
  loan: 0,
  bpjs: 0,
  tax: 0,
  notes: '',
};

const incomeFields: Array<{ name: keyof FormValues; label: string }> = [
  { name: 'basic_salary', label: 'Gaji Pokok' },
  { name: 'fixed_allowance', label: 'Tunjangan Tetap' },
  { name: 'variable_allowance', label: 'Tunjangan Tidak Tetap' },
  { name: 'bonus', label: 'Bonus' },
  { name: 'incentive', label: 'Insentif' },
  { name: 'overtime', label: 'Lembur' },
  { name: 'thr', label: 'THR' },
];

const deductionFields: Array<{ name: keyof FormValues; label: string }> = [
  { name: 'deduction', label: 'Potongan' },
  { name: 'loan', label: 'Kasbon' },
  { name: 'bpjs', label: 'BPJS' },
  { name: 'tax', label: 'Pajak' },
];

export function PayrollFormModal({
  open,
  editing,
  employees,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: PayrollDetailRow | null;
  employees: EmployeeDirectoryRow[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (value: PayrollPayload) => Promise<void>;
}) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: blank });
  const values = useWatch({ control: form.control });

  useEffect(() => {
    if (!open) return;
    form.reset(editing ? {
      employee_id: editing.employee_id,
      period: toMonthInput(editing.period),
      basic_salary: Number(editing.basic_salary),
      fixed_allowance: Number(editing.fixed_allowance),
      variable_allowance: Number(editing.variable_allowance),
      bonus: Number(editing.bonus),
      incentive: Number(editing.incentive),
      overtime: Number(editing.overtime),
      thr: Number(editing.thr),
      deduction: Number(editing.deduction),
      loan: Number(editing.loan),
      bpjs: Number(editing.bpjs),
      tax: Number(editing.tax),
      notes: editing.notes,
    } : blank);
  }, [editing, form, open]);

  const totals = useMemo(() => calculatePayroll({
    basic_salary: Number(values.basic_salary ?? 0),
    fixed_allowance: Number(values.fixed_allowance ?? 0),
    variable_allowance: Number(values.variable_allowance ?? 0),
    bonus: Number(values.bonus ?? 0),
    incentive: Number(values.incentive ?? 0),
    overtime: Number(values.overtime ?? 0),
    thr: Number(values.thr ?? 0),
    deduction: Number(values.deduction ?? 0),
    loan: Number(values.loan ?? 0),
    bpjs: Number(values.bpjs ?? 0),
    tax: Number(values.tax ?? 0),
  }), [values]);

  const selectEmployee = (employeeId: string) => {
    form.setValue('employee_id', employeeId, { shouldValidate: true });
    const employee = employees.find(item => item.id === employeeId);
    if (employee && !editing) {
      form.setValue('basic_salary', Number(employee.basic_salary));
      form.setValue('fixed_allowance', Number(employee.fixed_allowance));
      form.setValue('variable_allowance', Number(employee.variable_allowance));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.slip_number}` : 'Buat Payroll Karyawan'}
      description="Total pendapatan, potongan, dan gaji bersih dihitung otomatis."
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-right sm:text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Bersih</p>
            <p className="text-xl font-black text-emerald-600">{formatCurrency(totals.netSalary)}</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
            <Button type="submit" form="payroll-form" loading={saving}>Simpan Draft</Button>
          </div>
        </div>
      }
    >
      <form
        id="payroll-form"
        className="space-y-7"
        onSubmit={form.handleSubmit(valuesToSubmit => onSubmit({
          ...valuesToSubmit,
          period: fromMonthInput(valuesToSubmit.period),
          status: 'draft',
        }))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Karyawan" required error={form.formState.errors.employee_id?.message}>
            <Select
              value={form.watch('employee_id')}
              onChange={event => selectEmployee(event.target.value)}
              disabled={Boolean(editing)}
            >
              <option value="">Pilih karyawan</option>
              {employees.filter(item => item.employment_status !== 'inactive').map(item => (
                <option key={item.id} value={item.id}>{item.nik} · {item.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Periode" required error={form.formState.errors.period?.message}>
            <Input type="month" {...form.register('period')} disabled={Boolean(editing)} />
          </FormField>
        </div>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Calculator className="size-4" />
            </div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">Pendapatan</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {incomeFields.map(field => (
              <FormField key={field.name} label={field.label} error={form.formState.errors[field.name]?.message}>
                <Controller
                  control={form.control}
                  name={field.name}
                  render={({ field: controller }) => (
                    <CurrencyInput
                      value={Number(controller.value)}
                      onValueChange={controller.onChange}
                    />
                  )}
                />
              </FormField>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-500">Potongan</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {deductionFields.map(field => (
              <FormField key={field.name} label={field.label} error={form.formState.errors[field.name]?.message}>
                <Controller
                  control={form.control}
                  name={field.name}
                  render={({ field: controller }) => (
                    <CurrencyInput
                      value={Number(controller.value)}
                      onValueChange={controller.onChange}
                    />
                  )}
                />
              </FormField>
            ))}
          </div>
        </section>

        <section className="grid gap-3 rounded-3xl bg-slate-950 p-5 text-white sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Pendapatan</p>
            <p className="mt-2 text-lg font-black">{formatCurrency(totals.totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Potongan</p>
            <p className="mt-2 text-lg font-black text-rose-300">{formatCurrency(totals.totalDeduction)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Total Bersih</p>
            <p className="mt-2 text-xl font-black text-emerald-300">{formatCurrency(totals.netSalary)}</p>
          </div>
        </section>

        <FormField label="Catatan" error={form.formState.errors.notes?.message}>
          <Textarea placeholder="Catatan payroll atau referensi internal" {...form.register('notes')} />
        </FormField>
      </form>
    </Modal>
  );
}
