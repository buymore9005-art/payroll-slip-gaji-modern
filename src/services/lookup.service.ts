import { supabase } from '@/lib/supabase';
import type { DepartmentRow, DivisionRow, PositionRow } from '@/types/database';

export async function getOrganization() {
  const [divisionResult, departmentResult, positionResult] = await Promise.all([
    supabase.from('divisions').select('*').order('name'),
    supabase.from('departments').select('*').order('name'),
    supabase.from('positions').select('*').order('name'),
  ]);
  const error = divisionResult.error || departmentResult.error || positionResult.error;
  if (error) throw new Error(error.message);
  return {
    divisions: (divisionResult.data ?? []) as DivisionRow[],
    departments: (departmentResult.data ?? []) as DepartmentRow[],
    positions: (positionResult.data ?? []) as PositionRow[],
  };
}
export async function saveDivision(input: Partial<DivisionRow> & Pick<DivisionRow,'name'>) {
  const payload = { name: input.name.trim(), description: input.description?.trim() ?? '' };
  const query = input.id
    ? supabase.from('divisions').update(payload).eq('id', input.id)
    : supabase.from('divisions').insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
}
export async function saveDepartment(input: Partial<DepartmentRow> & Pick<DepartmentRow,'name'|'division_id'>) {
  const payload = { division_id: input.division_id, name: input.name.trim(), description: input.description?.trim() ?? '' };
  const query = input.id
    ? supabase.from('departments').update(payload).eq('id', input.id)
    : supabase.from('departments').insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
}
export async function savePosition(input: Partial<PositionRow> & Pick<PositionRow,'name'>) {
  const payload = { department_id: input.department_id || null, name: input.name.trim(), description: input.description?.trim() ?? '' };
  const query = input.id
    ? supabase.from('positions').update(payload).eq('id', input.id)
    : supabase.from('positions').insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
}
export async function deleteLookup(table: 'divisions'|'departments'|'positions', id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
