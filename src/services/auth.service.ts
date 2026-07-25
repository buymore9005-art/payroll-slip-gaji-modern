import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import type { ProfileRow } from '@/types/database';

export async function getRegistrationState(): Promise<{ has_users: boolean; invite_required: boolean }> {
  const { data, error } = await supabase.rpc('get_registration_state');
  if (error) throw new Error(error.message);
  return data as { has_users: boolean; invite_required: boolean };
}
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);
  await logActivity({ action: 'LOGIN', entityType: 'auth', entityId: data.user.id, description: `Login berhasil: ${email}` });
  return data;
}
export async function signUp(input: { fullName: string; email: string; password: string; inviteCode?: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName, invite_code: input.inviteCode ?? '' } }
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function signOut() {
  await logActivity({ action: 'LOGOUT', entityType: 'auth', description: 'Keluar dari aplikasi' });
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/reset-password`
  });
  if (error) throw new Error(error.message);
}
export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
export async function getProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}
