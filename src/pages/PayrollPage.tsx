import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Edit3,
  FileDown,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { PayrollFormModal } from '@/components/payroll/PayrollFormModal';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
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
import { PAYROLL_STATUS_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/utils';
import { exportPayrollCsv, exportPayrollExcel } from '@/services/export.service';
import { listEmployees } from '@/services/employee.service';
import { getOrganization } from '@/services/lookup.service';
import {
  deletePayroll,
  generatePayrollBatch,
  listPayrolls,
  savePayroll,
  updatePayrollStatus,
  type PayrollPayload,
} from '@/services/payroll.service';
import type { PayrollDetailRow, PayrollStatus } from '@/types/database';
import { formatCurrency, formatNumber, formatPeriod } from '@/utils/format';

const statusVariant: Record<PayrollStatus, 'neutral' | 'primary' | 'success' | 'danger'> = {
  draft: 'neutral',
  finalized: 'primary',
  paid: 'success',
  cancelled: 'danger',
};

type StatusTarget = { row: PayrollDetailRow; status: PayrollStatus } | null;

export default function PayrollPage() {
  const now = new Date();
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [status, setStatus] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [editing, setEditing] = useState<PayrollDetailRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<PayrollDetailRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget>(null);
  const debouncedSearch = useDebounce(search);

  const filters = useMemo(() => ({
    search: debouncedSearch,
    month,
    year,
    status,
    divisionId,
    positionId,
  }), [debouncedSearch, divisionId, month, positionId, status, year]);

  const payrolls = useQuery({ queryKey: ['payrolls', filters], queryFn: () => listPayrolls(filters) });
  const employees = useQuery({ queryKey: ['employees', 'payroll-options'], queryFn: () => listEmployees() });
  const organization = useQuery({ queryKey: ['organization'], queryFn: getOrganization });

  const summary = useMemo(() => (payrolls.data ?? []).reduce((acc, row) => ({
    gross: acc.gross + Number(row.total_income),
    deductions: acc.deductions + Number(row.total_deduction),
    net: acc.net + Number(row.net_salary),
  }), { gross: 0, deductions: 0, net: 0 }), [payrolls.data]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payrolls'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: PayrollPayload) => {
      if (!user) throw new Error('Sesi pengguna tidak tersedia.');
      return savePayroll({ ...payload, id: editing?.id, userId: user.id });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success('Draft payroll berhasil disimpan.');
      setFormOpen(false);
      setEditing(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const generateMutation = useMutation({
    mutationFn: () => generatePayrollBatch(`${year}-${month}-01`),
    onSuccess: async result => {
      await invalidate();
      toast.success(`${result.inserted} payroll dibuat, ${result.skipped} dilewati karena sudah tersedia.`);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ row, status: nextStatus }: NonNullable<StatusTarget>) => updatePayrollStatus(row, nextStatus),
    onSuccess: async () => {
      await invalidate();
      toast.success('Status payroll berhasil diperbarui.');
      setStatusTarget(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePayroll,
    onSuccess: async () => {
      await invalidate();
      toast.success('Draft payroll berhasil dihapus.');
      setDeleting(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const exportWithToast = async (kind: 'xlsx' | 'csv') => {
    try {
      const rows = payrolls.data ?? [];
      if (!rows.length) throw new Error('Tidak ada data untuk diekspor.');
      if (kind === 'xlsx') await exportPayrollExcel(rows);
      else await exportPayrollCsv(rows);
      toast.success(`Export ${kind.toUpperCase()} selesai.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <PageHeader
        title="Penggajian"
        description="Buat, tinjau, finalisasi, dan tandai pembayaran payroll dengan kalkulasi otomatis."
        actions={
          <>
            <Button variant="secondary" onClick={() => void exportWithToast('xlsx')}><FileSpreadsheet className="size-4" /> Excel</Button>
            <Button variant="secondary" onClick={() => void exportWithToast('csv')}><FileDown className="size-4" /> CSV</Button>
            {can('payroll.write') && (
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" /> Buat Payroll</Button>
            )}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jumlah Payroll" value={formatNumber(payrolls.data?.length ?? 0)} description={`${month}/${year}`} icon={WalletCards} />
        <StatCard label="Total Pendapatan" value={formatCurrency(summary.gross)} description="Sebelum potongan" icon={WalletCards} index={1} />
        <StatCard label="Total Potongan" value={formatCurrency(summary.deductions)} description="Kasbon, BPJS, pajak, lainnya" icon={WalletCards} index={2} />
        <StatCard label="Total Bersih" value={formatCurrency(summary.net)} description="Nilai diterima karyawan" icon={CheckCircle2} index={3} />
      </section>

      <Card className="mt-5">
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_.7fr_.7fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nama, NIK, nomor slip..." />
          </div>
          <Select value={month} onChange={event => setMonth(event.target.value)}>
            {Array.from({ length: 12 }, (_, index) => {
              const value = String(index + 1).padStart(2, '0');
              return <option key={value} value={value}>{new Date(2025, index, 1).toLocaleString('id-ID', { month: 'long' })}</option>;
            })}
          </Select>
          <Input type="number" min="2020" max="2100" value={year} onChange={event => setYear(event.target.value)} />
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
            {Object.entries(PAYROLL_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          {can('payroll.write') && (
            <Button
              variant="secondary"
              loading={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
              title="Membuat draft untuk seluruh karyawan aktif yang belum memiliki payroll periode ini"
            >
              Generate Massal
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {payrolls.isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : payrolls.data?.length ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1150px]">
              <thead>
                <tr>
                  <th>Slip & Periode</th><th>Karyawan</th><th>Pendapatan</th><th>Potongan</th>
                  <th>Total Bersih</th><th>Status</th><th className="w-48">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.data.map(row => (
                  <tr key={row.id}>
                    <td>
                      <p className="font-mono text-xs font-bold text-brand-600">{row.slip_number}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatPeriod(row.period)}</p>
                    </td>
                    <td>
                      <p className="font-bold text-slate-900 dark:text-white">{row.employee_name}</p>
                      <p className="text-xs text-slate-500">{row.nik} · {row.position_name}</p>
                    </td>
                    <td>{formatCurrency(row.total_income)}</td>
                    <td className="text-rose-600">{formatCurrency(row.total_deduction)}</td>
                    <td className="font-black text-emerald-600">{formatCurrency(row.net_salary)}</td>
                    <td><Badge variant={statusVariant[row.status]}>{PAYROLL_STATUS_LABELS[row.status]}</Badge></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {row.status === 'draft' && can('payroll.write') && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => { setEditing(row); setFormOpen(true); }}>
                              <Edit3 className="size-3.5" /> Edit
                            </Button>
                            <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => setDeleting(row)} aria-label="Hapus payroll">
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                        {row.status === 'draft' && can('payroll.finalize') && (
                          <Button size="sm" onClick={() => setStatusTarget({ row, status: 'finalized' })}>
                            Finalisasi
                          </Button>
                        )}
                        {row.status === 'finalized' && can('payroll.finalize') && (
                          <Button size="sm" variant="success" onClick={() => setStatusTarget({ row, status: 'paid' })}>
                            Tandai Dibayar
                          </Button>
                        )}
                        {(row.status === 'finalized' || row.status === 'paid') && (
                          <Button variant="ghost" size="sm" onClick={() => location.assign(`/app/payslips?slip=${encodeURIComponent(row.slip_number)}`)}>
                            Lihat Slip
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={WalletCards}
            title="Belum ada payroll"
            description={`Belum ada payroll untuk ${formatPeriod(`${year}-${month}-01`)}. Generate massal atau buat satu per satu.`}
            action={can('payroll.write') ? (
              <Button onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>Generate Payroll Massal</Button>
            ) : undefined}
          />
        )}
      </Card>

      <PayrollFormModal
        open={formOpen}
        editing={editing}
        employees={employees.data ?? []}
        saving={saveMutation.isPending}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={payload => saveMutation.mutateAsync(payload).then(() => undefined)}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.status === 'paid' ? 'Tandai payroll telah dibayar?' : 'Finalisasi payroll?'}
        description={statusTarget?.status === 'paid'
          ? `${statusTarget.row.slip_number} akan dicatat telah dibayar.`
          : `${statusTarget?.row.slip_number ?? ''} akan dikunci sebagai snapshot historis. Komponen finansial tidak dapat diedit lagi setelah finalisasi.`}
        confirmLabel={statusTarget?.status === 'paid' ? 'Tandai Dibayar' : 'Finalisasi'}
        variant="primary"
        loading={statusMutation.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => statusTarget && statusMutation.mutate(statusTarget)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus draft payroll?"
        description={`${deleting?.slip_number ?? ''} akan dihapus permanen. Hanya payroll berstatus draft yang dapat dihapus.`}
        confirmLabel="Hapus Draft"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </>
  );
}
