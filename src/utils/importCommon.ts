export function importText(value: unknown) {
  return value == null ? '' : String(value).trim();
}

export function importNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  const raw = importText(value).replace(/\s/g, '').replace(/^Rp/i, '');
  if (!raw) return 0;
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : (raw.match(/\./g)?.length ?? 0) > 1
      ? raw.replace(/\./g, '')
      : raw;
  const numeric = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

export function normalizeMonth(value: unknown): string {
  const text = importText(value);
  const direct = text.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (direct) {
    const month = Number(direct[2]);
    return month >= 1 && month <= 12 ? `${direct[1]}-${String(month).padStart(2, '0')}-01` : '';
  }
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return '';
}

export function isEmptyImportRow(row: Record<string, unknown>) {
  return Object.values(row).every(value => importText(value) === '');
}

export function normalizedKey(value: string) {
  return value.trim().toLocaleLowerCase('id-ID').replace(/\s+/g, ' ');
}
