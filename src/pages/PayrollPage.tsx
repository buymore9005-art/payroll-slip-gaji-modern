import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calculator,
  CheckCircle2,
  CheckSquare2,
  Copy,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Square,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PayrollFormModal } from '@/components/payroll/PayrollFormModal';
import { ExportMenu } from '@/components/common/ExportMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
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
import { useAuth } from '@/hooks/useAuth';
import { useDataTable, type TableColumn } from '@/hooks/useDataTable';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
import { PAYROLL_STATUS_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/utils';
import { listEmployees } from '@/services/employee.service';
import { getOrganization } from '@/services/lookup.service';
import {
  bulkDeletePayrolls,
  bulkUpdatePayrollStatus,
  deletePayroll,
  duplicatePayroll,
  generatePayrollBatch,
  listPayrolls,
  recalculatePayroll,
  savePayroll,
  updatePayrollStatus,
  type PayrollPayload,
} from '@/services/payroll.service';
import type { PayrollDetailRow, PayrollStatus } from '@/types/database';
import { formatCurrency, formatNumber, formatPeriod, fromMonthInput } from '@/utils/format';

const statusVariant: Record<PayrollStatus, 'neutral' | 'primary' | 'success' | 'danger'> = {
  draft: 'neutral',
  finalized: 'primary',
  paid: 'success',
  cancelled: 'danger',
};

type StatusTarget = { row: PayrollDetailRow; status: PayrollStatus } | null;
type BulkAction = 'finalized' | 'paid' | 'draft' | 'delete' | null;

export default function PayrollPage() {
  const now = new Date();
  const navigate = useNavigate();
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
  const [duplicateTarget, setDuplicateTarget] = useState<PayrollDetailRow | null>(null);
  const [duplicatePeriod, setDuplicatePeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`);
  const [recalculateTarget, setRecalculateTarget] = useState<PayrollDetailRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>(null);
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

  const rows = payrolls.data ?? [];
  const summary = useMemo(() => rows.reduce((acc, row) => ({
    gross: acc.gross + Number(row.total_income),
    deductions: acc.deductions + Number(row.total_deduction),
    net: acc.net + Number(row.net_salary),
  }), { gross: 0, deductions: 0, net: 0 }), [rows]);

  useEffect(() => {
    setSelected(current => new Set([...current].filter(id => rows.some(row => row.id === id))));
  }, [rows]);

  type ColumnKey = 'slip' | 'employee' | 'earnings' | 'deductions' | 'net' | 'status';
  const columns = useMemo<Array<TableColumn<PayrollDetailRow, ColumnKey>>>(() => [
    { key: 'slip', label: 'Slip & Periode', accessor: row => `${row.slip_number} ${row.period}`, defaultWidth: 200 },
    { key: 'employee', label: 'Karyawan', accessor: row => `${row.employee_name} ${row.nik} ${row.position_name}`, defaultWidth: 300 },
    { key: 'earnings', label: 'Pendapatan', accessor: row => Number(row.total_income), defaultWidth: 170 },
    { key: 'deductions', label: 'Potongan', accessor: row => Number(row.total_deduction), defaultWidth: 170 },
    { key: 'net', label: 'Total Bersih', accessor: row => Number(row.net_salary), defaultWidth: 180 },
    { key: 'status', label: 'Status', accessor: row => row.status, defaultWidth: 130 },
  ], []);
  const table = useDataTable({
    tableId: 'payroll',
    rows,
    columns,
    initialPageSize: 20,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payrolls'] }),
      queryClient.invalidateQueries({ queryKey: ['payslips'] }),
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
      setFormOpen(false); setEditing(null);
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

  const duplicateMutation = useMutation({
    mutationFn: () => {
      if (!duplicateTarget) throw new Error('Payroll tidak dipilih.');
      return duplicatePayroll(duplicateTarget, fromMonthInput(duplicatePeriod));
    },
    onSuccess: async () => {
      await invalidate();
      toast.success('Payroll berhasil diduplikasi sebagai draft.');
      setDuplicateTarget(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const recalculateMutation = useMutation({
    mutationFn: () => {
      if (!recalculateTarget) throw new Error('Payroll tidak dipilih.');
      return recalculatePayroll(recalculateTarget);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success('Payroll berhasil dihitung ulang dari master karyawan.');
      setRecalculateTarget(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const ids = [...selected];
      if (!ids.length || !bulkAction) throw new Error('Pilih payroll dan tindakan massal.');
      return bulkAction === 'delete'
        ? bulkDeletePayrolls(ids)
        : bulkUpdatePayrollStatus(ids, bulkAction);
    },
    onSuccess: async result => {
      await invalidate();
      toast.success(`${result.updated || result.deleted || 0} berhasil, ${result.skipped} dilewati`);
      setSelected(new Set());
      setBulkAction(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const toggleAll = () => {
    const currentPageIds = table.pageRows.map(row => row.id);
    const allSelected = currentPageIds.every(id => selected.has(id));
    setSelected(current => {
      const next = new Set(current);
      currentPageIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };
  const toggleOne = (id: string) => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const openDuplicate = (row: PayrollDetailRow) => {
    setDuplicateTarget(row);
    const source = new Date(`${row.period}T00:00:00`);
    source.setMonth(source.getMonth() + 1);
    setDuplicatePeriod(source.toISOString().slice(0, 7));
  };

  return (
    <>
      <PageHeader
        title="Penggajian"
        description="Buat, import, tinjau, duplikasi, hitung ulang, finalisasi, dan kelola pembayaran payroll."
        actions={
          <>
            <ExportMenu
              options={{
                rows: table.sortedRows,
                columns: [
                  { label: 'Nomor Slip', value: row => row.slip_number },
                  { label: 'Periode', value: row => row.period },
                  { label: 'NIK', value: row => row.nik },
                  { label: 'Nama', value: row => row.employee_name },
                  { label: 'Jabatan', value: row => row.position_name },
                  { label: 'Divisi', value: row => row.division_name },
                  { label: 'Gaji Pokok', value: row => Number(row.basic_salary) },
                  { label: 'Tunjangan', value: row => Number(row.fixed_allowance) + Number(row.variable_allowance) },
                  { label: 'Bonus', value: row => Number(row.bonus) },
                  { label: 'Lembur', value: row => Number(row.overtime) },
                  { label: 'Insentif', value: row => Number(row.incentive) },
                  { label: 'THR', value: row => Number(row.thr) },
                  { label: 'Potongan', value: row => Number(row.total_deduction) },
                  { label: 'Total Bersih', value: row => Number(row.net_salary) },
                  { label: 'Status', value: row => PAYROLL_STATUS_LABELS[row.status] },
                ],
                fileName: `payroll-${year}-${month}`,
                title: `Payroll ${formatPeriod(`${year}-${month}-01`)}`,
                entityType: 'payroll',
              }}
            />
            {can('payroll.write') && (
              <>
                <Button variant="secondary" onClick={() => navigate('/app/import-payroll')}>
                  <FileText className="size-4" /> Import Payroll
                </Button>
                <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                  <Plus className="size-4" /> Buat Payroll
                </Button>
              </>
            )}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jumlah Payroll" value={formatNumber(rows.length)} description={`${month}/${year}`} icon={WalletCards} />
        <StatCard label="Total Pendapatan" value={formatCurrency(summary.gross)} description="Sebelum potongan" icon={WalletCards} index={1} />
        <StatCard label="Total Potongan" value={formatCurrency(summary.deductions)} description="Kasbon, BPJS, pajak, lainnya" icon={WalletCards} index={2} />
        <StatCard label="Total Bersih" value={formatCurrency(summary.net)} description="Nilai diterima karyawan" icon={CheckCircle2} index={3} />
      </section>

      <Card className="mt-5">
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_.7fr_.7fr_1fr_1fr_1fr_auto]">
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
              <Button variant="secondary" loading={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
                Generate Massal
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={selected.size ? 'primary' : 'neutral'}>{selected.size} dipilih</Badge>
              {can('payroll.finalize') && (
                <>
                  <Button size="sm" disabled={!selected.size} onClick={() => setBulkAction('finalized')}>Bulk Approve</Button>
                  <Button size="sm" variant="success" disabled={!selected.size} onClick={() => setBulkAction('paid')}>Bulk Paid</Button>
                  <Button size="sm" variant="secondary" disabled={!selected.size} onClick={() => setBulkAction('draft')}>Bulk Draft</Button>
                  <Button size="sm" variant="danger" disabled={!selected.size} onClick={() => setBulkAction('delete')}>Bulk Delete</Button>
                </>
              )}
            </div>
            <ColumnVisibilityMenu columns={columns} visible={table.visible} onToggle={table.toggleColumn} onReset={table.reset} />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {payrolls.isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : table.pageRows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="data-table table-fixed">
                <thead>
                  <tr>
                    <th className="w-12">
                      <button type="button" aria-label="Pilih semua" onClick={toggleAll}>
                        {table.pageRows.every(row => selected.has(row.id))
                          ? <CheckSquare2 className="size-5 text-brand-600" />
                          : <Square className="size-5" />}
                      </button>
                    </th>
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
                    <th className="w-80">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map(row => (
                    <tr key={row.id}>
                      <td>
                        <button type="button" aria-label={`Pilih ${row.slip_number}`} onClick={() => toggleOne(row.id)}>
                          {selected.has(row.id) ? <CheckSquare2 className="size-5 text-brand-600" /> : <Square className="size-5 text-slate-400" />}
                        </button>
                      </td>
                      {table.visible.slip && (
                        <td><p className="font-mono text-xs font-bold text-brand-600">{row.slip_number}</p><p className="mt-1 text-xs text-slate-500">{formatPeriod(row.period)}</p></td>
                      )}
                      {table.visible.employee && (
                        <td><p className="font-bold">{row.employee_name}</p><p className="text-xs text-slate-500">{row.nik} · {row.position_name}</p></td>
                      )}
                      {table.visible.earnings && <td>{formatCurrency(row.total_income)}</td>}
                      {table.visible.deductions && <td className="text-rose-600">{formatCurrency(row.total_deduction)}</td>}
                      {table.visible.net && <td className="font-black text-emerald-600">{formatCurrency(row.net_salary)}</td>}
                      {table.visible.status && <td><Badge variant={statusVariant[row.status]}>{PAYROLL_STATUS_LABELS[row.status]}</Badge></td>}
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {can('payroll.write') && (
                            <Button variant="ghost" size="sm" onClick={() => openDuplicate(row)}><Copy className="size-3.5" /> Duplicate Payroll</Button>
                          )}
                          {row.status === 'draft' && can('payroll.write') && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { setEditing(row); setFormOpen(true); }}>Edit</Button>
                              <Button variant="ghost" size="icon" onClick={() => setRecalculateTarget(row)} aria-label="Recalculate Payroll">
                                <Calculator className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => setDeleting(row)} aria-label="Hapus payroll">
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                          {row.status === 'draft' && can('payroll.finalize') && (
                            <Button size="sm" onClick={() => setStatusTarget({ row, status: 'finalized' })}>Finalisasi</Button>
                          )}
                          {row.status === 'finalized' && can('payroll.finalize') && (
                            <Button size="sm" variant="success" onClick={() => setStatusTarget({ row, status: 'paid' })}>Tandai Dibayar</Button>
                          )}
                          {(row.status === 'finalized' || row.status === 'paid') && (
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/app/payslips?slip=${encodeURIComponent(row.slip_number)}`)}>
                              <RefreshCw className="size-3.5" /> Generate Ulang Slip
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
            icon={WalletCards}
            title="Belum ada payroll"
            description={`Belum ada payroll untuk ${formatPeriod(`${year}-${month}-01`)}.`}
            action={can('payroll.write') ? <Button onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>Generate Payroll Massal</Button> : undefined}
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

      <Modal
        open={Boolean(duplicateTarget)}
        onClose={() => setDuplicateTarget(null)}
        title="Duplicate Payroll"
        description={`${duplicateTarget?.slip_number ?? ''} akan disalin sebagai draft pada periode baru.`}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDuplicateTarget(null)}>Batal</Button>
            <Button loading={duplicateMutation.isPending} onClick={() => duplicateMutation.mutate()}>Duplicate Payroll</Button>
          </div>
        }
      >
        <label className="block">
          <span className="field-label">Periode Tujuan</span>
          <Input type="month" value={duplicatePeriod} onChange={event => setDuplicatePeriod(event.target.value)} />
        </label>
      </Modal>

      <ConfirmDialog
        open={Boolean(recalculateTarget)}
        title="Recalculate Payroll?"
        description="Gaji pokok dan tunjangan akan disegarkan dari master karyawan. Bonus, lembur, insentif, THR, dan potongan tetap dipertahankan."
        confirmLabel="Recalculate Payroll"
        variant="primary"
        loading={recalculateMutation.isPending}
        onClose={() => setRecalculateTarget(null)}
        onConfirm={() => recalculateMutation.mutate()}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.status === 'paid' ? 'Tandai payroll telah dibayar?' : 'Finalisasi payroll?'}
        description={statusTarget?.status === 'paid'
          ? `${statusTarget.row.slip_number} akan dicatat telah dibayar.`
          : `${statusTarget?.row.slip_number ?? ''} akan dikunci sebagai snapshot historis.`}
        confirmLabel={statusTarget?.status === 'paid' ? 'Tandai Dibayar' : 'Finalisasi'}
        variant="primary"
        loading={statusMutation.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => statusTarget && statusMutation.mutate(statusTarget)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus draft payroll?"
        description={`${deleting?.slip_number ?? ''} akan dihapus permanen. Hanya draft yang dapat dihapus.`}
        confirmLabel="Hapus Draft"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />

      <ConfirmDialog
        open={Boolean(bulkAction)}
        title={bulkAction === 'delete' ? 'Bulk Delete?' : `Bulk ${bulkAction ?? ''}?`}
        description={`${selected.size} payroll dipilih. Transisi yang tidak sesuai lifecycle akan dilewati dan dilaporkan.`}
        confirmLabel={bulkAction === 'delete' ? 'Bulk Delete' : 'Proses Massal'}
        variant={bulkAction === 'delete' ? 'danger' : 'primary'}
        loading={bulkMutation.isPending}
        onClose={() => setBulkAction(null)}
        onConfirm={() => bulkMutation.mutate()}
      />
    </>
  );
}
