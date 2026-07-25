import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import type { AppRole, ProfileRow } from '@/types/database';

export async function listUsers():Promise<ProfileRow[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileRow[];
}
export async function updateUserAccess(id:string,role:AppRole,isActive:boolean) {
  const { error } = await supabase.rpc('update_user_access',{
    p_user_id:id,p_role:role,p_is_active:isActive
  });
  if (error) throw new Error(error.message);
  await logActivity({
    action:'EDIT',entityType:'users',entityId:id,
    description:`Memperbarui role menjadi ${role} dan status ${isActive?'aktif':'nonaktif'}`
  });
}
