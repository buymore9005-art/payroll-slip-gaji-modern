import { FileSpreadsheet, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ImportDropzone({
  file,
  busy,
  inputId,
  onFile,
  className,
}: {
  file: File | null;
  busy: boolean;
  inputId: string;
  onFile: (file: File | null) => void;
  className?: string;
}) {
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-8 text-center transition hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-950/30 dark:hover:border-brand-600',
        busy && 'pointer-events-none opacity-70',
        className,
      )}
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        event.preventDefault();
        onFile(event.dataTransfer.files?.[0] ?? null);
      }}
    >
      <input
        id={inputId}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        disabled={busy}
        onChange={event => onFile(event.target.files?.[0] ?? null)}
      />
      <div className="rounded-2xl bg-brand-100 p-4 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
        {file ? <FileSpreadsheet className="size-8" /> : <UploadCloud className="size-8" />}
      </div>
      <p className="mt-4 max-w-full truncate font-bold">
        {busy ? 'Memvalidasi file...' : file?.name ?? 'Pilih atau jatuhkan file Excel'}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Format .xlsx atau .xls, maksimal 10 MB.
      </p>
    </label>
  );
}
