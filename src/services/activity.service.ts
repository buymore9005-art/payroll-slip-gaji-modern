import { supabase } from '@/lib/supabase';
import { getDeviceDescription } from '@/utils/device';
import type { ActivityLogRow, Json } from '@/types/database';

export async function logActivity(input: {
  action: string; entityType: string; entityId?: string | null; description: string; metadata?: Json;
}) {
  const { error } = await supabase.rpc('log_activity', {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_description: input.description,
    p_metadata: input.metadata ?? {},
    p_device: getDeviceDescription(),
  });
  if (error) console.warn('Audit log gagal dicatat:', error.message);
}
export async function listActivityLogs(filters: {
  search?: string; action?: string; from?: string; to?: string;
} = {}): Promise<ActivityLogRow[]> {
  let query = supabase.from('v_activity_logs').select('*').order('created_at', { ascending: false }).limit(500);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00`);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59`);
  if (filters.search) {
    query = query.or(`description.ilike.%${filters.search}%,user_name.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityLogRow[];
}
