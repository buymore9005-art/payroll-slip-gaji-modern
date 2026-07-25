import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { AttendanceDetailRow, EmployeeDirectoryRow } from '@/types/database';
import type { AttendancePayload } from '@/services/attendance.service';
import { currentPeriod, fromMonthInput, toMonthInput } from '@/utils/format';

const schema = z.object({
  employee_id: z.string().uuid('Pilih karyawan.'),
  period: z.string().min(7, 'Pilih periode.'),
  working_days: z.coerce.number().int().min(0).max(31),
  present_days: z.coerce.number().int().min(0).max(31),
  sick_days: z.coerce.number().int().min(0).max(31),
  leave_days: z.coerce.number().int().min(0).max(31),
  absent_days: z.coerce.number().int().min(0).max(31),
  overtime_hours: z.coerce.number().min(0).max(744),
  notes: z.string(),
}).superRefine((value, context) => {
  const total = value.present_days + value.sick_days + value.leave_days + value.absent_days;
  if (total > value.working_days) {
    context.addIssue({
      code: 'custom',
      path: ['present_days'],
      message: 'Total hadir, sakit, izin, dan alpa tidak boleh melebihi hari kerja.',
    });
  }
});
type FormValues = z.infer<typeof schema>;

const blank: FormValues = {
  employee_id: '',
  period: toMonthInput(currentPeriod()),
  working_days: 22,
  present_days: 22,
  sick_days: 0,
  leave_days: 0,
  absent_days: 0,
  overtime_hours: 0,
  notes: '',
};

export function AttendanceFormModal({
  open,
  editing,
  employees,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: AttendanceDetailRow | null;
  employees: EmployeeDirectoryRow[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (value: AttendancePayload) => Promise<void>;
}) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: blank });

  useEffect(() => {
    if (!open) return;
    form.reset(editing ? {
      employee_id: editing.employee_id,
      period: toMonthInput(editing.period),
      working_days: editing.working_days,
      present_days: editing.present_days,
      sick_days: editing.sick_days,
      leave_days: editing.leave_days,
      absent_days: editing.absent_days,
      overtime_hours: editing.overtime_hours,
      notes: editing.notes,
    } : blank);
  }, [editing, form, open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Rekap Kehadiran' : 'Tambah Rekap Kehadiran'}
      description="Satu rekap per karyawan untuk setiap bulan."
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="submit" form="attendance-form" loading={saving}>Simpan Kehadiran</Button>
        </div>
      }
    >
      <form
        id="attendance-form"
        className="space-y-5"
        onSubmit={form.handleSubmit(values => onSubmit({ ...values, period: fromMonthInput(values.period) }))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Karyawan" required error={form.formState.errors.employee_id?.message}>
            <Select {...form.register('employee_id')} disabled={Boolean(editing)}>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Hari Kerja" error={form.formState.errors.working_days?.message}>
            <Input type="number" min="0" max="31" {...form.register('working_days')} />
          </FormField>
          <FormField label="Hadir" error={form.formState.errors.present_days?.message}>
            <Input type="number" min="0" max="31" {...form.register('present_days')} />
          </FormField>
          <FormField label="Sakit" error={form.formState.errors.sick_days?.message}>
            <Input type="number" min="0" max="31" {...form.register('sick_days')} />
          </FormField>
          <FormField label="Izin/Cuti" error={form.formState.errors.leave_days?.message}>
            <Input type="number" min="0" max="31" {...form.register('leave_days')} />
          </FormField>
          <FormField label="Alpa" error={form.formState.errors.absent_days?.message}>
            <Input type="number" min="0" max="31" {...form.register('absent_days')} />
          </FormField>
          <FormField label="Jam Lembur" error={form.formState.errors.overtime_hours?.message}>
            <Input type="number" min="0" step="0.5" {...form.register('overtime_hours')} />
          </FormField>
        </div>
        <FormField label="Catatan" error={form.formState.errors.notes?.message}>
          <Textarea placeholder="Keterangan tambahan" {...form.register('notes')} />
        </FormField>
      </form>
    </Modal>
  );
}
