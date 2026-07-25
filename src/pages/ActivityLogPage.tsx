import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CalendarRange,
  MonitorSmartphone,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { listActivityLogs } from '@/services/activity.service';
import { formatDate } from '@/utils/format';

const actions = ['LOGIN', 'LOGOUT', 'TAMBAH', 'EDIT', 'HAPUS', 'IMPORT', 'EXPORT', 'CETAK', 'FINALISASI', 'BAYAR'];

function actionVariant(action: string): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' {
  if (['HAPUS'].includes(action)) return 'danger';
  if (['LOGIN', 'TAMBAH', 'BAYAR'].includes(action)) return 'success';
  if (['EXPORT', 'CETAK', 'IMPORT'].includes(action)) return 'primary';
  if (['EDIT', 'FINALISASI'].includes(action)) return 'warning';
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

  return (
    <>
      <PageHeader
        title="Riwayat Aktivitas"
        description="Jejak audit login, perubahan data, import, export, cetak, finalisasi, dan pembayaran."
      />

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
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
        </CardContent>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {logs.isLoading ? (
          <TableSkeleton rows={9} columns={7} />
        ) : logs.data?.length ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1180px]">
              <thead>
                <tr>
                  <th>Waktu</th><th>User</th><th>Aktivitas</th><th>Entitas</th>
                  <th>Deskripsi</th><th>IP</th><th>Device</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.map(log => (
                  <tr key={log.id}>
                    <td>
                      <p className="font-semibold">{formatDate(log.created_at, 'dd MMM yyyy')}</p>
                      <p className="text-xs text-slate-500">{formatDate(log.created_at, 'HH:mm:ss')}</p>
                    </td>
                    <td>
                      <p className="font-bold text-slate-900 dark:text-white">{log.user_name ?? 'Sistem / Anonim'}</p>
                      <p className="text-xs text-slate-500">{log.user_email ?? '—'}</p>
                    </td>
                    <td><Badge variant={actionVariant(log.action)}>{log.action}</Badge></td>
                    <td>
                      <p className="font-semibold">{log.entity_type}</p>
                      <p className="max-w-40 truncate font-mono text-[10px] text-slate-500">{log.entity_id ?? '—'}</p>
                    </td>
                    <td className="max-w-sm whitespace-normal leading-5">{log.description}</td>
                    <td className="font-mono text-xs">{log.ip_address ?? '—'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <MonitorSmartphone className="size-4 text-slate-400" />
                        <div>
                          <p className="text-xs font-semibold">{log.device ?? '—'}</p>
                          <p className="max-w-48 truncate text-[10px] text-slate-500" title={log.user_agent ?? ''}>{log.user_agent ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Activity}
            title="Aktivitas tidak ditemukan"
            description="Belum ada jejak audit yang sesuai dengan filter."
          />
        )}
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="size-4 text-emerald-500" />
        Maksimal 500 aktivitas terbaru ditampilkan pada satu pencarian.
      </div>
    </>
  );
}
