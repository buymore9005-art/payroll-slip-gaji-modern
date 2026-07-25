import { localeMeta, type Locale } from '@/i18n/messages';
import { useTranslation } from '@/hooks/useTranslation';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();
  return (
    <label className="relative block" title={t('Pilih Bahasa')}>
      <span className="sr-only">{t('Pilih Bahasa')}</span>
      <select
        value={locale}
        onChange={event => setLocale(event.target.value as Locale)}
        className="h-10 max-w-36 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
        aria-label={t('Pilih Bahasa')}
      >
        {(Object.entries(localeMeta) as Array<[Locale, (typeof localeMeta)[Locale]]>).map(([value, meta]) => (
          <option key={value} value={value}>{meta.flag} {meta.label}</option>
        ))}
      </select>
    </label>
  );
}
