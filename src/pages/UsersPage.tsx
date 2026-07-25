import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/common/Avatar';
import { ExportMenu } from '@/components/common/ExportMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  ColumnVisibilityMenu,
  ResizableSortHeader,
  TablePagination,
} from '@/components/ui/TableTools';
import { useAuth } from '@/hooks/useAuth';
import { useDataTable, type TableColumn } from '@/hooks/useDataTable';
import { useDebounce } from '@/hooks/useDebounce';
import { ROLE_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/utils';
import { listUsers, updateUserAccess } from '@/services/user.service';
import type { AppRole, ProfileRow } from '@/types/database';
import { formatDate } from '@/utils/format';

export default function UsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [role, setRole] = useState<AppRole>('admin_payroll');
  const [active, setActive] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search);

  const users = useQuery({ queryKey: ['users'], queryFn: listUsers });

  useEffect(() => {
    if (!editing) return;
    setRole(editing.role);
    setActive(editing.is_active);
  }, [editing]);

  const rows = useMemo(() => (users.data ?? []).filter(profile => {
    const matchesSearch = !debouncedSearch || `${profile.full_name} ${profile.email}`.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesRole = !roleFilter || profile.role === roleFilter;
    const matchesStatus = !statusFilter || String(profile.is_active) === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  }), [debouncedSearch, roleFilter, statusFilter, users.data]);

  type ColumnKey = 'user' | 'role' | 'status' | 'lastLogin' | 'created';
  const columns = useMemo<Array<TableColumn<ProfileRow, ColumnKey>>>(() => [
    { key: 'user', label: 'Pengguna', accessor: row => `${row.full_name} ${row.email}`, defaultWidth: 310 },
    { key: 'role', label: 'Role', accessor: row => row.role, defaultWidth: 170 },
    { key: 'status', label: 'Status', accessor: row => row.is_active, defaultWidth: 130 },
    { key: 'lastLogin', label: 'Login Terakhir', accessor: row => row.last_login_at, defaultWidth: 210 },
    { key: 'created', label: 'Dibuat', accessor: row => row.created_at, defaultWidth: 170 },
  ], []);
  const table = useDataTable({ tableId: 'users', rows, columns, initialPageSize: 20 });

  const mutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('Pengguna tidak dipilih.');
      if (editing.id === user?.id && !active) throw new Error('Anda tidak dapat menonaktifkan akun sendiri.');
      if (editing.id === user?.id && role !== editing.role) {
        throw new Error('Role akun sendiri harus diubah oleh Super Admin lain.');
      }
      return updateUserAccess(editing.id, role, active);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Hak akses pengguna berhasil diperbarui.');
      setEditing(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  return (
    <>
      <PageHeader
        title="Pengguna & Role"
        description="Atur peran dan status akses setiap akun dengan filter, sorting, column visibility, dan export."
        actions={
          <ExportMenu
            options={{
              rows: table.sortedRows,
              columns: [
                { label: 'Nama', value: row => row.full_name },
                { label: 'Email', value: row => row.email },
                { label: 'Role', value: row => ROLE_LABELS[row.role] },
                { label: 'Status', value: row => row.is_active ? 'Aktif' : 'Nonaktif' },
                { label: 'Login Terakhir', value: row => row.last_login_at ?? '' },
                { label: 'Dibuat', value: row => row.created_at },
              ],
              fileName: 'pengguna-dan-role',
              title: 'Pengguna & Role',
              entityType: 'users',
            }}
          />
        }
      />

      <section className="mb-5 grid gap-4 lg:grid-cols-3">
        {([
          ['Super Admin', 'Akses penuh termasuk user, pengaturan, dan seluruh operasi.', 'super_admin'],
          ['HRD', 'Kelola karyawan, organisasi, import, kehadiran, dan baca payroll.', 'hrd'],
          ['Admin Payroll', 'Kelola payroll, finalisasi, pembayaran, dan export massal.', 'admin_payroll'],
        ] as const).map(([title, description, value]) => (
          <Card key={value}>
            <CardContent className="flex gap-4">
              <div className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
                <ShieldCheck className="size-5" />
              </div>
              <div><h2 className="font-extrabold">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mb-5">
        <CardContent className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama atau email..." />
            </div>
            <Select value={roleFilter} onChange={event => setRoleFilter(event.target.value)}>
              <option value="">Semua Role</option>
              <option value="super_admin">Super Admin</option>
              <option value="hrd">HRD</option>
              <option value="admin_payroll">Admin Payroll</option>
            </Select>
            <Select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </Select>
          </div>
          <ColumnVisibilityMenu columns={columns} visible={table.visible} onToggle={table.toggleColumn} onReset={table.reset} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {users.isLoading ? (
          <TableSkeleton rows={7} columns={6} />
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
                    <th className="w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map(profile => (
                    <tr key={profile.id}>
                      {table.visible.user && <td><div className="flex items-center gap-3"><Avatar path={profile.avatar_path} name={profile.full_name} /><div><p className="font-bold">{profile.full_name} {profile.id === user?.id && <span className="text-xs text-brand-600">(Anda)</span>}</p><p className="text-xs text-slate-500">{profile.email}</p></div></div></td>}
                      {table.visible.role && <td><Badge variant={profile.role === 'super_admin' ? 'primary' : 'neutral'}>{ROLE_LABELS[profile.role]}</Badge></td>}
                      {table.visible.status && <td><Badge variant={profile.is_active ? 'success' : 'danger'}>{profile.is_active ? 'Aktif' : 'Nonaktif'}</Badge></td>}
                      {table.visible.lastLogin && <td>{profile.last_login_at ? formatDate(profile.last_login_at, 'dd MMM yyyy HH:mm') : 'Belum pernah'}</td>}
                      {table.visible.created && <td>{formatDate(profile.created_at)}</td>}
                      <td><Button variant="ghost" size="sm" onClick={() => setEditing(profile)}><Edit3 className="size-4" /> Atur</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} totalRows={table.totalRows} onPage={table.setPage} onPageSize={table.setPageSize} />
          </>
        ) : (
          <EmptyState icon={Users} title="Belum ada pengguna" description="Akun baru muncul setelah registrasi berhasil." />
        )}
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Atur Akses ${editing?.full_name ?? ''}`}
        description="Perubahan langsung ditegakkan oleh Row Level Security."
        size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setEditing(null)} disabled={mutation.isPending}>Batal</Button><Button onClick={() => mutation.mutate()} loading={mutation.isPending}>Simpan Akses</Button></div>}
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60"><p className="font-bold">{editing?.full_name}</p><p className="text-xs text-slate-500">{editing?.email}</p></div>
          <label className="block">
            <span className="field-label">Role</span>
            <Select value={role} onChange={event => setRole(event.target.value as AppRole)} disabled={editing?.id === user?.id}>
              <option value="super_admin">Super Admin</option><option value="hrd">HRD</option><option value="admin_payroll">Admin Payroll</option>
            </Select>
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div><p className="font-bold">Akun Aktif</p><p className="mt-1 text-xs text-slate-500">Akun nonaktif tidak dapat membuka area aplikasi.</p></div>
            <input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} className="size-5 rounded border-slate-300 text-brand-600" />
          </label>
          <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <UserCog className="size-5 shrink-0" /> Database mencegah perubahan akses Super Admin terakhir dan perubahan role akun sendiri.
          </div>
        </div>
      </Modal>
    </>
  );
}
