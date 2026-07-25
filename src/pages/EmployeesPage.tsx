import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  BriefcaseBusiness,
  Building2,
  Edit3,
  History,
  Plus,
  RotateCcw,
  Search,
  UserRoundSearch,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmployeeFormModal } from '@/components/employees/EmployeeFormModal';
import { Avatar } from '@/components/common/Avatar';
import { ExportMenu } from '@/components/common/ExportMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  ColumnVisibilityMenu,
  ResizableSortHeader,
  TablePagination,
} from '@/components/ui/TableTools';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/hooks/useAuth';
import { useDataTable, type TableColumn } from '@/hooks/useDataTable';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
import { EMPLOYMENT_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/utils';
import {
  listEmployeeHistory,
  listEmployees,
  restoreEmployee,
  saveEmployee,
  softDeleteEmployee,
  type EmployeePayload,
} from '@/services/employee.service';
import { getOrganization } from '@/services/lookup.service';
import type {
  EmployeeDirectoryRow,
  EmploymentStatus,
} from '@/types/database';
import { formatCurrency, formatDate } from '@/utils/format';

const statusVariant: Record<EmploymentStatus, 'success' | 'warning' | 'primary' | 'neutral' | 'danger'> = {
  permanent: 'success',
  contract: 'primary',
  probation: 'warning',
  intern: 'neutral',
  inactive: 'danger',
};

type ArchiveMode = 'active' | 'archived';

export default function EmployeesPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [status, setStatus] = useState('');
  const [archiveMode, setArchiveMode] = useState<ArchiveMode>('active');
  const [editing, setEditing] = useState<EmployeeDirectoryRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [archiving, setArchiving] = useState<EmployeeDirectoryRow | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [restoring, setRestoring] = useState<EmployeeDirectoryRow | null>(null);
  const [historyEmployee, setHistoryEmployee] = useState<EmployeeDirectoryRow | null>(null);
  const debouncedSearch = useDebounce(search);

  const organization = useQuery({ queryKey: ['organization'], queryFn: getOrganization });
  const filters = useMemo(() => ({
    search: debouncedSearch,
    divisionId,
    positionId,
    status,
    archive: archiveMode,
  }), [archiveMode, debouncedSearch, divisionId, positionId, status]);
  const employees = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => listEmployees(filters),
  });
  const history = useQuery({
    queryKey: ['employee-history', historyEmployee?.id],
    queryFn: () => listEmployeeHistory(historyEmployee!.id),
    enabled: Boolean(historyEmployee),
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      toast.success(editing ? 'Data karyawan diperbarui.' : 'Karyawan berhasil ditambahkan.');
      setFormOpen(false);
      setEditing(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => {
      if (!archiving) throw new Error('Karyawan tidak dipilih.');
      return softDeleteEmployee(archiving, archiveReason);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      toast.success('Karyawan berhasil diarsipkan.');
      setArchiving(null);
      setArchiveReason('');
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const restoreMutation = useMutation({
    mutationFn: () => {
      if (!restoring) throw new Error('Karyawan tidak dipilih.');
      return restoreEmployee(restoring);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      toast.success('Karyawan berhasil dipulihkan.');
      setRestoring(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const rows = employees.data ?? [];
  type ColumnKey = 'employee' | 'organization' | 'status' | 'bank' | 'compensation' | 'joinDate' | 'archivedAt';
  const columns = useMemo<Array<TableColumn<EmployeeDirectoryRow, ColumnKey>>>(() => [
    { key: 'employee', label: 'Karyawan', accessor: row => row.name, defaultWidth: 290 },
    { key: 'organization', label: 'Organisasi', accessor: row => `${row.division_name} ${row.department_name} ${row.position_name}`, defaultWidth: 300 },
    { key: 'status', label: 'Status', accessor: row => row.employment_status, defaultWidth: 130 },
    { key: 'bank', label: 'Bank', accessor: row => `${row.bank_name} ${row.bank_account}`, defaultWidth: 190 },
    { key: 'compensation', label: 'Gaji & Tunjangan', accessor: row => Number(row.basic_salary) + Number(row.fixed_allowance) + Number(row.variable_allowance), defaultWidth: 210 },
    { key: 'joinDate', label: 'Tanggal Masuk', accessor: row => row.join_date, defaultWidth: 150 },
    { key: 'archivedAt', label: 'Diarsipkan', accessor: row => row.deleted_at, defaultVisible: archiveMode === 'archived', defaultWidth: 170 },
  ], [archiveMode]);
  const table = useDataTable({
    tableId: `employees-${archiveMode}`,
    rows,
    columns,
    initialPageSize: 20,
  });

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Master Data Karyawan"
        description="Kelola identitas, organisasi, kompensasi, foto, riwayat perubahan, arsip, dan pemulihan karyawan."
        actions={
          <>
            <ExportMenu
              options={{
                rows: table.sortedRows,
                columns: [
                  { label: 'NIK', value: row => row.nik },
                  { label: 'Nama', value: row => row.name },
                  { label: 'Divisi', value: row => row.division_name },
                  { label: 'Departemen', value: row => row.department_name },
                  { label: 'Jabatan', value: row => row.position_name },
                  { label: 'Status', value: row => EMPLOYMENT_LABELS[row.employment_status] },
                  { label: 'Tanggal Masuk', value: row => row.join_date },
                  { label: 'Bank', value: row => row.bank_name },
                  { label: 'Rekening', value: row => row.bank_account },
                  { label: 'Gaji Pokok', value: row => Number(row.basic_salary) },
                  { label: 'Tunjangan Tetap', value: row => Number(row.fixed_allowance) },
                  { label: 'Tunjangan Tidak Tetap', value: row => Number(row.variable_allowance) },
                  { label: 'Email', value: row => row.email },
                  { label: 'HP', value: row => row.phone },
                  { label: 'Diarsipkan', value: row => row.deleted_at ?? '' },
                ],
                fileName: archiveMode === 'active' ? 'karyawan-aktif' : 'karyawan-diarsipkan',
                title: archiveMode === 'active' ? 'Karyawan Aktif' : 'Karyawan Diarsipkan',
                entityType: 'employees',
              }}
            />
            {can('employees.write') && archiveMode === 'active' && (
              <Button onClick={openAdd}><Plus className="size-4" /> Tambah Karyawan</Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                variant={archiveMode === 'active' ? 'primary' : 'ghost'}
                onClick={() => setArchiveMode('active')}
              >
                <Users className="size-4" /> Karyawan Aktif
              </Button>
              <Button
                variant={archiveMode === 'archived' ? 'primary' : 'ghost'}
                onClick={() => setArchiveMode('archived')}
              >
                <Archive className="size-4" /> Karyawan Diarsipkan
              </Button>
            </div>
            <ColumnVisibilityMenu
              columns={columns}
              visible={table.visible}
              onToggle={table.toggleColumn}
              onReset={table.reset}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
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
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {employees.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : table.pageRows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="data-table table-fixed">
                <thead>
                  <tr>
                    {table.visibleColumns.map(column => {
                      const rule = table.sort.find(item => item.key === column.key);
                      return (
                        <ResizableSortHeader
                          key={column.key}
                          label={column.label}
                          width={table.widths[column.key]}
                          direction={rule?.direction}
                          sortIndex={rule ? table.sort.indexOf(rule) : undefined}
                          onSort={multi => table.toggleSort(column.key, multi)}
                          onResize={width => table.resizeColumn(column.key, width)}
                        />
                      );
                    })}
                    <th className="w-44">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map(employee => (
                    <tr key={employee.id}>
                      {table.visible.employee && (
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar path={employee.photo_path} name={employee.name} />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900 dark:text-white">{employee.name}</p>
                              <p className="truncate text-xs text-slate-500">{employee.nik} · {employee.email || 'Email belum diisi'}</p>
                            </div>
                          </div>
                        </td>
                      )}
                      {table.visible.organization && (
                        <td>
                          <div className="space-y-1">
                            <p className="flex items-center gap-1.5 font-semibold"><BriefcaseBusiness className="size-3.5 text-brand-500" />{employee.position_name}</p>
                            <p className="flex items-center gap-1.5 text-xs text-slate-500"><Building2 className="size-3.5" />{employee.division_name} · {employee.department_name}</p>
                          </div>
                        </td>
                      )}
                      {table.visible.status && <td><Badge variant={statusVariant[employee.employment_status]}>{EMPLOYMENT_LABELS[employee.employment_status]}</Badge></td>}
                      {table.visible.bank && (
                        <td><p className="font-semibold">{employee.bank_name}</p><p className="text-xs text-slate-500">{employee.bank_account}</p></td>
                      )}
                      {table.visible.compensation && (
                        <td><p className="font-bold">{formatCurrency(employee.basic_salary)}</p><p className="text-xs text-slate-500">Tunjangan {formatCurrency(employee.fixed_allowance + employee.variable_allowance)}</p></td>
                      )}
                      {table.visible.joinDate && <td>{formatDate(employee.join_date)}</td>}
                      {table.visible.archivedAt && (
                        <td><p>{formatDate(employee.deleted_at, 'dd MMM yyyy HH:mm')}</p><p className="text-xs text-slate-500">{employee.delete_reason || '—'}</p></td>
                      )}
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setHistoryEmployee(employee)} aria-label="Lihat Riwayat">
                            <History className="size-4" />
                          </Button>
                          {archiveMode === 'active' && can('employees.write') && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => { setEditing(employee); setFormOpen(true); }} aria-label={`Edit ${employee.name}`}>
                                <Edit3 className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-amber-600" onClick={() => setArchiving(employee)} aria-label="Arsipkan Karyawan">
                                <Archive className="size-4" />
                              </Button>
                            </>
                          )}
                          {archiveMode === 'archived' && can('employees.write') && (
                            <Button variant="success" size="sm" onClick={() => setRestoring(employee)}>
                              <RotateCcw className="size-4" /> Pulihkan
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={table.page}
              pageCount={table.pageCount}
              pageSize={table.pageSize}
              totalRows={table.totalRows}
              onPage={table.setPage}
              onPageSize={table.setPageSize}
            />
          </>
        ) : (
          <EmptyState
            icon={UserRoundSearch}
            title="Karyawan tidak ditemukan"
            description={archiveMode === 'active' ? 'Ubah filter atau tambahkan karyawan pertama.' : 'Belum ada karyawan yang diarsipkan.'}
            action={can('employees.write') && archiveMode === 'active' ? <Button onClick={openAdd}><Plus className="size-4" /> Tambah Karyawan</Button> : undefined}
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

      <Modal
        open={Boolean(archiving)}
        onClose={() => { setArchiving(null); setArchiveReason(''); }}
        title="Arsipkan Karyawan"
        description={`${archiving?.name ?? ''} tidak akan tampil sebagai karyawan aktif dan tidak ikut generate payroll baru.`}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setArchiving(null); setArchiveReason(''); }}>Batal</Button>
            <Button variant="danger" loading={archiveMutation.isPending} onClick={() => archiveMutation.mutate()}>
              Arsipkan Karyawan
            </Button>
          </div>
        }
      >
        <label className="block">
          <span className="field-label">Alasan</span>
          <Textarea value={archiveReason} onChange={event => setArchiveReason(event.target.value)} placeholder="Contoh: mengundurkan diri, kontrak berakhir, atau duplikasi data." />
        </label>
      </Modal>

      <ConfirmDialog
        open={Boolean(restoring)}
        title="Pulihkan karyawan?"
        description={`${restoring?.name ?? ''} akan kembali berstatus Tetap dan tampil pada daftar karyawan aktif.`}
        confirmLabel="Pulihkan"
        variant="primary"
        loading={restoreMutation.isPending}
        onClose={() => setRestoring(null)}
        onConfirm={() => restoreMutation.mutate()}
      />

      <Modal
        open={Boolean(historyEmployee)}
        onClose={() => setHistoryEmployee(null)}
        title={`Riwayat Perubahan ${historyEmployee?.name ?? ''}`}
        description="Audit create, update, archive, restore, import, dan tindakan terkait karyawan."
        size="lg"
      >
        {history.isLoading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : history.data?.length ? (
          <div className="space-y-3">
            {history.data.map(item => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={item.action === 'HAPUS' ? 'danger' : item.action === 'RESTORE' ? 'success' : 'primary'}>{item.action}</Badge>
                  <span className="text-xs text-slate-500">{formatDate(item.created_at, 'dd MMM yyyy HH:mm')}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{item.description}</p>
                <p className="mt-1 text-xs text-slate-500">{item.user_name ?? 'Sistem'} · {item.device ?? '—'} · {item.ip_address ?? '—'}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={History} title="Riwayat belum tersedia" description="Aktivitas karyawan ini belum tercatat." />
        )}
      </Modal>
    </>
  );
}
