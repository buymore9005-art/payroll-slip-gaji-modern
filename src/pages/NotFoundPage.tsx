import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="surface max-w-lg p-10 text-center">
        <SearchX className="mx-auto size-14 text-brand-500" />
        <p className="mt-4 text-sm font-extrabold uppercase tracking-[.2em] text-brand-600">404</p>
        <h1 className="mt-2 text-3xl font-black">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Tautan mungkin sudah berubah atau Anda tidak memiliki akses.
        </p>
        <Link
          to="/app/dashboard"
          className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
        >
          <ArrowLeft className="size-4" /> Kembali ke Dashboard
        </Link>
      </div>
    </main>
  );
}
