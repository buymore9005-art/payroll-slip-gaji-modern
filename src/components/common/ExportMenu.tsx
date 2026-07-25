import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/utils';
import {
  exportTableCsv,
  exportTableExcel,
  exportTablePdf,
  type TabularExportOptions,
} from '@/services/tabularExport.service';

export function ExportMenu({
  options,
  allowPdf = true,
}: {
  options: TabularExportOptions<any>;
  allowPdf?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const run = async (kind: 'excel' | 'csv' | 'pdf') => {
    setBusy(true);
    try {
      if (kind === 'excel') await exportTableExcel(options);
      if (kind === 'csv') await exportTableCsv(options);
      if (kind === 'pdf') await exportTablePdf(options);
      toast.success(`Export ${kind.toUpperCase()} selesai.`);
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={container} className="relative">
      <Button variant="secondary" loading={busy} onClick={() => setOpen(value => !value)}>
        <FileDown className="size-4" /> Export <ChevronDown className="size-3.5" />
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => void run('excel')}>
            <FileSpreadsheet className="size-4 text-emerald-600" /> Export Excel
          </button>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => void run('csv')}>
            <FileText className="size-4 text-sky-600" /> Export CSV
          </button>
          {allowPdf && (
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => void run('pdf')}>
              <FileDown className="size-4 text-rose-600" /> Export PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
