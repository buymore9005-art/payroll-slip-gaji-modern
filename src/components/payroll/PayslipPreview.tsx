import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Building2, CheckCircle2 } from 'lucide-react';
import type { PayrollDetailRow } from '@/types/database';
import { formatCurrency, formatDate, formatPeriod } from '@/utils/format';

const incomeRows = (row: PayrollDetailRow) => [
  ['Gaji Pokok', row.basic_salary],
  ['Tunjangan Tetap', row.fixed_allowance],
  ['Tunjangan Tidak Tetap', row.variable_allowance],
  ['Bonus', row.bonus],
  ['Insentif', row.incentive],
  ['Lembur', row.overtime],
  ['THR', row.thr],
].filter(([, value]) => Number(value) > 0);

const deductionRows = (row: PayrollDetailRow) => [
  ['Potongan', row.deduction],
  ['Kasbon', row.loan],
  ['BPJS', row.bpjs],
  ['Pajak', row.tax],
].filter(([, value]) => Number(value) > 0);

export function PayslipPreview({
  row,
  logoUrl,
}: {
  row: PayrollDetailRow;
  logoUrl?: string | null;
}) {
  const [qr, setQr] = useState('');
  const employee = (row.employee_snapshot ?? {}) as Record<string, unknown>;
  const company = (row.company_snapshot ?? {}) as Record<string, unknown>;
  const companyName = String(company.company_name || 'Perusahaan Anda');
  const verificationUrl = `${location.origin}/verify/${encodeURIComponent(row.slip_number)}?token=${encodeURIComponent(row.verification_token)}`;

  useEffect(() => {
    void QRCode.toDataURL(verificationUrl, { width: 220, margin: 1 }).then(setQr);
  }, [verificationUrl]);

  return (
    <article className="relative mx-auto min-h-[980px] w-full max-w-[780px] overflow-hidden rounded-2xl bg-white p-7 text-slate-900 shadow-xl sm:p-10">
      <div className="pointer-events-none absolute inset-0 flex rotate-[-28deg] items-center justify-center">
        <p className="select-none text-7xl font-black tracking-widest text-slate-100">
          {String(company.watermark_text || 'CONFIDENTIAL')}
        </p>
      </div>
      <div className="relative">
        <header className="rounded-3xl bg-gradient-to-r from-brand-800 to-violet-700 p-6 text-white">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt={`Logo ${companyName}`} className="size-16 rounded-2xl bg-white object-contain p-2" />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/15">
                <Building2 className="size-8" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-black">{companyName}</h1>
              <p className="mt-1 text-sm text-white/70">{String(company.address || '')}</p>
              <p className="text-xs text-white/60">{String(company.email || '')} {company.phone ? `· ${String(company.phone)}` : ''}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-white/15 pt-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-white/60">Slip Gaji Karyawan</p>
              <p className="mt-1 font-mono text-sm font-bold">{row.slip_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Periode</p>
              <p className="font-black">{formatPeriod(row.period)}</p>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-3 rounded-2xl border border-slate-200 p-5 sm:grid-cols-2">
          {[
            ['Nama', row.employee_name],
            ['NIK', row.nik],
            ['Jabatan', row.position_name],
            ['Divisi', row.division_name],
            ['Departemen', row.department_name],
            ['Status', String(employee.employment_status || '—')],
            ['Bank', String(employee.bank_name || '—')],
            ['Rekening', String(employee.bank_account || '—')],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-1 text-sm font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="bg-brand-600 px-4 py-3 text-sm font-black text-white">PENDAPATAN</div>
            <div className="divide-y divide-slate-100">
              {incomeRows(row).map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span>{label}</span><span className="font-bold">{formatCurrency(Number(value))}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3 bg-brand-50 px-4 py-3 text-sm font-black text-brand-800">
                <span>Total Pendapatan</span><span>{formatCurrency(row.total_income)}</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="bg-rose-600 px-4 py-3 text-sm font-black text-white">POTONGAN</div>
            <div className="divide-y divide-slate-100">
              {deductionRows(row).length ? deductionRows(row).map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span>{label}</span><span className="font-bold">{formatCurrency(Number(value))}</span>
                </div>
              )) : (
                <div className="px-4 py-3 text-sm text-slate-400">Tidak ada potongan</div>
              )}
              <div className="flex justify-between gap-3 bg-rose-50 px-4 py-3 text-sm font-black text-rose-800">
                <span>Total Potongan</span><span>{formatCurrency(row.total_deduction)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 flex flex-col justify-between gap-5 rounded-3xl bg-emerald-50 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">Total Diterima</p>
            <p className="mt-2 text-3xl font-black text-emerald-800">{formatCurrency(row.net_salary)}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" /> Slip final dan dapat diverifikasi
            </p>
          </div>
          {qr && (
            <div className="rounded-2xl bg-white p-2 text-center shadow-sm">
              <img src={qr} alt="QR verifikasi slip" className="size-28" />
              <p className="mt-1 text-[9px] font-bold text-slate-500">PINDAI UNTUK VERIFIKASI</p>
            </div>
          )}
        </section>

        <footer className="mt-7 flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-[10px] text-slate-500 sm:flex-row">
          <p>Dokumen elektronik ini diterbitkan pada {formatDate(row.finalized_at ?? row.created_at, 'dd MMMM yyyy HH:mm')}.</p>
          <p className="font-mono">{row.verification_token.slice(0, 14)}…</p>
        </footer>
      </div>
    </article>
  );
}
