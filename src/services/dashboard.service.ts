import { supabase } from '@/lib/supabase';
import type { DashboardSummary } from '@/types/database';
export async function getDashboardSummary(period: string): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('get_dashboard_summary', { p_period:period });
  if (error) throw new Error(error.message);
  return data as DashboardSummary;
}
