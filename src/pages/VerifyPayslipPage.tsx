import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  ReceiptText,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { verifyPayslip } from '@/services/payroll.service';
import { formatCurrency, formatDate, formatPeriod } from '@/utils/format';

export default function VerifyPayslipPage() {
  const { slipNumber = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const query = useQuery({
    queryKey: ['verify-payslip', slipNumber, token],
    queryFn: () => verifyPayslip(slipNumber, token),
    enabled: Boolean(slipNumber && token),
    retry: false,
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-5">
      <div className="absolute -left-24 top-0 size-80 rounded-full bg-brand-300/25 blur-3xl" />
      <div className="absolute -right-20 bottom-0 size-80 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="relative w-full max-w-xl">
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="rounded-2xl bg-brand-600 p-3 text-white"><Building2 className="size-6" /></div>
          <div>
            <p className="font-extrabold">Payroll Modern</p>
            <p className="text-xs text-slate-500">Verifikasi Slip Gaji</p>
          </div>
        </div>

        {!token ? (
          <Card className="glass p-3">
            <CardContent className="py-10 text-center">
              <XCircle className="mx-auto size-14 text-rose-500" />
              <h1 className="mt-4 text-2xl font-black">Token verifikasi tidak tersedia</h1>
              <p className="mt-2 text-sm text-slate-500">Gunakan QR Code atau tautan lengkap yang terdapat pada slip gaji.</p>
            </CardContent>
          </Card>
        ) : query.isLoading ? (
          <Card className="glass p-7">
            <Skeleton className="mx-auto size-16 rounded-full" />
            <Skeleton className="mx-auto mt-5 h-7 w-56" />
            <Skeleton className="mx-auto mt-3 h-4 w-72" />
            <Skeleton className="mt-7 h-56" />
          </Card>
        ) : query.data?.valid ? (
          <Card className="glass overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-7 py-8 text-center text-white">
              <CheckCircle2 className="mx-auto size-14" />
              <h1 className="mt-4 text-2xl font-black">Slip Gaji Valid</h1>
              <p className="mt-1 text-sm text-white/75">Dokumen cocok dengan catatan resmi perusahaan.</p>
            </div>
            <CardContent className="space-y-5 p-7">
              <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/60">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{query.data.company_name}</p>
                <p className="mt-2 font-mono text-sm font-black text-brand-600">{query.data.slip_number}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['Nama', query.data.employee_name],
                  ['NIK', query.data.nik_masked],
                  ['Jabatan', query.data.position_name],
                  ['Periode', formatPeriod(query.data.period)],
                  ['Status', query.data.status === 'paid' ? 'Dibayar' : 'Final'],
                  ['Finalisasi', formatDate(query.data.finalized_at, 'dd MMM yyyy HH:mm')],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-3xl bg-emerald-50 p-5 dark:bg-emerald-950/30">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Total Diterima</p>
                <p className="mt-2 text-3xl font-black text-emerald-800 dark:text-emerald-200">{formatCurrency(query.data.net_salary)}</p>
              </div>
              <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="size-4 text-emerald-500" /> Data sensitif lain tidak ditampilkan pada halaman publik.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass">
            <CardContent className="py-12 text-center">
              <ReceiptText className="mx-auto size-14 text-rose-400" />
              <h1 className="mt-4 text-2xl font-black">Slip tidak dapat diverifikasi</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Nomor slip atau token tidak cocok, slip belum final, atau dokumen sudah dibatalkan.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mt-5 text-center">
          <Link to="/login"><Button variant="ghost">Masuk ke Aplikasi</Button></Link>
        </div>
      </div>
    </main>
  );
}
