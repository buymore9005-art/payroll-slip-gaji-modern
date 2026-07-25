import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BriefcaseBusiness,
  Building2,
  Edit3,
  Plus,
  Search,
  Trash2,
  UserRoundSearch,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmployeeFormModal } from '@/components/employees/EmployeeFormModal';
import { Avatar } from '@/components/common/Avatar';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
import { EMPLOYMENT_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/utils';
import {
  deleteEmployee,
  listEmployees,
  saveEmployee,
  type EmployeePayload,
} from '@/services/employee.service';
import { getOrganization } from '@/services/lookup.service';
import type { EmployeeDirectoryRow, EmploymentStatus } from '@/types/database';
import { formatCurrency, formatDate } from '@/utils/format';

const statusVariant: Record<EmploymentStatus, 'success' | 'warning' | 'primary' | 'neutral' | 'danger'> = {
  permanent: 'success',
  contract: 'primary',
  probation: 'warning',
  intern: 'neutral',
  inactive: 'danger',
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<EmployeeDirectoryRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<EmployeeDirectoryRow | null>(null);
  const debouncedSearch = useDebounce(search);

  const organization = useQuery({ queryKey: ['organization'], queryFn: getOrganization });
  const filters = useMemo(() => ({
    search: debouncedSearch,
    divisionId,
    positionId,
    status,
  }), [debouncedSearch, divisionId, positionId, status]);
  const employees = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => listEmployees(filters),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ values, photo }: { values: EmployeePayload; photo: File | null }) => {
      if (!user) throw new Error('Sesi pengguna tidak tersedia.');
      return saveEmployee({
        ...values,
        id: editing?.id,
        photo,
        oldPhotoPath: editing?.photo_path,
        userId: user.id,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(editing ? 'Data karyawan diperbarui.' : 'Karyawan berhasil ditambahkan.');
      setFormOpen(false);
      setEditing(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Karyawan berhasil dihapus.');
      setDeleting(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Master Data Karyawan"
        description="Kelola identitas, struktur organisasi, rekening, kepesertaan, foto, dan komponen gaji karyawan."
        actions={can('employees.write') ? (
          <Button onClick={openAdd}><Plus className="size-4" /> Tambah Karyawan</Button>
        ) : undefined}
      />

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-10" placeholder="Cari nama, NIK, atau email..." value={search} onChange={event => setSearch(event.target.value)} />
          </div>
          <Select value={divisionId} onChange={event => setDivisionId(event.target.value)}>
            <option value="">Semua Divisi</option>
            {organization.data?.divisions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select value={positionId} onChange={event => setPositionId(event.target.value)}>
            <option value="">Semua Jabatan</option>
            {organization.data?.positions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">Semua Status</option>
            {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </CardContent>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {employees.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : employees.data?.length ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1050px]">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Organisasi</th>
                  <th>Status</th>
                  <th>Bank</th>
                  <th>Gaji & Tunjangan</th>
                  <th>Tanggal Masuk</th>
                  {can('employees.write') && <th className="w-28">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {employees.data.map(employee => (
                  <tr key={employee.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar path={employee.photo_path} name={employee.name} />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{employee.name}</p>
                          <p className="text-xs text-slate-500">{employee.nik} · {employee.email || 'Email belum diisi'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5 font-semibold"><BriefcaseBusiness className="size-3.5 text-brand-500" />{employee.position_name}</p>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500"><Building2 className="size-3.5" />{employee.division_name} · {employee.department_name}</p>
                      </div>
                    </td>
                    <td><Badge variant={statusVariant[employee.employment_status]}>{EMPLOYMENT_LABELS[employee.employment_status]}</Badge></td>
                    <td>
                      <p className="font-semibold">{employee.bank_name}</p>
                      <p className="text-xs text-slate-500">{employee.bank_account}</p>
                    </td>
                    <td>
                      <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(employee.basic_salary)}</p>
                      <p className="text-xs text-slate-500">Tunjangan {formatCurrency(employee.fixed_allowance + employee.variable_allowance)}</p>
                    </td>
                    <td>{formatDate(employee.join_date)}</td>
                    {can('employees.write') && (
                      <td>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${employee.name}`}
                            onClick={() => { setEditing(employee); setFormOpen(true); }}
                          >
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            aria-label={`Hapus ${employee.name}`}
                            onClick={() => setDeleting(employee)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={UserRoundSearch}
            title="Karyawan tidak ditemukan"
            description="Ubah filter pencarian atau tambahkan data karyawan pertama."
            action={can('employees.write') ? <Button onClick={openAdd}><Plus className="size-4" /> Tambah Karyawan</Button> : undefined}
          />
        )}
      </Card>

      <EmployeeFormModal
        open={formOpen}
        employee={editing}
        divisions={organization.data?.divisions ?? []}
        departments={organization.data?.departments ?? []}
        positions={organization.data?.positions ?? []}
        saving={saveMutation.isPending}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={(values, photo) => saveMutation.mutateAsync({ values, photo }).then(() => undefined)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus karyawan?"
        description={`Data ${deleting?.name ?? ''} akan dihapus. Payroll yang sudah dibuat tetap mempertahankan snapshot historisnya. Karyawan dengan relasi aktif mungkin tidak dapat dihapus.`}
        confirmLabel="Hapus Karyawan"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </>
  );
}
