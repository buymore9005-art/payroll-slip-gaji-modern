import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare2,
  Download,
  Eye,
  FileArchive,
  FileDown,
  FileSpreadsheet,
  Printer,
  ReceiptText,
  Search,
  Square,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PayslipPreview } from '@/components/payroll/PayslipPreview';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Select } from '@/components/ui/Select';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { PAYROLL_STATUS_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/utils';
import {
  exportPayrollCsv,
  exportPayrollExcel,
  exportPayslipPdf,
  exportPayslipsZip,
  printPayslip,
} from '@/services/export.service';
import { getOrganization } from '@/services/lookup.service';
import { listPayrolls } from '@/services/payroll.service';
import { getCompanySettings } from '@/services/settings.service';
import type { PayrollDetailRow } from '@/types/database';
import { formatCurrency, formatPeriod } from '@/utils/format';

export default function PayslipsPage() {
  const now = new Date();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('slip') ?? '');
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [status, setStatus] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<PayrollDetailRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const debouncedSearch = useDebounce(search);

  const organization = useQuery({ queryKey: ['organization'], queryFn: getOrganization });
  const settings = useQuery({ queryKey: ['company-settings'], queryFn: getCompanySettings });
  const { data: logoUrl } = useSignedUrl(settings.data?.logo_path);
  const payrolls = useQuery({
    queryKey: ['payslips', debouncedSearch, month, year, status, divisionId, positionId],
    queryFn: () => listPayrolls({
      search: debouncedSearch,
      month,
      year,
      divisionId,
      positionId,
      status: status || undefined,
    }),
  });

  const rows = useMemo(
    () => (payrolls.data ?? []).filter(row => row.status === 'finalized' || row.status === 'paid'),
    [payrolls.data],
  );
  const selectedRows = useMemo(() => rows.filter(row => selected.has(row.id)), [rows, selected]);

  useEffect(() => {
    const slip = searchParams.get('slip');
    if (!slip || !rows.length) return;
    const match = rows.find(row => row.slip_number === slip);
    if (match) {
      setPreview(match);
      setSearchParams({}, { replace: true });
    }
  }, [rows, searchParams, setSearchParams]);

  useEffect(() => {
    setSelected(current => new Set([...current].filter(id => rows.some(row => row.id === id))));
  }, [rows]);

  const toggleAll = () => {
    setSelected(current => current.size === rows.length && rows.length
      ? new Set()
      : new Set(rows.map(row => row.id)));
  };

  const toggleOne = (id: string) => {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runSingle = async (row: PayrollDetailRow, action: 'pdf' | 'print') => {
    try {
      if (action === 'pdf') await exportPayslipPdf(row, { logoUrl, baseUrl: location.origin });
      else await printPayslip(row, { logoUrl, baseUrl: location.origin });
      toast.success(action === 'pdf' ? 'PDF berhasil dibuat.' : 'Jendela cetak dibuka.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const runBulk = async (targetRows: PayrollDetailRow[]) => {
    try {
      if (!targetRows.length) throw new Error('Pilih setidaknya satu slip.');
      setExporting(true);
      setProgress(0);
      await exportPayslipsZip(targetRows, {
        logoUrl,
        baseUrl: location.origin,
        onProgress: setProgress,
      });
      toast.success(`${targetRows.length} slip berhasil dikemas ke ZIP.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  const runDataExport = async (kind: 'xlsx' | 'csv') => {
    try {
      if (!rows.length) throw new Error('Tidak ada slip untuk diekspor.');
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
        title="Slip Gaji"
        description="Preview slip final, verifikasi QR, cetak, ekspor PDF, serta kemas beberapa atau seluruh slip ke ZIP."
        actions={
          <>
            <Button variant="secondary" onClick={() => void runDataExport('xlsx')}>
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button variant="secondary" onClick={() => void runDataExport('csv')}>
              <FileDown className="size-4" /> CSV
            </Button>
            {can('payslip.export.bulk') && (
              <>
                <Button
                  variant="secondary"
                  disabled={!selectedRows.length || exporting}
                  onClick={() => void runBulk(selectedRows)}
                >
                  <FileArchive className="size-4" /> ZIP Terpilih ({selectedRows.length})
                </Button>
                <Button disabled={!rows.length || exporting} onClick={() => void runBulk(rows)}>
                  <Download className="size-4" /> Export Semua
                </Button>
              </>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_.7fr_.7fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nama, NIK, atau nomor slip..." />
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
            <option value="">Final & Dibayar</option>
            <option value="finalized">Final</option>
            <option value="paid">Dibayar</option>
          </Select>
        </CardContent>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {payrolls.isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1120px]">
              <thead>
                <tr>
                  {can('payslip.export.bulk') && (
                    <th className="w-12">
                      <button type="button" aria-label="Pilih semua" onClick={toggleAll}>
                        {selected.size === rows.length && rows.length ? <CheckSquare2 className="size-5 text-brand-600" /> : <Square className="size-5" />}
                      </button>
                    </th>
                  )}
                  <th>Nomor Slip</th><th>Karyawan</th><th>Periode</th><th>Total Diterima</th><th>Status</th><th className="w-56">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    {can('payslip.export.bulk') && (
                      <td>
                        <button type="button" aria-label={`Pilih ${row.slip_number}`} onClick={() => toggleOne(row.id)}>
                          {selected.has(row.id) ? <CheckSquare2 className="size-5 text-brand-600" /> : <Square className="size-5 text-slate-400" />}
                        </button>
                      </td>
                    )}
                    <td className="font-mono text-xs font-bold text-brand-600">{row.slip_number}</td>
                    <td>
                      <p className="font-bold text-slate-900 dark:text-white">{row.employee_name}</p>
                      <p className="text-xs text-slate-500">{row.nik} · {row.position_name}</p>
                    </td>
                    <td>{formatPeriod(row.period)}</td>
                    <td className="font-black text-emerald-600">{formatCurrency(row.net_salary)}</td>
                    <td><Badge variant={row.status === 'paid' ? 'success' : 'primary'}>{PAYROLL_STATUS_LABELS[row.status]}</Badge></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setPreview(row)}><Eye className="size-3.5" /> Preview</Button>
                        <Button variant="ghost" size="icon" onClick={() => void runSingle(row, 'pdf')} aria-label="Download PDF">
                          <Download className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void runSingle(row, 'print')} aria-label="Cetak slip">
                          <Printer className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title="Slip gaji tidak ditemukan"
            description="Slip hanya tersedia setelah payroll difinalisasi. Ubah filter atau finalisasi payroll terlebih dahulu."
          />
        )}
      </Card>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview ? `Preview ${preview.slip_number}` : 'Preview Slip'}
        description="Tampilan ini mengikuti isi PDF yang akan diekspor."
        size="xl"
        footer={preview ? (
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => void runSingle(preview, 'print')}><Printer className="size-4" /> Cetak</Button>
            <Button onClick={() => void runSingle(preview, 'pdf')}><Download className="size-4" /> Download PDF</Button>
          </div>
        ) : undefined}
      >
        {preview && <PayslipPreview row={preview} logoUrl={logoUrl} />}
      </Modal>

      <Modal open={exporting} onClose={() => undefined} title="Menyiapkan Export Massal" description="PDF dibuat satu per satu lalu dikemas otomatis ke dalam ZIP." size="sm">
        <div className="py-6">
          <ProgressBar value={progress} label="Progres Export" />
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            Jangan menutup tab hingga unduhan dimulai.
          </p>
        </div>
      </Modal>
    </>
  );
}
