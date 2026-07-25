import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck2,
  Clock3,
  Edit3,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AttendanceFormModal } from '@/components/employees/AttendanceFormModal';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
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
import { currentPeriod, formatNumber, formatPeriod, fromMonthInput, toMonthInput } from '@/utils/format';

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

  const employees = useQuery({ queryKey: ['employees', 'attendance-options'], queryFn: () => listEmployees() });
  const attendance = useQuery({
    queryKey: ['attendance', period, debouncedSearch],
    queryFn: () => listAttendance({ period: fromMonthInput(period), search: debouncedSearch }),
  });

  const totals = useMemo(() => (attendance.data ?? []).reduce((acc, item) => ({
    present: acc.present + item.present_days,
    absent: acc.absent + item.absent_days,
    overtime: acc.overtime + Number(item.overtime_hours),
  }), { present: 0, absent: 0, overtime: 0 }), [attendance.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: AttendancePayload) => {
      if (!user) throw new Error('Sesi pengguna tidak tersedia.');
      await saveAttendance({ ...payload, id: editing?.id, userId: user.id });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Rekap kehadiran berhasil disimpan.');
      setFormOpen(false);
      setEditing(null);
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
        description="Catat ringkasan hadir, sakit, izin, alpa, dan jam lembur untuk statistik bulanan."
        actions={can('attendance.write') ? (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="size-4" /> Tambah Rekap
          </Button>
        ) : undefined}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Hari Hadir" value={formatNumber(totals.present)} description={formatPeriod(fromMonthInput(period))} icon={CalendarCheck2} />
        <StatCard label="Total Hari Alpa" value={formatNumber(totals.absent)} description="Akumulasi seluruh karyawan" icon={CalendarCheck2} index={1} />
        <StatCard label="Total Jam Lembur" value={formatNumber(totals.overtime)} description="Jam lembur tercatat" icon={Clock3} index={2} />
      </section>

      <Card className="mt-5">
        <CardContent className="grid gap-3 md:grid-cols-[220px_1fr]">
          <Input type="month" value={period} onChange={event => setPeriod(event.target.value)} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama atau NIK..." />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {attendance.isLoading ? (
          <TableSkeleton rows={7} columns={8} />
        ) : attendance.data?.length ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1050px]">
              <thead>
                <tr>
                  <th>Karyawan</th><th>Periode</th><th>Hari Kerja</th><th>Hadir</th>
                  <th>Sakit</th><th>Izin</th><th>Alpa</th><th>Lembur</th>
                  {can('attendance.write') && <th className="w-28">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {attendance.data.map(row => (
                  <tr key={row.id}>
                    <td>
                      <p className="font-bold text-slate-900 dark:text-white">{row.employee_name}</p>
                      <p className="text-xs text-slate-500">{row.nik} · {row.division_name}</p>
                    </td>
                    <td>{formatPeriod(row.period)}</td>
                    <td>{row.working_days}</td>
                    <td className="font-bold text-emerald-600">{row.present_days}</td>
                    <td>{row.sick_days}</td>
                    <td>{row.leave_days}</td>
                    <td className={row.absent_days ? 'font-bold text-rose-600' : ''}>{row.absent_days}</td>
                    <td>{formatNumber(row.overtime_hours)} jam</td>
                    {can('attendance.write') && (
                      <td>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(row); setFormOpen(true); }} aria-label="Edit kehadiran">
                            <Edit3 className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => setDeleting(row)} aria-label="Hapus kehadiran">
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
            icon={CalendarCheck2}
            title="Belum ada rekap kehadiran"
            description={`Belum ada data untuk ${formatPeriod(fromMonthInput(period))}.`}
            action={can('attendance.write') ? (
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" /> Tambah Rekap</Button>
            ) : undefined}
          />
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
        description={`Rekap ${deleting?.employee_name ?? ''} untuk ${deleting ? formatPeriod(deleting.period) : ''} akan dihapus.`}
        confirmLabel="Hapus Rekap"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </>
  );
}
