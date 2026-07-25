import type { ReactNode } from 'react';
import { Building2, ShieldCheck, Sparkles } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-screen overflow-hidden lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-950 via-brand-800 to-violet-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-28 size-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <Building2 className="size-7" />
          </div>
          <div>
            <p className="text-lg font-extrabold">{APP_NAME}</p>
            <p className="text-xs text-white/65">Payroll & Slip Gaji Modern</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur">
            <Sparkles className="size-4" /> Modern, aman, dan siap berkembang
          </div>
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight">
            Kelola penggajian dengan lebih tenang.
          </h1>
          <p className="mt-6 text-base leading-8 text-white/75">
            Satu ruang kerja untuk karyawan, kehadiran, payroll, slip terverifikasi, ekspor massal, dan audit aktivitas.
          </p>
        </div>
        <div className="relative flex items-center gap-3 text-sm text-white/65">
          <ShieldCheck className="size-5" />
          Supabase Auth, Row Level Security, dan jejak audit terintegrasi.
        </div>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
