import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCcw,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';
import {
  executeEmployeeImport,
  parseEmployeeWorkbook,
  type ImportExecutionResult,
} from '@/services/import.service';
import type { ImportValidationResult } from '@/types/domain';
import { formatCurrency } from '@/utils/format';

export default function EmployeeImportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportExecutionResult | null>(null);

  const reset = () => {
    setFile(null);
    setValidation(null);
    setResult(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
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
        toast.warning(`${next.errors.length} baris perlu diperbaiki. Baris valid tetap dapat diimport.`);
      } else {
        toast.success(`${next.validRows.length} baris valid dan siap diimport.`);
      }
    } catch (error) {
      setFile(null);
      toast.error(getErrorMessage(error));
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setValidating(false);
    }
  };

  const execute = async () => {
    if (!file || !validation?.validRows.length || !user) return;
    setConfirmOpen(false);
    setImporting(true);
    setProgress(0);
    try {
      const next = await executeEmployeeImport({
        rows: validation.validRows,
        fileName: file.name,
        userId: user.id,
        onProgress: setProgress,
      });
      setResult(next);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Import selesai: ${next.success} berhasil, ${next.failed} gagal.`);
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
        description="Unduh template resmi, isi data, validasi otomatis, periksa preview, lalu import massal ke Supabase."
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
              <p className="mt-1 text-xs text-slate-500">Gunakan template .xlsx yang tersedia.</p>
            </div>
          </CardHeader>
          <CardContent>
            <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-8 text-center transition hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-950/30 dark:hover:border-brand-600">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={importing || validating}
                onChange={event => void selectFile(event.target.files?.[0] ?? null)}
              />
              <div className="rounded-2xl bg-brand-100 p-4 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
                <UploadCloud className="size-8" />
              </div>
              <p className="mt-4 font-bold">{validating ? 'Memvalidasi file...' : file?.name ?? 'Pilih atau jatuhkan file Excel'}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Maksimal 10 MB. Sheet pertama harus memakai kolom template persis.</p>
            </label>

            {validation && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                  <p className="text-xs font-bold text-emerald-600">BARIS VALID</p>
                  <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">{validation.validRows.length}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-950/30">
                  <p className="text-xs font-bold text-rose-600">BARIS ERROR</p>
                  <p className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-300">{validation.errors.length}</p>
                </div>
              </div>
            )}

            {importing && <div className="mt-5"><ProgressBar value={progress} label="Mengimport karyawan" /></div>}

            <div className="mt-5 flex gap-3">
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
              <p className="mt-1 text-xs text-slate-500">Periksa hasil sebelum data dikirim ke database.</p>
            </div>
            {result && <Badge variant={result.failed ? 'warning' : 'success'}>{result.success} berhasil</Badge>}
          </CardHeader>
          {!validation ? (
            <div className="flex min-h-96 flex-col items-center justify-center p-8 text-center">
              <FileSpreadsheet className="size-12 text-slate-300" />
              <p className="mt-4 font-bold text-slate-600 dark:text-slate-300">Belum ada file untuk dipreview</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">File akan diperiksa untuk kolom wajib, format angka, email, dan duplikasi NIK.</p>
            </div>
          ) : (
            <div className="max-h-[650px] overflow-auto">
              {validation.errors.length > 0 && (
                <div className="border-b border-slate-200 bg-rose-50 p-4 dark:border-slate-800 dark:bg-rose-950/20">
                  <div className="mb-3 flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                    <AlertCircle className="size-5" /> Baris yang tidak akan diimport
                  </div>
                  <div className="space-y-2">
                    {validation.errors.slice(0, 20).map(error => (
                      <div key={error.rowNumber} className="rounded-xl bg-white p-3 text-xs dark:bg-slate-900">
                        <span className="font-bold">Baris {error.rowNumber} {error.nik && `· ${error.nik}`}</span>
                        <span className="ml-2 text-rose-600">{error.messages.join(' ')}</span>
                      </div>
                    ))}
                    {validation.errors.length > 20 && <p className="text-xs text-rose-600">+ {validation.errors.length - 20} error lainnya.</p>}
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
                      <td>{row.rowNumber}</td>
                      <td className="font-mono text-xs">{row.nik}</td>
                      <td className="font-bold">{row.name}</td>
                      <td>{row.position}</td>
                      <td>{row.division}</td>
                      <td>{row.department}</td>
                      <td>{row.bankName} · {row.bankAccount}</td>
                      <td>{formatCurrency(row.basicSalary)}</td>
                      <td>{formatCurrency(row.allowance)}</td>
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
        description={`${validation?.validRows.length ?? 0} baris valid akan di-upsert berdasarkan NIK. Data dengan NIK yang sudah ada akan diperbarui; divisi, departemen, dan jabatan baru dibuat otomatis.`}
        confirmLabel="Mulai Import"
        variant="primary"
        loading={importing}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void execute()}
      />
    </>
  );
}
