import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getActiveLocale } from '@/i18n/I18nContext';
import { translatePhrase } from '@/i18n/messages';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const knownSupabaseErrors: Record<string, string> = {
  'Invalid login credentials': 'Email atau kata sandi salah.',
  'Email not confirmed': 'Email belum dikonfirmasi.',
  'User already registered': 'Email sudah terdaftar.',
  'JWT expired': 'Sesi telah berakhir. Silakan masuk kembali.',
  'new row violates row-level security policy': 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
  'duplicate key value violates unique constraint': 'Data dengan nilai yang sama sudah tersedia.',
};

export function getErrorMessage(error: unknown): string {
  let message = 'Terjadi kesalahan yang tidak diketahui.';
  if (error instanceof Error) message = error.message;
  else if (typeof error === 'string') message = error;
  else if (error && typeof error === 'object' && 'message' in error) message = String(error.message);

  const normalized = Object.entries(knownSupabaseErrors)
    .find(([source]) => message.toLowerCase().includes(source.toLowerCase()))?.[1] ?? message;
  return translatePhrase(normalized, getActiveLocale());
}
