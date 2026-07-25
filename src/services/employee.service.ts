import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import { removeStorageFile, uploadImage } from '@/services/storage.service';
import type {
  ActivityLogRow,
  EmployeeDirectoryRow,
  EmployeeRow,
  EmploymentStatus,
} from '@/types/database';
import type { EmployeeFilters } from '@/types/domain';

export async function listEmployees(filters: EmployeeFilters = {}): Promise<EmployeeDirectoryRow[]> {
  let query = supabase.from('v_employee_directory').select('*').order('name');
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,nik.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }
  if (filters.divisionId) query = query.eq('division_id', filters.divisionId);
  if (filters.positionId) query = query.eq('position_id', filters.positionId);
  if (filters.status) query = query.eq('employment_status', filters.status);
  if (filters.archive === 'archived') query = query.not('deleted_at', 'is', null);
  else if (filters.archive !== 'all') query = query.is('deleted_at', null);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as EmployeeDirectoryRow[];
}

export type EmployeePayload = {
  nik: string; name: string; division_id: string; department_id: string; position_id: string;
  employment_status: EmploymentStatus; join_date: string; bank_account: string; bank_name: string;
  npwp: string; bpjs: string; basic_salary: number; fixed_allowance: number;
  variable_allowance: number; email: string; phone: string;
};

export async function saveEmployee(input: EmployeePayload & {
  id?: string; photo?: File | null; oldPhotoPath?: string | null; userId: string;
}) {
  let photoPath = input.oldPhotoPath ?? null;
  if (input.photo) photoPath = await uploadImage(input.photo, 'employees', input.id ?? input.nik);
  const { id, photo, oldPhotoPath, userId, ...payload } = input;
  const databasePayload = {
    ...payload,
    photo_path: photoPath,
    updated_by: userId,
    ...(id ? {} : { created_by: userId }),
  };
  const query = id
    ? supabase.from('employees').update(databasePayload).eq('id', id).select('*').single()
    : supabase.from('employees').insert(databasePayload).select('*').single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (photo && oldPhotoPath) await removeStorageFile(oldPhotoPath);
  await logActivity({
    action: id ? 'EDIT' : 'TAMBAH',
    entityType: 'employees',
    entityId: (data as EmployeeRow).id,
    description: `${id ? 'Mengubah' : 'Menambah'} karyawan ${payload.name}`,
  });
  return data as EmployeeRow;
}

export async function softDeleteEmployee(employee: EmployeeDirectoryRow, reason: string) {
  const { error } = await supabase.rpc('soft_delete_employee', {
    p_employee_id: employee.id,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

export async function restoreEmployee(
  employee: EmployeeDirectoryRow,
  status: Exclude<EmploymentStatus, 'inactive'> = 'permanent',
) {
  const { error } = await supabase.rpc('restore_employee', {
    p_employee_id: employee.id,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}

/** Kept as a compatibility alias; deletion is now non-destructive. */
export async function deleteEmployee(employee: EmployeeDirectoryRow) {
  await softDeleteEmployee(employee, 'Diarsipkan dari daftar karyawan');
}

export async function listEmployeeHistory(employeeId: string): Promise<ActivityLogRow[]> {
  const { data, error } = await supabase
    .from('v_activity_logs')
    .select('*')
    .eq('entity_type', 'employees')
    .eq('entity_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityLogRow[];
}
