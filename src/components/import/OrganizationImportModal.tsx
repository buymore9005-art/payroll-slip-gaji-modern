import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Download, FileSpreadsheet, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ImportDropzone } from '@/components/import/ImportDropzone';
import { ImportSummaryCards } from '@/components/import/ImportSummaryCards';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getErrorMessage } from '@/lib/utils';
import {
  executeOrganizationImport,
  parseOrganizationWorkbook,
} from '@/services/import.service';
import type {
  ImportPreview,
  OrganizationImportEntity,
  OrganizationImportRow,
} from '@/types/domain';

const labels: Record<OrganizationImportEntity, string> = {
  divisions: 'Divisi',
  departments: 'Departemen',
  positions: 'Jabatan',
};
const templates: Record<OrganizationImportEntity, string> = {
  divisions: '/templates/template-import-divisions.xlsx',
  departments: '/templates/template-import-departments.xlsx',
  positions: '/templates/template-import-positions.xlsx',
};

export function OrganizationImportModal({
  open,
  entity,
  onClose,
}: {
  open: boolean;
  entity: OrganizationImportEntity;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview<OrganizationImportRow> | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
  };

  const choose = async (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setPreview(null);
    setValidating(true);
    try {
      setPreview(await parseOrganizationWorkbook(selected, entity));
      toast.success('File berhasil divalidasi.');
    } catch (error) {
      setFile(null);
      toast.error(getErrorMessage(error));
    } finally {
      setValidating(false);
    }
  };

  const run = async () => {
    if (!file || !preview?.validRows.length) return;
    setImporting(true);
    setProgress(0);
    try {
      const result = await executeOrganizationImport({
        entity,
        rows: preview.validRows,
        fileName: file.name,
        onProgress: setProgress,
      });
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${result.success} berhasil, ${result.failed} gagal, ${result.skipped} dilewati`);
      reset();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!importing) { reset(); onClose(); } }}
      title={`Import ${labels[entity]}`}
      description="Preview dilakukan di browser; commit database berjalan dalam satu transaksi."
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <a href={templates[entity]} download>
            <Button variant="secondary" type="button">
              <Download className="size-4" /> Download Template
            </Button>
          </a>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={reset} disabled={importing || !file}>
              <RefreshCcw className="size-4" /> Reset import
            </Button>
            <Button
              onClick={() => void run()}
              disabled={!preview?.validRows.length}
              loading={importing}
            >
              <FileSpreadsheet className="size-4" /> Mulai Import
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <ImportDropzone
          inputId={`organization-import-${entity}`}
          file={file}
          busy={validating || importing}
          onFile={selected => void choose(selected)}
        />
        {preview && (
          <>
            <ImportSummaryCards
              valid={preview.validRows.length}
              errors={preview.errors.length}
              skipped={preview.skippedRows.length}
            />
            {preview.errors.length > 0 && (
              <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-950/20">
                <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                  <AlertCircle className="size-5" /> Baris yang tidak akan diimport
                </div>
                <div className="mt-3 max-h-40 space-y-2 overflow-auto">
                  {preview.errors.map(error => (
                    <p key={error.rowNumber} className="text-xs">
                      Baris {error.rowNumber} · {error.key || '—'}: {error.messages.join(' ')}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div className="max-h-72 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="data-table min-w-[720px]">
                <thead><tr><th>Baris</th><th>Divisi</th><th>Departemen</th><th>Nama</th><th>Deskripsi</th></tr></thead>
                <tbody>
                  {preview.validRows.map(row => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td><td>{row.division || '—'}</td><td>{row.department || '—'}</td>
                      <td className="font-bold">{row.name}</td><td>{row.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {importing && <ProgressBar value={progress} label="Import Progress" />}
      </div>
    </Modal>
  );
}
