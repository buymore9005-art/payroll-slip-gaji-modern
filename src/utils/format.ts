import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
    .format(Number(value ?? 0));
}
export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('id-ID').format(Number(value ?? 0));
}
export function formatDate(value: string | null | undefined, pattern = 'dd MMM yyyy') {
  if (!value) return '—';
  try { return format(parseISO(value), pattern, { locale: id }); } catch { return value; }
}
export function formatPeriod(value: string) { return formatDate(value, 'MMMM yyyy'); }
export function currentPeriod() { return new Date().toISOString().slice(0, 7) + '-01'; }
export function toMonthInput(period: string) { return period.slice(0, 7); }
export function fromMonthInput(month: string) { return month ? `${month}-01` : currentPeriod(); }
