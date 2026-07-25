import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import type { AttendanceDetailRow } from '@/types/database';

export type AttendancePayload = {
  employee_id:string; period:string; working_days:number; present_days:number; sick_days:number;
  leave_days:number; absent_days:number; overtime_hours:number; notes:string;
};
export async function listAttendance(filters: { period?:string; search?:string } = {}): Promise<AttendanceDetailRow[]> {
  let query = supabase.from('v_attendance_details').select('*').order('employee_name');
  if (filters.period) query = query.eq('period', filters.period);
  if (filters.search) query = query.or(`employee_name.ilike.%${filters.search}%,nik.ilike.%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AttendanceDetailRow[];
}
export async function saveAttendance(input: AttendancePayload & { id?:string; userId:string }) {
  const { id, userId, ...payload } = input;
  const actorPayload = { ...payload, updated_by:userId, ...(id ? {} : { created_by:userId }) };
  const query = id
    ? supabase.from('attendance_summaries').update(actorPayload).eq('id',id).select('id').single()
    : supabase.from('attendance_summaries').insert(actorPayload).select('id').single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  await logActivity({
    action:id?'EDIT':'TAMBAH', entityType:'attendance', entityId:String(data.id),
    description:`${id?'Mengubah':'Menambah'} ringkasan kehadiran`
  });
}
export async function deleteAttendance(row: AttendanceDetailRow) {
  const { error } = await supabase.from('attendance_summaries').delete().eq('id',row.id);
  if (error) throw new Error(error.message);
  await logActivity({
    action:'HAPUS', entityType:'attendance', entityId:row.id,
    description:`Menghapus kehadiran ${row.employee_name}`
  });
}
