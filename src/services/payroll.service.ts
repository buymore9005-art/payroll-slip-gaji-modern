import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import type { PayrollDetailRow, PayrollStatus, VerifiedPayslip } from '@/types/database';
import type { BulkPayrollResult, PayrollFilters, PayrollInput } from '@/types/domain';

export async function listPayrolls(filters: PayrollFilters = {}): Promise<PayrollDetailRow[]> {
  let query = supabase.from('v_payroll_details').select('*')
    .order('period',{ascending:false}).order('employee_name');
  if (filters.search) {
    query = query.or(`employee_name.ilike.%${filters.search}%,nik.ilike.%${filters.search}%,slip_number.ilike.%${filters.search}%`);
  }
  if (filters.month && filters.year) {
    query = query.eq('period',`${filters.year}-${filters.month.padStart(2,'0')}-01`);
  } else if (filters.year) {
    query = query.gte('period',`${filters.year}-01-01`).lte('period',`${filters.year}-12-01`);
  }
  if (filters.status) query = query.eq('status',filters.status);
  if (filters.divisionId) query = query.eq('division_id',filters.divisionId);
  if (filters.positionId) query = query.eq('position_id',filters.positionId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as PayrollDetailRow[];
}
export type PayrollPayload = PayrollInput & {
  employee_id:string; period:string; status?:PayrollStatus; notes:string;
};
export async function savePayroll(input: PayrollPayload & { id?:string; userId:string }) {
  const { id, userId, ...payload } = input;
  const query = id
    ? supabase.from('payrolls').update({...payload,updated_by:userId}).eq('id',id).select('id').single()
    : supabase.from('payrolls').insert({...payload,created_by:userId,updated_by:userId}).select('id').single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  await logActivity({
    action:id?'EDIT':'TAMBAH', entityType:'payroll', entityId:String(data.id),
    description:`${id?'Mengubah':'Membuat'} payroll periode ${payload.period}`
  });
  return String(data.id);
}
export async function generatePayrollBatch(period:string) {
  const { data, error } = await supabase.rpc('generate_payroll_batch',{p_period:period});
  if (error) throw new Error(error.message);
  await logActivity({
    action:'TAMBAH', entityType:'payroll',
    description:`Generate payroll massal ${period}`, metadata:data as never
  });
  return data as {inserted:number;skipped:number};
}
export async function updatePayrollStatus(row:PayrollDetailRow,status:PayrollStatus) {
  const { error } = await supabase.from('payrolls').update({status}).eq('id',row.id);
  if (error) throw new Error(error.message);
  await logActivity({
    action:status==='finalized'?'FINALISASI':status==='paid'?'BAYAR':'EDIT',
    entityType:'payroll', entityId:row.id,
    description:`Status ${row.slip_number} menjadi ${status}`
  });
}
export async function deletePayroll(row:PayrollDetailRow) {
  const { error } = await supabase.from('payrolls').delete().eq('id',row.id);
  if (error) throw new Error(error.message);
  await logActivity({
    action:'HAPUS', entityType:'payroll', entityId:row.id,
    description:`Menghapus ${row.slip_number}`
  });
}
export async function verifyPayslip(slipNumber:string,token:string):Promise<VerifiedPayslip|null> {
  const { data, error } = await supabase.rpc('verify_payslip',{
    p_slip_number:slipNumber,p_token:token
  });
  if (error) throw new Error(error.message);
  return data as VerifiedPayslip|null;
}


export async function duplicatePayroll(row: PayrollDetailRow, period: string) {
  const { data, error } = await supabase.rpc('duplicate_payroll', {
    p_source_id: row.id,
    p_period: period,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function recalculatePayroll(row: PayrollDetailRow) {
  const { error } = await supabase.rpc('recalculate_payroll', {
    p_payroll_id: row.id,
  });
  if (error) throw new Error(error.message);
}

export async function bulkUpdatePayrollStatus(
  ids: string[],
  status: Extract<PayrollStatus, 'draft' | 'finalized' | 'paid'>,
): Promise<BulkPayrollResult> {
  const { data, error } = await supabase.rpc('bulk_update_payroll_status', {
    p_ids: ids,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  return data as BulkPayrollResult;
}

export async function bulkDeletePayrolls(ids: string[]): Promise<BulkPayrollResult> {
  const { data, error } = await supabase.rpc('bulk_delete_payrolls', {
    p_ids: ids,
  });
  if (error) throw new Error(error.message);
  return data as BulkPayrollResult;
}
