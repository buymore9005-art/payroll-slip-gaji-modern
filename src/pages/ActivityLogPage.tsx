import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CalendarRange, MonitorSmartphone, Search, ShieldCheck } from 'lucide-react';
import { ExportMenu } from '@/components/common/ExportMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  ColumnVisibilityMenu,
  ResizableSortHeader,
  TablePagination,
} from '@/components/ui/TableTools';
import { useDataTable, type TableColumn } from '@/hooks/useDataTable';
import { useDebounce } from '@/hooks/useDebounce';
import { listActivityLogs } from '@/services/activity.service';
import type { ActivityLogRow } from '@/types/database';
import { formatDate } from '@/utils/format';

const actions = [
  'LOGIN', 'LOGOUT', 'TAMBAH', 'EDIT', 'HAPUS', 'RESTORE', 'IMPORT',
  'EXPORT', 'CETAK', 'GENERATE', 'DUPLICATE', 'RECALCULATE', 'FINALISASI', 'BAYAR',
];

function actionVariant(action: string): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' {
  if (action === 'HAPUS') return 'danger';
  if (['LOGIN', 'TAMBAH', 'BAYAR', 'RESTORE'].includes(action)) return 'success';
  if (['EXPORT', 'CETAK', 'IMPORT', 'GENERATE'].includes(action)) return 'primary';
  if (['EDIT', 'FINALISASI', 'DUPLICATE', 'RECALCULATE'].includes(action)) return 'warning';
  return 'neutral';
}

export default function ActivityLogPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const debouncedSearch = useDebounce(search);

  const logs = useQuery({
    queryKey: ['activity-logs', debouncedSearch, action, from, to],
    queryFn: () => listActivityLogs({ search: debouncedSearch, action, from, to }),
  });
  const rows = logs.data ?? [];

  type ColumnKey = 'time' | 'user' | 'activity' | 'entity' | 'description' | 'ip' | 'device';
  const columns = useMemo<Array<TableColumn<ActivityLogRow, ColumnKey>>>(() => [
    { key: 'time', label: 'Waktu', accessor: row => row.created_at, defaultWidth: 180 },
    { key: 'user', label: 'User', accessor: row => `${row.user_name ?? ''} ${row.user_email ?? ''}`, defaultWidth: 250 },
    { key: 'activity', label: 'Aktivitas', accessor: row => row.action, defaultWidth: 140 },
    { key: 'entity', label: 'Entitas', accessor: row => `${row.entity_type} ${row.entity_id ?? ''}`, defaultWidth: 190 },
    { key: 'description', label: 'Deskripsi', accessor: row => row.description, defaultWidth: 400 },
    { key: 'ip', label: 'IP', accessor: row => row.ip_address, defaultWidth: 150 },
    { key: 'device', label: 'Device', accessor: row => `${row.device ?? ''} ${row.user_agent ?? ''}`, defaultWidth: 280 },
  ], []);
  const table = useDataTable({ tableId: 'activity-log', rows, columns, initialPageSize: 50 });

  return (
    <>
      <PageHeader
        title="Riwayat Aktivitas"
        description="Jejak audit login, logout, create, update, delete, restore, import, export, cetak, dan generate payroll."
        actions={
          <ExportMenu
            options={{
              rows: table.sortedRows,
              columns: [
                { label: 'Waktu', value: row => formatDate(row.created_at, 'dd MMM yyyy HH:mm:ss') },
                { label: 'User', value: row => row.user_name ?? 'Sistem' },
                { label: 'Email', value: row => row.user_email ?? '' },
                { label: 'Aktivitas', value: row => row.action },
                { label: 'Entitas', value: row => row.entity_type },
                { label: 'Entity ID', value: row => row.entity_id ?? '' },
                { label: 'Deskripsi', value: row => row.description },
                { label: 'IP', value: row => row.ip_address ?? '' },
                { label: 'Device', value: row => row.device ?? '' },
                { label: 'User Agent', value: row => row.user_agent ?? '' },
              ],
              fileName: 'audit-log',
              title: 'Audit Log',
              entityType: 'activity',
            }}
          />
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari user atau deskripsi..." />
            </div>
            <Select value={action} onChange={event => setAction(event.target.value)}>
              <option value="">Semua Aktivitas</option>
              {actions.map(value => <option key={value} value={value}>{value}</option>)}
            </Select>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-10" type="date" value={from} onChange={event => setFrom(event.target.value)} title="Tanggal mulai" />
            </div>
            <Input type="date" value={to} onChange={event => setTo(event.target.value)} title="Tanggal akhir" />
          </div>
          <div className="flex justify-end">
            <ColumnVisibilityMenu columns={columns} visible={table.visible} onToggle={table.toggleColumn} onReset={table.reset} />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {logs.isLoading ? (
          <TableSkeleton rows={9} columns={7} />
        ) : table.pageRows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="data-table table-fixed">
                <thead>
                  <tr>
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
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map(log => (
                    <tr key={log.id}>
                      {table.visible.time && <td><p className="font-semibold">{formatDate(log.created_at, 'dd MMM yyyy')}</p><p className="text-xs text-slate-500">{formatDate(log.created_at, 'HH:mm:ss')}</p></td>}
                      {table.visible.user && <td><p className="font-bold">{log.user_name ?? 'Sistem / Anonim'}</p><p className="text-xs text-slate-500">{log.user_email ?? '—'}</p></td>}
                      {table.visible.activity && <td><Badge variant={actionVariant(log.action)}>{log.action}</Badge></td>}
                      {table.visible.entity && <td><p className="font-semibold">{log.entity_type}</p><p className="truncate font-mono text-[10px] text-slate-500">{log.entity_id ?? '—'}</p></td>}
                      {table.visible.description && <td className="whitespace-normal leading-5">{log.description}</td>}
                      {table.visible.ip && <td className="font-mono text-xs">{log.ip_address ?? '—'}</td>}
                      {table.visible.device && <td><div className="flex items-center gap-2"><MonitorSmartphone className="size-4 text-slate-400" /><div className="min-w-0"><p className="text-xs font-semibold">{log.device ?? '—'}</p><p className="truncate text-[10px] text-slate-500">{log.user_agent ?? '—'}</p></div></div></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} totalRows={table.totalRows} onPage={table.setPage} onPageSize={table.setPageSize} />
          </>
        ) : (
          <EmptyState icon={Activity} title="Aktivitas tidak ditemukan" description="Belum ada jejak audit yang sesuai dengan filter." />
        )}
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="size-4 text-emerald-500" /> Maksimal 500 aktivitas terbaru ditampilkan per pencarian.
      </div>
    </>
  );
}
