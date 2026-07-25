import type jsPDF from 'jspdf';
import type { PayrollDetailRow } from '@/types/database';
import { formatCurrency, formatDate, formatPeriod } from '@/utils/format';
import { downloadBlob, safeFileName } from '@/utils/file';
import { logActivity } from '@/services/activity.service';

type PdfOptions = { logoUrl?: string | null; baseUrl?: string };
type PdfImage = { dataUrl: string; format: 'PNG' | 'JPEG' | 'WEBP' };

async function imageDataUrl(url?: string | null): Promise<PdfImage | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const format: PdfImage['format'] = blob.type === 'image/jpeg'
      ? 'JPEG'
      : blob.type === 'image/webp'
        ? 'WEBP'
        : 'PNG';
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch {
    return null;
  }
}

const incomeRows = (row: PayrollDetailRow) => [
  ['Gaji Pokok', row.basic_salary], ['Tunjangan Tetap', row.fixed_allowance],
  ['Tunjangan Tidak Tetap', row.variable_allowance], ['Bonus', row.bonus],
  ['Insentif', row.incentive], ['Lembur', row.overtime], ['THR', row.thr],
].filter(([, value]) => Number(value) > 0);

const deductionRows = (row: PayrollDetailRow) => [
  ['Potongan', row.deduction], ['Kasbon', row.loan], ['BPJS', row.bpjs], ['Pajak', row.tax],
].filter(([, value]) => Number(value) > 0);

export async function buildPayslipPdf(row: PayrollDetailRow, options: PdfOptions = {}): Promise<jsPDF> {
  const [
    { default: JsPDF },
    { default: autoTable },
    { default: QRCode },
  ] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('qrcode'),
  ]);

  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const employee = (row.employee_snapshot ?? {}) as Record<string, unknown>;
  const company = (row.company_snapshot ?? {}) as Record<string, unknown>;
  const companyName = String(company.company_name || 'Perusahaan Anda');
  const logo = await imageDataUrl(options.logoUrl);
  const verifyUrl = `${options.baseUrl ?? location.origin}/verify/${encodeURIComponent(row.slip_number)}?token=${encodeURIComponent(row.verification_token)}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });

  doc.setFillColor(49, 46, 129);
  doc.roundedRect(12, 12, 186, 34, 5, 5, 'F');
  if (logo) {
    try {
      doc.addImage(logo.dataUrl, logo.format, 18, 18, 22, 22);
    } catch {
      doc.setFillColor(255, 255, 255);
      doc.circle(29, 29, 10, 'F');
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(companyName, 46, 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('SLIP GAJI KARYAWAN', 46, 33);
  doc.text(String(company.address || ''), 46, 39, { maxWidth: 115 });

  doc.setTextColor(226, 232, 240);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  for (let y = 65; y < 265; y += 42) {
    doc.text(String(company.watermark_text || 'CONFIDENTIAL'), 105, y, { align: 'center', angle: 32 });
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(row.slip_number, 14, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${formatPeriod(row.period)}`, 196, 56, { align: 'right' });

  autoTable(doc, {
    startY: 62,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.6, textColor: [51, 65, 85] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 31 }, 1: { cellWidth: 60 }, 2: { fontStyle: 'bold', cellWidth: 28 } },
    body: [
      ['Nama', row.employee_name, 'NIK', row.nik],
      ['Jabatan', row.position_name, 'Divisi', row.division_name],
      ['Departemen', row.department_name, 'Status', String(employee.employment_status || '—')],
      ['Bank', String(employee.bank_name || '—'), 'Rekening', String(employee.bank_account || '—')],
    ],
  });
  const afterInfo = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  const income = incomeRows(row);
  autoTable(doc, {
    startY: afterInfo,
    head: [['PENDAPATAN', 'JUMLAH']],
    body: [
      ...income.map(([label, value]) => [label, formatCurrency(Number(value))]),
      ['Total Pendapatan', formatCurrency(row.total_income)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.4 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: data => {
      if (data.section === 'body' && data.row.index === income.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [238, 242, 255];
      }
    },
  });
  const afterIncome = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  const deductions = deductionRows(row);
  autoTable(doc, {
    startY: afterIncome,
    head: [['POTONGAN', 'JUMLAH']],
    body: [
      ...deductions.map(([label, value]) => [label, formatCurrency(Number(value))]),
      ['Total Potongan', formatCurrency(row.total_deduction)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [225, 29, 72], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.4 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: data => {
      if (data.section === 'body' && data.row.index === deductions.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [255, 241, 242];
      }
    },
  });
  const y = Math.min(244, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7);
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(14, y, 132, 26, 4, 4, 'F');
  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL DITERIMA', 20, y + 9);
  doc.setFontSize(18);
  doc.text(formatCurrency(row.net_salary), 20, y + 20);
  doc.addImage(qr, 'PNG', 161, y - 1, 28, 28);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Pindai untuk verifikasi', 175, y + 30, { align: 'center' });
  doc.text(`Diterbitkan ${formatDate(row.finalized_at ?? row.created_at, 'dd MMM yyyy HH:mm')} · Dokumen elektronik yang sah.`, 14, 289);
  return doc;
}

export async function exportPayslipPdf(row: PayrollDetailRow, options: PdfOptions = {}) {
  const doc = await buildPayslipPdf(row, options);
  doc.save(`${safeFileName(row.slip_number)}-${safeFileName(row.employee_name)}.pdf`);
  await logActivity({ action: 'EXPORT', entityType: 'payslip', entityId: row.id, description: `Export PDF ${row.slip_number}` });
}

export async function printPayslip(row: PayrollDetailRow, options: PdfOptions = {}) {
  const doc = await buildPayslipPdf(row, options);
  const url = URL.createObjectURL(doc.output('blob'));
  const win = window.open(url, '_blank');
  if (!win) throw new Error('Browser memblokir jendela cetak. Izinkan pop-up untuk aplikasi ini.');
  win.addEventListener('load', () => win.print());
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  await logActivity({ action: 'CETAK', entityType: 'payslip', entityId: row.id, description: `Cetak ${row.slip_number}` });
}

export async function exportPayslipsZip(
  rows: PayrollDetailRow[],
  options: PdfOptions & { onProgress?: (value: number) => void } = {},
) {
  if (!rows.length) throw new Error('Tidak ada slip untuk diekspor.');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (let index = 0; index < rows.length; index += 1) {
    const doc = await buildPayslipPdf(rows[index], options);
    zip.file(
      `${safeFileName(rows[index].slip_number)}-${safeFileName(rows[index].employee_name)}.pdf`,
      doc.output('arraybuffer'),
    );
    options.onProgress?.(((index + 1) / rows.length) * 90);
  }
  const blob = await zip.generateAsync(
    { type: 'blob' },
    meta => options.onProgress?.(90 + meta.percent * 0.1),
  );
  downloadBlob(blob, `slip-gaji-${new Date().toISOString().slice(0, 10)}.zip`);
  await logActivity({
    action: 'EXPORT',
    entityType: 'payslip',
    description: `Export ZIP ${rows.length} slip`,
    metadata: { count: rows.length },
  });
}

function exportRows(rows: PayrollDetailRow[]) {
  return rows.map(row => ({
    NomorSlip: row.slip_number,
    Periode: row.period,
    NIK: row.nik,
    Nama: row.employee_name,
    Jabatan: row.position_name,
    Divisi: row.division_name,
    Departemen: row.department_name,
    GajiPokok: row.basic_salary,
    TunjanganTetap: row.fixed_allowance,
    TunjanganTidakTetap: row.variable_allowance,
    Bonus: row.bonus,
    Insentif: row.incentive,
    Lembur: row.overtime,
    THR: row.thr,
    Potongan: row.deduction,
    Kasbon: row.loan,
    BPJS: row.bpjs,
    Pajak: row.tax,
    TotalPendapatan: row.total_income,
    TotalPotongan: row.total_deduction,
    TotalBersih: row.net_salary,
    Status: row.status,
  }));
}

export async function exportPayrollExcel(rows: PayrollDetailRow[]) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.json_to_sheet(exportRows(rows));
  sheet['!cols'] = [16, 12, 14, 25, 22, 20, 20, ...Array(15).fill(16)];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Payroll');
  XLSX.writeFile(workbook, `payroll-${new Date().toISOString().slice(0, 10)}.xlsx`);
  await logActivity({ action: 'EXPORT', entityType: 'payroll', description: `Export Excel ${rows.length} payroll` });
}

export async function exportPayrollCsv(rows: PayrollDetailRow[]) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.json_to_sheet(exportRows(rows));
  const csv = XLSX.utils.sheet_to_csv(sheet);
  downloadBlob(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
    `payroll-${new Date().toISOString().slice(0, 10)}.csv`,
  );
  await logActivity({ action: 'EXPORT', entityType: 'payroll', description: `Export CSV ${rows.length} payroll` });
}
