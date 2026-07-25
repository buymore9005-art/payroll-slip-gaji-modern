import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building,
  Building2,
  Edit3,
  FileSpreadsheet,
  Network,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ExportMenu } from '@/components/common/ExportMenu';
import { FormField } from '@/components/common/FormField';
import { PageHeader } from '@/components/common/PageHeader';
import { OrganizationImportModal } from '@/components/import/OrganizationImportModal';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  ColumnVisibilityMenu,
  ResizableSortHeader,
  TablePagination,
} from '@/components/ui/TableTools';
import { Textarea } from '@/components/ui/Textarea';
import { useDataTable, type TableColumn } from '@/hooks/useDataTable';
import { getErrorMessage } from '@/lib/utils';
import {
  deleteLookup,
  getOrganization,
  saveDepartment,
  saveDivision,
  savePosition,
} from '@/services/lookup.service';
import type {
  DepartmentRow,
  DivisionRow,
  PositionRow,
} from '@/types/database';
import type { OrganizationImportEntity } from '@/types/domain';
import { formatDate } from '@/utils/format';

type Tab = OrganizationImportEntity;
type Editable = DivisionRow | DepartmentRow | PositionRow;
type DeleteTarget = { tab: Tab; id: string; name: string };

const tabs: Array<{ id: Tab; label: string; icon: typeof Building2 }> = [
  { id: 'divisions', label: 'Divisi', icon: Building2 },
  { id: 'departments', label: 'Departemen', icon: Building },
  { id: 'positions', label: 'Jabatan', icon: Network },
];

export default function OrganizationPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('divisions');
  const [editing, setEditing] = useState<Editable | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const organization = useQuery({ queryKey: ['organization'], queryFn: getOrganization });

  const openForm = (item?: Editable) => {
    setEditing(item ?? null);
    setName(item?.name ?? '');
    setDescription(item?.description ?? '');
    setDivisionId(item && 'division_id' in item ? item.division_id : '');
    setDepartmentId(item && 'department_id' in item ? item.department_id ?? '' : '');
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Nama wajib diisi.');
      if (tab === 'divisions') {
        await saveDivision({ id: editing?.id, name, description });
      } else if (tab === 'departments') {
        if (!divisionId) throw new Error('Divisi wajib dipilih.');
        await saveDepartment({ id: editing?.id, division_id: divisionId, name, description });
      } else {
        await savePosition({ id: editing?.id, department_id: departmentId || null, name, description });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success(`${editing ? 'Perubahan' : 'Data baru'} berhasil disimpan.`);
      setDialogOpen(false);
      setEditing(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ tab: targetTab, id }: DeleteTarget) => deleteLookup(targetTab, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Data organisasi berhasil dihapus.');
      setDeleteTarget(null);
    },
    onError: error => toast.error(`${getErrorMessage(error)} Data yang masih dipakai tidak dapat dihapus.`),
  });

  const currentData = useMemo(() => {
    if (!organization.data) return [];
    return organization.data[tab] as Editable[];
  }, [organization.data, tab]);

  const enriched = useMemo(() => currentData.map(item => {
    const department = tab === 'positions'
      ? organization.data?.departments.find(value => value.id === (item as PositionRow).department_id)
      : null;
    const division = tab === 'departments'
      ? organization.data?.divisions.find(value => value.id === (item as DepartmentRow).division_id)
      : department
        ? organization.data?.divisions.find(value => value.id === department.division_id)
        : null;
    return {
      item,
      parent: tab === 'divisions'
        ? '—'
        : tab === 'departments'
          ? division?.name ?? '—'
          : department
            ? `${division?.name ?? '—'} · ${department.name}`
            : 'Lintas Departemen',
    };
  }), [currentData, organization.data, tab]);

  type Row = (typeof enriched)[number];
  type ColumnKey = 'name' | 'parent' | 'description' | 'created';
  const columns = useMemo<Array<TableColumn<Row, ColumnKey>>>(() => [
    { key: 'name', label: 'Nama', accessor: row => row.item.name, defaultWidth: 230 },
    { key: 'parent', label: 'Induk Organisasi', accessor: row => row.parent, defaultVisible: tab !== 'divisions', defaultWidth: 260 },
    { key: 'description', label: 'Deskripsi', accessor: row => row.item.description, defaultWidth: 420 },
    { key: 'created', label: 'Dibuat', accessor: row => row.item.created_at, defaultWidth: 150 },
  ], [tab]);

  const table = useDataTable({
    tableId: `organization-${tab}`,
    rows: enriched,
    columns,
    initialPageSize: 20,
  });

  const title = tabs.find(item => item.id === tab)?.label ?? '';

  return (
    <>
      <PageHeader
        title="Master Organisasi"
        description="Susun hierarki divisi, departemen, dan jabatan serta kelola import/export massal."
        actions={
          <>
            <ExportMenu
              options={{
                rows: table.sortedRows,
                columns: [
                  { label: 'Nama', value: row => row.item.name },
                  { label: 'Induk Organisasi', value: row => row.parent },
                  { label: 'Deskripsi', value: row => row.item.description },
                  { label: 'Dibuat', value: row => formatDate(row.item.created_at, 'dd MMM yyyy HH:mm') },
                ],
                fileName: `master-${tab}`,
                title: `Master ${title}`,
                entityType: tab,
              }}
            />
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="size-4" /> Import Excel
            </Button>
            <Button onClick={() => openForm()}><Plus className="size-4" /> Tambah {title}</Button>
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map(item => {
              const Icon = item.icon;
              return (
                <Button key={item.id} variant={tab === item.id ? 'primary' : 'ghost'} onClick={() => setTab(item.id)}>
                  <Icon className="size-4" /> {item.label}
                </Button>
              );
            })}
          </div>
          <ColumnVisibilityMenu
            columns={columns}
            visible={table.visible}
            onToggle={table.toggleColumn}
            onReset={table.reset}
          />
        </CardContent>
      </Card>

      <Card className="mt-5 overflow-hidden">
        {organization.isLoading ? (
          <div className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800" />
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
                    <th className="w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {table.pageRows.map(row => (
                    <tr key={row.item.id}>
                      {table.visible.name && <td className="font-bold text-slate-900 dark:text-white">{row.item.name}</td>}
                      {table.visible.parent && <td>{row.parent}</td>}
                      {table.visible.description && <td className="whitespace-normal text-slate-500 dark:text-slate-400">{row.item.description || '—'}</td>}
                      {table.visible.created && <td>{formatDate(row.item.created_at)}</td>}
                      <td>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openForm(row.item)} aria-label={`Edit ${row.item.name}`}>
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => setDeleteTarget({ tab, id: row.item.id, name: row.item.name })}
                            aria-label={`Hapus ${row.item.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={table.page}
              pageCount={table.pageCount}
              pageSize={table.pageSize}
              totalRows={table.totalRows}
              onPage={table.setPage}
              onPageSize={table.setPageSize}
            />
          </>
        ) : (
          <EmptyState
            icon={tabs.find(item => item.id === tab)?.icon ?? Building2}
            title={`Belum ada ${title.toLowerCase()}`}
            description={`Tambahkan atau import ${title.toLowerCase()} pertama.`}
            action={<Button onClick={() => openForm()}><Plus className="size-4" /> Tambah {title}</Button>}
          />
        )}
      </Card>

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={`${editing ? 'Edit' : 'Tambah'} ${title}`}
        description="Data ini langsung tersedia pada form karyawan."
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Simpan</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {tab === 'departments' && (
            <FormField label="Divisi" required>
              <Select value={divisionId} onChange={event => setDivisionId(event.target.value)}>
                <option value="">Pilih divisi</option>
                {organization.data?.divisions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormField>
          )}
          {tab === 'positions' && (
            <FormField label="Departemen" help="Boleh dikosongkan untuk jabatan lintas departemen.">
              <Select value={departmentId} onChange={event => setDepartmentId(event.target.value)}>
                <option value="">Lintas Departemen</option>
                {organization.data?.departments.map(item => {
                  const division = organization.data?.divisions.find(value => value.id === item.division_id);
                  return <option key={item.id} value={item.id}>{division?.name} · {item.name}</option>;
                })}
              </Select>
            </FormField>
          )}
          <FormField label={`Nama ${title}`} required>
            <Input value={name} onChange={event => setName(event.target.value)} placeholder={`Nama ${title.toLowerCase()}`} />
          </FormField>
          <FormField label="Deskripsi">
            <Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Keterangan singkat" />
          </FormField>
        </div>
      </Modal>

      <OrganizationImportModal open={importOpen} entity={tab} onClose={() => setImportOpen(false)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Hapus ${title.toLowerCase()}?`}
        description={`${deleteTarget?.name ?? ''} akan dihapus. Tindakan ditolak bila data masih digunakan.`}
        confirmLabel="Hapus Data"
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </>
  );
}
