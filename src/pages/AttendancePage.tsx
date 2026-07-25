import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck2, Clock3, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AttendanceFormModal } from '@/components/employees/AttendanceFormModal';
import { ExportMenu } from '@/components/common/ExportMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  ColumnVisibilityMenu,
  ResizableSortHeader,
  TablePagination,
} from '@/components/ui/TableTools';
import { useAuth } from '@/hooks/useAuth';
import { useDataTable, type TableColumn } from '@/hooks/useDataTable';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
import { getErrorMessage } from '@/lib/utils';
import {
  deleteAttendance,
  listAttendance,
  saveAttendance,
  type AttendancePayload,
} from '@/services/attendance.service';
import { listEmployees } from '@/services/employee.service';
import type { AttendanceDetailRow } from '@/types/database';
import {
  currentPeriod,
  formatNumber,
  formatPeriod,
  fromMonthInput,
  toMonthInput,
} from '@/utils/format';

export default function AttendancePage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(toMonthInput(currentPeriod()));
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AttendanceDetailRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AttendanceDetailRow | null>(null);
  const debouncedSearch = useDebounce(search);

  const employees = useQuery({
    queryKey: ['employees', 'attendance-options'],
    queryFn: () => listEmployees({ archive: 'active' }),
  });
  const attendance = useQuery({
    queryKey: ['attendance', period, debouncedSearch],
    queryFn: () => listAttendance({ period: fromMonthInput(period), search: debouncedSearch }),
  });

  const rows = attendance.data ?? [];
  const totals = useMemo(() => rows.reduce((acc, item) => ({
    present: acc.present + item.present_days,
    absent: acc.absent + item.absent_days,
    overtime: acc.overtime + Number(item.overtime_hours),
  }), { present: 0, absent: 0, overtime: 0 }), [rows]);

  type ColumnKey = 'employee' | 'period' | 'working' | 'present' | 'sick' | 'leave' | 'absent' | 'overtime';
  const columns = useMemo<Array<TableColumn<AttendanceDetailRow, ColumnKey>>>(() => [
    { key: 'employee', label: 'Karyawan', accessor: row => `${row.employee_name} ${row.nik}`, defaultWidth: 280 },
    { key: 'period', label: 'Periode', accessor: row => row.period, defaultWidth: 160 },
    { key: 'working', label: 'Hari Kerja', accessor: row => row.working_days, defaultWidth: 120 },
    { key: 'present', label: 'Hadir', accessor: row => row.present_days, defaultWidth: 100 },
    { key: 'sick', label: 'Sakit', accessor: row => row.sick_days, defaultWidth: 100 },
    { key: 'leave', label: 'Izin', accessor: row => row.leave_days, defaultWidth: 100 },
    { key: 'absent', label: 'Alpa', accessor: row => row.absent_days, defaultWidth: 100 },
    { key: 'overtime', label: 'Lembur', accessor: row => Number(row.overtime_hours), defaultWidth: 130 },
  ], []);
  const table = useDataTable({ tableId: 'attendance', rows, columns, initialPageSize: 20 });

  const saveMutation = useMutation({
    mutationFn: async (payload: AttendancePayload) => {
      if (!user) throw new Error('Sesi pengguna tidak tersedia.');
      await saveAttendance({ ...payload, id: editing?.id, userId: user.id });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      toast.success('Rekap kehadiran berhasil disimpan.');
      setFormOpen(false); setEditing(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttendance,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Rekap kehadiran berhasil dihapus.');
      setDeleting(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  return (
    <>
      <PageHeader
        title="Kehadiran Karyawan"
        description="Catat, cari, urutkan, ekspor, dan analisis ringkasan hadir, sakit, izin, alpa, serta lembur."
        actions={
          <>
            <ExportMenu
              options={{
                rows: table.sortedRows,
                columns: [
                  { label: 'NIK', value: row => row.nik },
                  { label: 'Nama', value: row => row.employee_name },
                  { label: 'Divisi', value: row => row.division_name },
                  { label: 'Departemen', value: row => row.department_name },
                  { label: 'Periode', value: row => row.period },
                  { label: 'Hari Kerja', value: row => row.working_days },
                  { label: 'Hadir', value: row => row.present_days },
                  { label: 'Sakit', value: row => row.sick_days },
                  { label: 'Izin', value: row => row.leave_days },
                  { label: 'Alpa', value: row => row.absent_days },
                  { label: 'Jam Lembur', value: row => Number(row.overtime_hours) },
                ],
                fileName: `kehadiran-${period}`,
                title: `Kehadiran ${formatPeriod(fromMonthInput(period))}`,
                entityType: 'attendance',
              }}
            />
            {can('attendance.write') && (
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="size-4" /> Tambah Rekap
              </Button>
            )}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Hari Hadir" value={formatNumber(totals.present)} description={formatPeriod(fromMonthInput(period))} icon={CalendarCheck2} />
        <StatCard label="Total Hari Alpa" value={formatNumber(totals.absent)} description="Akumulasi seluruh karyawan" icon={CalendarCheck2} index={1} />
        <StatCard label="Total Jam Lembur" value={formatNumber(totals.overtime)} description="Jam lembur tercatat" icon={Clock3} index={2} />
      </section>

      <Card className="mt-5">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-[220px_1fr]">
            <Input type="month" value={period} onChange={event => setPeriod(event.target.value)} />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama atau NIK..." />
            </div>
          </div>
          <ColumnVisibilityMenu columns={columns} visible={table.visible} onToggle={table.toggleColumn} onReset={table.reset} />
        </CardContent>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {attendance.isLoading ? (
          <TableSkeleton rows={7} columns={8} />
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
                    {can('attendance.write') && <th className="w-28">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map(row => (
                    <tr key={row.id}>
                      {table.visible.employee && <td><p className="font-bold">{row.employee_name}</p><p className="text-xs text-slate-500">{row.nik} · {row.division_name}</p></td>}
                      {table.visible.period && <td>{formatPeriod(row.period)}</td>}
                      {table.visible.working && <td>{row.working_days}</td>}
                      {table.visible.present && <td className="font-bold text-emerald-600">{row.present_days}</td>}
                      {table.visible.sick && <td>{row.sick_days}</td>}
                      {table.visible.leave && <td>{row.leave_days}</td>}
                      {table.visible.absent && <td className={row.absent_days ? 'font-bold text-rose-600' : ''}>{row.absent_days}</td>}
                      {table.visible.overtime && <td>{formatNumber(row.overtime_hours)} jam</td>}
                      {can('attendance.write') && (
                        <td><div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(row); setFormOpen(true); }}><Edit3 className="size-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => setDeleting(row)}><Trash2 className="size-4" /></Button>
                        </div></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} totalRows={table.totalRows} onPage={table.setPage} onPageSize={table.setPageSize} />
          </>
        ) : (
          <EmptyState icon={CalendarCheck2} title="Belum ada rekap kehadiran" description={`Belum ada data untuk ${formatPeriod(fromMonthInput(period))}.`} />
        )}
      </Card>

      <AttendanceFormModal
        open={formOpen}
        editing={editing}
        employees={employees.data ?? []}
        saving={saveMutation.isPending}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={payload => saveMutation.mutateAsync(payload).then(() => undefined)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus rekap kehadiran?"
        description={`Rekap ${deleting?.employee_name ?? ''} akan dihapus.`}
        confirmLabel="Hapus Rekap"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </>
  );
}
