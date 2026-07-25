import { logActivity } from '@/services/activity.service';
import { downloadBlob, safeFileName } from '@/utils/file';

export type ExportColumn<Row> = {
  label: string;
  value: (row: Row) => string | number | boolean | null | undefined;
};

export type TabularExportOptions<Row> = {
  rows: readonly Row[];
  columns: readonly ExportColumn<Row>[];
  fileName: string;
  title: string;
  entityType: string;
};

function serialize<Row>(options: TabularExportOptions<Row>) {
  return options.rows.map(row => Object.fromEntries(
    options.columns.map(column => [column.label, column.value(row) ?? '']),
  ));
}

export async function exportTableExcel<Row>(options: TabularExportOptions<Row>) {
  if (!options.rows.length) throw new Error('Tidak ada data untuk diekspor.');
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.json_to_sheet(serialize(options));
  sheet['!cols'] = options.columns.map(column => ({ wch: Math.max(14, column.label.length + 4) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, options.title.slice(0, 31));
  XLSX.writeFile(workbook, `${safeFileName(options.fileName)}.xlsx`);
  await logActivity({
    action: 'EXPORT', entityType: options.entityType,
    description: `Export Excel ${options.rows.length} ${options.entityType}`,
  });
}

export async function exportTableCsv<Row>(options: TabularExportOptions<Row>) {
  if (!options.rows.length) throw new Error('Tidak ada data untuk diekspor.');
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.json_to_sheet(serialize(options));
  const csv = XLSX.utils.sheet_to_csv(sheet);
  downloadBlob(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
    `${safeFileName(options.fileName)}.csv`,
  );
  await logActivity({
    action: 'EXPORT', entityType: options.entityType,
    description: `Export CSV ${options.rows.length} ${options.entityType}`,
  });
}

export async function exportTablePdf<Row>(options: TabularExportOptions<Row>) {
  if (!options.rows.length) throw new Error('Tidak ada data untuk diekspor.');
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const landscape = options.columns.length > 6;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(options.title, 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Dibuat ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}`, 14, 22);
  autoTable(doc, {
    startY: 27,
    head: [options.columns.map(column => column.label)],
    body: options.rows.map(row => options.columns.map(column => String(column.value(row) ?? ''))),
    styles: { fontSize: 7, cellPadding: 1.8, overflow: 'linebreak' },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 8, right: 8 },
  });
  doc.save(`${safeFileName(options.fileName)}.pdf`);
  await logActivity({
    action: 'EXPORT', entityType: options.entityType,
    description: `Export PDF ${options.rows.length} ${options.entityType}`,
  });
}
