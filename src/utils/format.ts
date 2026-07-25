import { getActiveLocale } from '@/i18n/I18nContext';
import { localeMeta } from '@/i18n/messages';

function intlLocale() {
  return localeMeta[getActiveLocale()].intl;
}

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat(intlLocale(), {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat(intlLocale()).format(Number(value ?? 0));
}

function parseDate(value: string) {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
}

export function formatDate(value: string | null | undefined, pattern = 'dd MMM yyyy') {
  if (!value) return '—';
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return value;
  const options: Intl.DateTimeFormatOptions = {};
  if (pattern.includes('dd')) options.day = '2-digit';
  if (pattern.includes('MMMM')) options.month = 'long';
  else if (pattern.includes('MMM')) options.month = 'short';
  else if (pattern.includes('MM')) options.month = '2-digit';
  if (pattern.includes('yyyy')) options.year = 'numeric';
  if (pattern.includes('HH')) options.hour = '2-digit';
  if (pattern.includes('mm')) options.minute = '2-digit';
  if (pattern.includes('ss')) options.second = '2-digit';
  if (pattern.includes('HH')) options.hour12 = false;
  return new Intl.DateTimeFormat(intlLocale(), options).format(date);
}

export function formatPeriod(value: string) {
  if (!value) return '—';
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(intlLocale(), { month: 'long', year: 'numeric' }).format(date);
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = parseDate(value);
  const difference = date.getTime() - Date.now();
  const absolute = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' });
  if (absolute < 60_000) return formatter.format(Math.round(difference / 1_000), 'second');
  if (absolute < 3_600_000) return formatter.format(Math.round(difference / 60_000), 'minute');
  if (absolute < 86_400_000) return formatter.format(Math.round(difference / 3_600_000), 'hour');
  return formatter.format(Math.round(difference / 86_400_000), 'day');
}

export function currentPeriod() {
  return new Date().toISOString().slice(0, 7) + '-01';
}

export function toMonthInput(period: string) {
  return period.slice(0, 7);
}

export function fromMonthInput(month: string) {
  return month ? `${month}-01` : currentPeriod();
}
