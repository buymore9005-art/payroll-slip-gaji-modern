import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import { removeStorageFile, uploadImage } from '@/services/storage.service';
import type { CompanySettingsRow } from '@/types/database';

export async function getCompanySettings():Promise<CompanySettingsRow> {
  const { data, error } = await supabase.rpc('get_company_settings');
  if (error) throw new Error(error.message);
  return data as CompanySettingsRow;
}
export async function saveCompanySettings(input: CompanySettingsRow & {
  logo?:File|null; oldLogoPath?:string|null;
}) {
  let logoPath = input.oldLogoPath ?? input.logo_path;
  if (input.logo) logoPath = await uploadImage(input.logo,'company','identity');
  const { logo, oldLogoPath, registration_invite_code, updated_at, ...rest } = input;
  void registration_invite_code;
  void updated_at;
  const { error } = await supabase.from('company_settings')
    .update({...rest,logo_path:logoPath}).eq('id',1);
  if (error) throw new Error(error.message);
  if (logo && oldLogoPath) await removeStorageFile(oldLogoPath);
  await logActivity({
    action:'EDIT',entityType:'settings',entityId:'1',
    description:'Memperbarui pengaturan perusahaan'
  });
}
export async function regenerateInviteCode():Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_registration_invite_code');
  if (error) throw new Error(error.message);
  await logActivity({
    action:'EDIT',entityType:'settings',
    description:'Merotasi kode undangan registrasi'
  });
  return data as string;
}
