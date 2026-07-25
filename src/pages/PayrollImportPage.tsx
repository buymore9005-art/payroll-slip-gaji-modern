import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImportDropzone } from '@/components/import/ImportDropzone';
import { ImportSummaryCards } from '@/components/import/ImportSummaryCards';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getErrorMessage } from '@/lib/utils';
import { executePayrollImport, parsePayrollWorkbook } from '@/services/import.service';
import type { ImportBatchResult, ImportPreview, PayrollImportRow } from '@/types/domain';
import { formatCurrency, formatPeriod } from '@/utils/format';

export default function PayrollImportPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview<PayrollImportRow> | null>(null);
  const [validating, setValidating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportBatchResult | null>(null);

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setProgress(0);
  };

  const selectFile = async (selected: File | null) => {
    if (!selected) return;
    setFile(selected); setPreview(null); setResult(null); setValidating(true);
    try {
      const next = await parsePayrollWorkbook(selected);
      setPreview(next);
      if (next.errors.length || next.skippedRows.length) {
        toast.warning(`${next.errors.length} error dan ${next.skippedRows.length} baris dilewati.`);
      } else {
        toast.success(`${next.validRows.length} baris payroll siap diimport.`);
      }
    } catch (error) {
      setFile(null);
      toast.error(getErrorMessage(error));
    } finally {
      setValidating(false);
    }
  };

  const execute = async () => {
    if (!file || !preview?.validRows.length) return;
    setConfirmOpen(false); setImporting(true); setProgress(0);
    try {
      const next = await executePayrollImport({
        rows: preview.validRows,
        fileName: file.name,
        onProgress: setProgress,
      });
      setResult(next);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payrolls'] }),
        queryClient.invalidateQueries({ queryKey: ['payslips'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      toast.success(`${next.success} berhasil, ${next.failed} gagal, ${next.skipped} dilewati`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Import Payroll"
        description="Import payroll massal dengan validasi total bersih, preview, detail error, progress, dan rollback otomatis."
        actions={
          <a href="/templates/template-import-payroll.xlsx" download>
            <Button variant="secondary"><Download className="size-4" /> Download Template Payroll</Button>
          </a>
        }
      />

      <div className="mb-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-200">
        <ShieldCheck className="size-5 shrink-0" />
        <p>Import database bersifat all-or-nothing. Jika satu baris ditolak pada validasi server, seluruh batch dibatalkan tanpa data parsial.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[.68fr_1.32fr]">
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-extrabold">Unggah Excel Payroll</h2>
              <p className="mt-1 text-xs text-slate-500">Employee ID atau NIK dapat digunakan sebagai referensi.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <ImportDropzone
              inputId="payroll-import-file"
              file={file}
              busy={validating || importing}
              onFile={selected => void selectFile(selected)}
            />
            {preview && (
              <ImportSummaryCards
                valid={preview.validRows.length}
                errors={preview.errors.length}
                skipped={preview.skippedRows.length + (result?.skipped ?? 0)}
              />
            )}
            {importing && <ProgressBar value={progress} label="Import Progress" />}
            {result && (
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/25">
                <p className="font-bold text-emerald-700 dark:text-emerald-300">Import payroll selesai</p>
                <p className="mt-1 text-sm">{result.success} berhasil · {result.failed} gagal · {result.skipped} dilewati</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={!preview?.validRows.length || importing}
                loading={importing}
                onClick={() => setConfirmOpen(true)}
              >
                <FileSpreadsheet className="size-4" /> Import {preview?.validRows.length ?? 0} Payroll
              </Button>
              {(file || result) && (
                <Button variant="secondary" size="icon" onClick={reset} disabled={importing} aria-label="Reset import">
                  <RefreshCcw className="size-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <h2 className="font-extrabold">Preview & Validasi</h2>
              <p className="mt-1 text-xs text-slate-500">Payroll final/dibayar yang sudah tersedia tidak akan ditimpa.</p>
            </div>
            {result && <Badge variant={result.failed ? 'warning' : 'success'}>{result.success} berhasil</Badge>}
          </CardHeader>
          {!preview ? (
            <div className="flex min-h-96 flex-col items-center justify-center p-8 text-center">
              <FileSpreadsheet className="size-12 text-slate-300" />
              <p className="mt-4 font-bold">Belum ada file untuk dipreview</p>
              <p className="mt-2 max-w-md text-sm text-slate-500">Template memvalidasi kolom, periode, status, nilai non-negatif, dan total bersih.</p>
            </div>
          ) : (
            <div className="max-h-[680px] overflow-auto">
              {(preview.errors.length > 0 || preview.skippedRows.length > 0) && (
                <div className="border-b border-slate-200 bg-rose-50 p-4 dark:border-slate-800 dark:bg-rose-950/20">
                  <div className="mb-3 flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                    <AlertCircle className="size-5" /> Error Detail
                  </div>
                  <div className="max-h-44 space-y-2 overflow-auto">
                    {preview.errors.map(error => (
                      <p key={`error-${error.rowNumber}`} className="text-xs">
                        Baris {error.rowNumber} · {error.key || '—'}: {error.messages.join(' ')}
                      </p>
                    ))}
                    {preview.skippedRows.map(row => (
                      <p key={`skip-${row.rowNumber}`} className="text-xs text-amber-700">
                        Baris {row.rowNumber} · {row.key || '—'}: {row.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <table className="data-table min-w-[1500px]">
                <thead>
                  <tr>
                    <th>Status</th><th>Baris</th><th>Employee ID / NIK</th><th>Nama</th><th>Periode</th>
                    <th>Gaji Pokok</th><th>Tunjangan</th><th>Bonus</th><th>Lembur</th><th>Insentif</th>
                    <th>Potongan</th><th>BPJS</th><th>Pajak</th><th>THR</th><th>Total Bersih</th><th>Status Payroll</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.validRows.map(row => (
                    <tr key={row.rowNumber}>
                      <td><CheckCircle2 className="size-5 text-emerald-500" /></td>
                      <td>{row.rowNumber}</td><td className="font-mono text-xs">{row.employeeId || row.nik}</td>
                      <td className="font-bold">{row.name}</td><td>{formatPeriod(row.period)}</td>
                      <td>{formatCurrency(row.basicSalary)}</td><td>{formatCurrency(row.allowance)}</td>
                      <td>{formatCurrency(row.bonus)}</td><td>{formatCurrency(row.overtime)}</td>
                      <td>{formatCurrency(row.incentive)}</td><td>{formatCurrency(row.deduction)}</td>
                      <td>{formatCurrency(row.bpjs)}</td><td>{formatCurrency(row.tax)}</td>
                      <td>{formatCurrency(row.thr)}</td><td className="font-black text-emerald-600">{formatCurrency(row.netSalary)}</td>
                      <td><Badge variant={row.status === 'paid' ? 'success' : row.status === 'finalized' ? 'primary' : 'neutral'}>{row.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Mulai import payroll massal?"
        description={`${preview?.validRows.length ?? 0} baris akan diproses dalam satu transaksi. Draft lama dapat diperbarui; payroll final atau dibayar akan dilewati.`}
        confirmLabel="Mulai Import"
        variant="primary"
        loading={importing}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void execute()}
      />
    </>
  );
}
