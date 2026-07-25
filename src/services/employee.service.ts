import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import { removeStorageFile, uploadImage } from '@/services/storage.service';
import type { EmployeeDirectoryRow, EmployeeRow, EmploymentStatus } from '@/types/database';
import type { EmployeeFilters } from '@/types/domain';

export async function listEmployees(filters: EmployeeFilters = {}): Promise<EmployeeDirectoryRow[]> {
  let query = supabase.from('v_employee_directory').select('*').order('name');
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,nik.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  if (filters.divisionId) query = query.eq('division_id', filters.divisionId);
  if (filters.positionId) query = query.eq('position_id', filters.positionId);
  if (filters.status) query = query.eq('employment_status', filters.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as EmployeeDirectoryRow[];
}
export type EmployeePayload = {
  nik:string; name:string; division_id:string; department_id:string; position_id:string;
  employment_status:EmploymentStatus; join_date:string; bank_account:string; bank_name:string;
  npwp:string; bpjs:string; basic_salary:number; fixed_allowance:number;
  variable_allowance:number; email:string; phone:string;
};
export async function saveEmployee(input: EmployeePayload & {
  id?:string; photo?:File | null; oldPhotoPath?:string | null; userId:string;
}) {
  let photoPath = input.oldPhotoPath ?? null;
  if (input.photo) photoPath = await uploadImage(input.photo, 'employees', input.id ?? input.nik);
  const { id, photo, oldPhotoPath, userId, ...payload } = input;
  const databasePayload = {
    ...payload, photo_path: photoPath, updated_by: userId, ...(id ? {} : { created_by: userId })
  };
  const query = id
    ? supabase.from('employees').update(databasePayload).eq('id', id).select('*').single()
    : supabase.from('employees').insert(databasePayload).select('*').single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (photo && oldPhotoPath) await removeStorageFile(oldPhotoPath);
  await logActivity({
    action: id ? 'EDIT' : 'TAMBAH', entityType:'employees', entityId:(data as EmployeeRow).id,
    description:`${id ? 'Mengubah' : 'Menambah'} karyawan ${payload.name}`
  });
  return data as EmployeeRow;
}
export async function deleteEmployee(employee: EmployeeDirectoryRow) {
  const { error } = await supabase.from('employees').delete().eq('id', employee.id);
  if (error) throw new Error(error.message);
  await removeStorageFile(employee.photo_path);
  await logActivity({
    action:'HAPUS', entityType:'employees', entityId:employee.id,
    description:`Menghapus karyawan ${employee.name}`
  });
}
