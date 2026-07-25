import { useContext } from 'react';
import { I18nContext } from '@/i18n/I18nContext';

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation harus digunakan di dalam I18nProvider.');
  return context;
}
