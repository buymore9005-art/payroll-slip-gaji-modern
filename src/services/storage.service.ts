import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET } from '@/lib/constants';
import { safeFileName } from '@/utils/file';

export async function uploadImage(file: File, folder: 'employees' | 'company' | 'avatars', ownerId: string) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Gunakan gambar JPG, PNG, atau WebP.');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 5 MB.');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const safeOwner = safeFileName(ownerId) || 'asset';
  const path = `${folder}/${safeOwner}/${Date.now()}-${safeFileName(file.name.replace(/\.[^.]+$/, ''))}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600', upsert: false
  });
  if (error) throw new Error(error.message);
  return path;
}
export async function signedUrl(path: string | null | undefined, expiresIn = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
export async function removeStorageFile(path: string | null | undefined) {
  if (!path) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
