import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { SortDirection } from '@/hooks/useDataTable';
import { cn } from '@/lib/utils';

export function ColumnVisibilityMenu<Key extends string>({
  columns,
  visible,
  onToggle,
  onReset,
}: {
  columns: ReadonlyArray<{ key: Key; label: string }>;
  visible: Record<Key, boolean>;
  onToggle: (key: Key) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={container} className="relative">
      <Button variant="secondary" onClick={() => setOpen(value => !value)}>
        <Columns3 className="size-4" /> Pilih Kolom
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-72 space-y-1 overflow-auto">
            {columns.map(column => (
              <label key={column.key} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={visible[column.key]}
                  onChange={() => onToggle(column.key)}
                  className="size-4 rounded border-slate-300 text-brand-600"
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={onReset}>
            <RotateCcw className="size-4" /> Reset Tabel
          </Button>
        </div>
      )}
    </div>
  );
}

export function ResizableSortHeader({
  label,
  width,
  sortable = true,
  direction,
  sortIndex,
  onSort,
  onResize,
  className,
}: {
  label: string;
  width: number;
  sortable?: boolean;
  direction?: SortDirection;
  sortIndex?: number;
  onSort?: (multi: boolean) => void;
  onResize: (width: number) => void;
  className?: string;
}) {
  const startResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = width;
    const move = (moveEvent: PointerEvent) => onResize(startWidth + moveEvent.clientX - startX);
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
  };

  return (
    <th className={cn('relative select-none', className)} style={{ width, minWidth: width, maxWidth: width }}>
      <button
        type="button"
        disabled={!sortable}
        onClick={event => onSort?.(event.shiftKey)}
        className={cn('flex w-full items-center gap-1 text-left', sortable && 'cursor-pointer hover:text-brand-600')}
        title={sortable ? 'Klik untuk sort; Shift+klik untuk multi-sort' : undefined}
      >
        <span className="truncate">{label}</span>
        {sortable && (
          direction === 'asc'
            ? <ArrowUp className="size-3.5 shrink-0" />
            : direction === 'desc'
              ? <ArrowDown className="size-3.5 shrink-0" />
              : <ArrowUpDown className="size-3.5 shrink-0 opacity-50" />
        )}
        {sortIndex !== undefined && <span className="text-[9px] text-brand-500">{sortIndex + 1}</span>}
      </button>
      <span
        role="separator"
        aria-orientation="vertical"
        onPointerDown={startResize}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none rounded bg-transparent hover:bg-brand-400"
      />
    </th>
  );
}

export function TablePagination({
  page,
  pageCount,
  pageSize,
  totalRows,
  onPage,
  onPageSize,
  extra,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  totalRows: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{totalRows} data</span>
        <label className="flex items-center gap-2">
          <span>Baris per halaman</span>
          <Select className="h-9 w-20" value={pageSize} onChange={event => onPageSize(Number(event.target.value))}>
            {[10, 20, 50, 100].map(value => <option key={value} value={value}>{value}</option>)}
          </Select>
        </label>
        {extra}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" /> Sebelumnya
        </Button>
        <span className="min-w-24 text-center text-xs font-bold">Halaman {page} dari {pageCount}</span>
        <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          Berikutnya <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
