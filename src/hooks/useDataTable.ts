import { useCallback, useEffect, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';
export type SortRule<Key extends string = string> = { key: Key; direction: SortDirection };

export type TableColumn<Row, Key extends string = string> = {
  key: Key;
  label: string;
  accessor: (row: Row) => unknown;
  defaultVisible?: boolean;
  defaultWidth?: number;
  sortable?: boolean;
};

type PersistedTableState<Key extends string> = {
  visible?: Partial<Record<Key, boolean>>;
  widths?: Partial<Record<Key, number>>;
  pageSize?: number;
};

function compareValues(left: unknown, right: unknown) {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  const leftDate = typeof left === 'string' ? Date.parse(left) : Number.NaN;
  const rightDate = typeof right === 'string' ? Date.parse(right) : Number.NaN;
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate) && /^\d{4}-/.test(String(left))) {
    return leftDate - rightDate;
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}

export function sortRows<Row, Key extends string>(
  rows: readonly Row[],
  columns: readonly TableColumn<Row, Key>[],
  sort: readonly SortRule<Key>[],
) {
  if (!sort.length) return [...rows];
  const columnMap = new Map(columns.map(column => [column.key, column]));
  return [...rows].sort((left, right) => {
    for (const rule of sort) {
      const column = columnMap.get(rule.key);
      if (!column) continue;
      const result = compareValues(column.accessor(left), column.accessor(right));
      if (result !== 0) return rule.direction === 'asc' ? result : -result;
    }
    return 0;
  });
}

function readState<Key extends string>(storageKey: string): PersistedTableState<Key> {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as PersistedTableState<Key>;
  } catch {
    return {};
  }
}

export function useDataTable<Row, Key extends string>(input: {
  tableId: string;
  rows: readonly Row[];
  columns: readonly TableColumn<Row, Key>[];
  initialPageSize?: number;
}) {
  const storageKey = `payroll-table:${input.tableId}`;
  const initial = useMemo(() => readState<Key>(storageKey), [storageKey]);
  const [visible, setVisible] = useState<Record<Key, boolean>>(() => Object.fromEntries(
    input.columns.map(column => [column.key, initial.visible?.[column.key] ?? column.defaultVisible ?? true]),
  ) as Record<Key, boolean>);
  const [widths, setWidths] = useState<Record<Key, number>>(() => Object.fromEntries(
    input.columns.map(column => [column.key, initial.widths?.[column.key] ?? column.defaultWidth ?? 160]),
  ) as Record<Key, number>);
  const [sort, setSort] = useState<SortRule<Key>[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initial.pageSize ?? input.initialPageSize ?? 20);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ visible, widths, pageSize }));
  }, [pageSize, storageKey, visible, widths]);

  const sortedRows = useMemo(
    () => sortRows(input.rows, input.columns, sort),
    [input.columns, input.rows, sort],
  );
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [pageSize, safePage, sortedRows],
  );
  const visibleColumns = useMemo(
    () => input.columns.filter(column => visible[column.key]),
    [input.columns, visible],
  );

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const toggleColumn = useCallback((key: Key) => {
    setVisible(current => ({ ...current, [key]: !current[key] }));
  }, []);

  const toggleSort = useCallback((key: Key, multi = false) => {
    setSort(current => {
      const existing = current.find(rule => rule.key === key);
      const nextRule: SortRule<Key> | null = !existing
        ? { key, direction: 'asc' }
        : existing.direction === 'asc'
          ? { key, direction: 'desc' }
          : null;
      if (!multi) return nextRule ? [nextRule] : [];
      const without = current.filter(rule => rule.key !== key);
      return nextRule ? [...without, nextRule] : without;
    });
    setPage(1);
  }, []);

  const resizeColumn = useCallback((key: Key, width: number) => {
    setWidths(current => ({ ...current, [key]: Math.max(80, Math.min(640, Math.round(width))) }));
  }, []);

  const reset = useCallback(() => {
    setVisible(Object.fromEntries(input.columns.map(column => [column.key, column.defaultVisible ?? true])) as Record<Key, boolean>);
    setWidths(Object.fromEntries(input.columns.map(column => [column.key, column.defaultWidth ?? 160])) as Record<Key, number>);
    setSort([]);
    setPage(1);
    setPageSize(input.initialPageSize ?? 20);
    localStorage.removeItem(storageKey);
  }, [input.columns, input.initialPageSize, storageKey]);

  return {
    visible,
    widths,
    sort,
    page: safePage,
    pageSize,
    pageCount,
    totalRows: sortedRows.length,
    pageRows,
    sortedRows,
    visibleColumns,
    setPage,
    setPageSize: (value: number) => { setPageSize(value); setPage(1); },
    toggleColumn,
    toggleSort,
    resizeColumn,
    reset,
  };
}
