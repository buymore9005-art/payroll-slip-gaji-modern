import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Upload } from 'lucide-react';
import { z } from 'zod';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { FormField } from '@/components/common/FormField';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type {
  DepartmentRow,
  DivisionRow,
  EmployeeDirectoryRow,
  PositionRow,
} from '@/types/database';
import type { EmployeePayload } from '@/services/employee.service';

const schema = z.object({
  nik: z.string().min(2, 'NIK wajib diisi.'),
  name: z.string().min(3, 'Nama minimal 3 karakter.'),
  division_id: z.string().uuid('Pilih divisi.'),
  department_id: z.string().uuid('Pilih departemen.'),
  position_id: z.string().uuid('Pilih jabatan.'),
  employment_status: z.enum(['permanent', 'contract', 'probation', 'intern', 'inactive']),
  join_date: z.string().min(1, 'Tanggal masuk wajib diisi.'),
  bank_account: z.string().min(3, 'Nomor rekening wajib diisi.'),
  bank_name: z.string().min(2, 'Nama bank wajib diisi.'),
  npwp: z.string(),
  bpjs: z.string(),
  basic_salary: z.number().min(0),
  fixed_allowance: z.number().min(0),
  variable_allowance: z.number().min(0),
  email: z.union([z.literal(''), z.string().email('Email tidak valid.')]),
  phone: z.string(),
});
type FormValues = z.infer<typeof schema>;

const blank: FormValues = {
  nik: '',
  name: '',
  division_id: '',
  department_id: '',
  position_id: '',
  employment_status: 'permanent',
  join_date: new Date().toISOString().slice(0, 10),
  bank_account: '',
  bank_name: '',
  npwp: '',
  bpjs: '',
  basic_salary: 0,
  fixed_allowance: 0,
  variable_allowance: 0,
  email: '',
  phone: '',
};

export function EmployeeFormModal({
  open,
  employee,
  divisions,
  departments,
  positions,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  employee: EmployeeDirectoryRow | null;
  divisions: DivisionRow[];
  departments: DepartmentRow[];
  positions: PositionRow[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: EmployeePayload, photo: File | null) => Promise<void>;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: blank });
  const divisionId = form.watch('division_id');
  const departmentId = form.watch('department_id');

  useEffect(() => {
    if (!open) return;
    setPhoto(null);
    form.reset(employee ? {
      nik: employee.nik,
      name: employee.name,
      division_id: employee.division_id,
      department_id: employee.department_id,
      position_id: employee.position_id,
      employment_status: employee.employment_status,
      join_date: employee.join_date,
      bank_account: employee.bank_account,
      bank_name: employee.bank_name,
      npwp: employee.npwp,
      bpjs: employee.bpjs,
      basic_salary: Number(employee.basic_salary),
      fixed_allowance: Number(employee.fixed_allowance),
      variable_allowance: Number(employee.variable_allowance),
      email: employee.email,
      phone: employee.phone,
    } : blank);
  }, [employee, form, open]);

  const filteredDepartments = useMemo(
    () => departments.filter(item => item.division_id === divisionId),
    [departments, divisionId],
  );
  const filteredPositions = useMemo(
    () => positions.filter(item => !item.department_id || item.department_id === departmentId),
    [departmentId, positions],
  );

  const submit = form.handleSubmit(async values => {
    await onSubmit(values, photo);
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? 'Edit Data Karyawan' : 'Tambah Karyawan'}
      description="Lengkapi identitas, organisasi, rekening, dan komponen kompensasi."
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="submit" form="employee-form" loading={saving}>
            {employee ? 'Simpan Perubahan' : 'Tambah Karyawan'}
          </Button>
        </div>
      }
    >
      <form id="employee-form" onSubmit={submit} className="space-y-7">
        <section>
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-500">Identitas Karyawan</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="NIK" required error={form.formState.errors.nik?.message}>
              <Input placeholder="EMP-001" {...form.register('nik')} />
            </FormField>
            <FormField label="Nama Lengkap" required error={form.formState.errors.name?.message}>
              <Input placeholder="Nama karyawan" {...form.register('name')} />
            </FormField>
            <FormField label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" placeholder="nama@perusahaan.co.id" {...form.register('email')} />
            </FormField>
            <FormField label="Nomor HP" error={form.formState.errors.phone?.message}>
              <Input inputMode="tel" placeholder="081234567890" {...form.register('phone')} />
            </FormField>
            <FormField label="Status Karyawan" required error={form.formState.errors.employment_status?.message}>
              <Select {...form.register('employment_status')}>
                <option value="permanent">Tetap</option>
                <option value="contract">Kontrak</option>
                <option value="probation">Probation</option>
                <option value="intern">Magang</option>
                <option value="inactive">Tidak Aktif</option>
              </Select>
            </FormField>
            <FormField label="Tanggal Masuk" required error={form.formState.errors.join_date?.message}>
              <Input type="date" {...form.register('join_date')} />
            </FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-500">Organisasi</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Divisi" required error={form.formState.errors.division_id?.message}>
              <Select
                {...form.register('division_id')}
                onChange={event => {
                  form.setValue('division_id', event.target.value, { shouldValidate: true });
                  form.setValue('department_id', '');
                  form.setValue('position_id', '');
                }}
              >
                <option value="">Pilih divisi</option>
                {divisions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Departemen" required error={form.formState.errors.department_id?.message}>
              <Select
                {...form.register('department_id')}
                disabled={!divisionId}
                onChange={event => {
                  form.setValue('department_id', event.target.value, { shouldValidate: true });
                  form.setValue('position_id', '');
                }}
              >
                <option value="">Pilih departemen</option>
                {filteredDepartments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Jabatan" required error={form.formState.errors.position_id?.message}>
              <Select {...form.register('position_id')} disabled={!departmentId}>
                <option value="">Pilih jabatan</option>
                {filteredPositions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-500">Rekening & Kepesertaan</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Bank" required error={form.formState.errors.bank_name?.message}>
              <Input placeholder="BCA" {...form.register('bank_name')} />
            </FormField>
            <FormField label="Nomor Rekening" required error={form.formState.errors.bank_account?.message}>
              <Input placeholder="001234567890" {...form.register('bank_account')} />
            </FormField>
            <FormField label="NPWP" error={form.formState.errors.npwp?.message}>
              <Input placeholder="00.000.000.0-000.000" {...form.register('npwp')} />
            </FormField>
            <FormField label="BPJS" error={form.formState.errors.bpjs?.message}>
              <Input placeholder="Nomor BPJS" {...form.register('bpjs')} />
            </FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-500">Kompensasi</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Gaji Pokok" required error={form.formState.errors.basic_salary?.message}>
              <Controller
                control={form.control}
                name="basic_salary"
                render={({ field }) => <CurrencyInput value={field.value} onValueChange={field.onChange} />}
              />
            </FormField>
            <FormField label="Tunjangan Tetap" error={form.formState.errors.fixed_allowance?.message}>
              <Controller
                control={form.control}
                name="fixed_allowance"
                render={({ field }) => <CurrencyInput value={field.value} onValueChange={field.onChange} />}
              />
            </FormField>
            <FormField label="Tunjangan Tidak Tetap" error={form.formState.errors.variable_allowance?.message}>
              <Controller
                control={form.control}
                name="variable_allowance"
                render={({ field }) => <CurrencyInput value={field.value} onValueChange={field.onChange} />}
              />
            </FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-500">Foto Karyawan</h3>
          <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700 sm:flex-row sm:items-center">
            <Avatar
              path={photo ? undefined : employee?.photo_path}
              name={form.watch('name') || 'Karyawan'}
              className="size-16 rounded-2xl"
            />
            <div className="flex-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                <Upload className="size-4" />
                Pilih Foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={event => setPhoto(event.target.files?.[0] ?? null)}
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">JPG, PNG, atau WebP. Maksimal 5 MB.</p>
              {photo && <p className="mt-1 truncate text-xs font-semibold text-brand-600">{photo.name}</p>}
            </div>
          </div>
        </section>
      </form>
    </Modal>
  );
}
