import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCcw,
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
import {
  executeEmployeeImport,
  parseEmployeeWorkbook,
} from '@/services/import.service';
import type { ImportBatchResult, ImportValidationResult } from '@/types/domain';
import { formatCurrency } from '@/utils/format';

export default function EmployeeImportPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportBatchResult | null>(null);

  const reset = () => {
    setFile(null);
    setValidation(null);
    setResult(null);
    setProgress(0);
  };

  const selectFile = async (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setValidation(null);
    setResult(null);
    setValidating(true);
    try {
      const next = await parseEmployeeWorkbook(selected);
      setValidation(next);
      if (next.errors.length) {
        toast.warning(`${next.errors.length} baris perlu diperbaiki.`);
      } else {
        toast.success(`${next.validRows.length} baris valid dan siap diimport.`);
      }
    } catch (error) {
      setFile(null);
      toast.error(getErrorMessage(error));
    } finally {
      setValidating(false);
    }
  };

  const execute = async () => {
    if (!file || !validation?.validRows.length) return;
    setConfirmOpen(false);
    setImporting(true);
    setProgress(0);
    try {
      const next = await executeEmployeeImport({
        rows: validation.validRows,
        fileName: file.name,
        onProgress: setProgress,
      });
      setResult(next);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['organization'] }),
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
        title="Import Data Karyawan"
        description="Unduh template resmi, validasi otomatis, periksa preview, lalu commit massal secara transaksional."
        actions={
          <a href="/templates/template-import-karyawan.xlsx" download>
            <Button variant="secondary"><Download className="size-4" /> Download Template</Button>
          </a>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-extrabold">Unggah Excel</h2>
              <p className="mt-1 text-xs text-slate-500">Update berdasarkan NIK; data baru otomatis ditambahkan.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <ImportDropzone
              inputId="employee-import-file"
              file={file}
              busy={validating || importing}
              onFile={selected => void selectFile(selected)}
            />
            {validation && (
              <ImportSummaryCards
                valid={validation.validRows.length}
                errors={validation.errors.length}
                skipped={result?.skipped ?? 0}
              />
            )}
            {importing && <ProgressBar value={progress} label="Import Progress" />}
            {result && (
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/25">
                <p className="font-bold text-emerald-700 dark:text-emerald-300">Import selesai</p>
                <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/80">
                  {result.success} berhasil · {result.failed} gagal · {result.skipped} dilewati
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={!validation?.validRows.length || importing}
                loading={importing}
                onClick={() => setConfirmOpen(true)}
              >
                <FileSpreadsheet className="size-4" /> Import {validation?.validRows.length ?? 0} Baris
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
              <p className="mt-1 text-xs text-slate-500">Database akan rollback seluruh transaksi bila validasi server gagal.</p>
            </div>
            {result && <Badge variant={result.failed ? 'warning' : 'success'}>{result.success} berhasil</Badge>}
          </CardHeader>
          {!validation ? (
            <div className="flex min-h-96 flex-col items-center justify-center p-8 text-center">
              <FileSpreadsheet className="size-12 text-slate-300" />
              <p className="mt-4 font-bold text-slate-600 dark:text-slate-300">Belum ada file untuk dipreview</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">File diperiksa untuk kolom wajib, format angka, email, dan duplikasi NIK.</p>
            </div>
          ) : (
            <div className="max-h-[650px] overflow-auto">
              {validation.errors.length > 0 && (
                <div className="border-b border-slate-200 bg-rose-50 p-4 dark:border-slate-800 dark:bg-rose-950/20">
                  <div className="mb-3 flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                    <AlertCircle className="size-5" /> Baris yang tidak akan diimport
                  </div>
                  <div className="space-y-2">
                    {validation.errors.slice(0, 30).map(error => (
                      <div key={error.rowNumber} className="rounded-xl bg-white p-3 text-xs dark:bg-slate-900">
                        <span className="font-bold">Baris {error.rowNumber} {error.nik && `· ${error.nik}`}</span>
                        <span className="ml-2 text-rose-600">{error.messages.join(' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <table className="data-table min-w-[1100px]">
                <thead>
                  <tr>
                    <th>Status</th><th>Baris</th><th>NIK</th><th>Nama</th><th>Jabatan</th>
                    <th>Divisi</th><th>Departemen</th><th>Bank</th><th>Gaji Pokok</th><th>Tunjangan</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.validRows.map(row => (
                    <tr key={row.rowNumber}>
                      <td><CheckCircle2 className="size-5 text-emerald-500" /></td>
                      <td>{row.rowNumber}</td><td className="font-mono text-xs">{row.nik}</td>
                      <td className="font-bold">{row.name}</td><td>{row.position}</td>
                      <td>{row.division}</td><td>{row.department}</td>
                      <td>{row.bankName} · {row.bankAccount}</td>
                      <td>{formatCurrency(row.basicSalary)}</td><td>{formatCurrency(row.allowance)}</td>
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
        title="Mulai import massal?"
        description={`${validation?.validRows.length ?? 0} baris valid akan diproses dalam satu transaksi. NIK lama diperbarui, NIK baru ditambahkan, dan data identik dilewati.`}
        confirmLabel="Mulai Import"
        variant="primary"
        loading={importing}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void execute()}
      />
    </>
  );
}
