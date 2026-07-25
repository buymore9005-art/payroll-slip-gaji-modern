import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole, LogIn, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/AuthShell';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import { getErrorMessage } from '@/lib/utils';
import { signIn } from '@/services/auth.service';
import { getDashboardSummary } from '@/services/dashboard.service';
import { currentPeriod } from '@/utils/format';

const schema = z.object({
  email: z.string().email('Email tidak valid.'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter.'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { session, profile, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navigated = useRef(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    void import('@/pages/DashboardPage');
  }, []);

  useEffect(() => {
    if (
      navigated.current
      || status !== 'authenticated'
      || !session
      || !profile
    ) return;

    navigated.current = true;
    const destination = (location.state as { from?: string } | null)?.from || '/app/dashboard';
    void queryClient.prefetchQuery({
      queryKey: ['dashboard', currentPeriod()],
      queryFn: () => getDashboardSummary(currentPeriod()),
      staleTime: 2 * 60_000,
    }).finally(() => {
      navigate(destination, { replace: true });
    });
  }, [location.state, navigate, profile, session, status]);

  const submit = form.handleSubmit(async values => {
    try {
      await signIn(values.email, values.password);
      toast.success('Selamat datang kembali.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  const redirecting = status === 'authenticated' && Boolean(session && profile);

  return (
    <AuthShell>
      <Card className="glass border-white/80 p-6 sm:p-8">
        <div className="mb-7">
          <div className="mb-4 inline-flex rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
            <LogIn className="size-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Masuk ke akun Anda</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Gunakan akun perusahaan untuk membuka dashboard payroll.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <FormField label="Email" required error={form.formState.errors.email?.message}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input type="email" autoComplete="email" className="pl-10" placeholder="nama@perusahaan.co.id" {...form.register('email')} />
            </div>
          </FormField>
          <FormField label="Kata Sandi" required error={form.formState.errors.password?.message}>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input type="password" autoComplete="current-password" className="pl-10" placeholder="••••••••" {...form.register('password')} />
            </div>
          </FormField>
          <div className="flex justify-end">
            <Link className="text-sm font-semibold text-brand-600 hover:text-brand-700" to="/forgot-password">
              Lupa kata sandi?
            </Link>
          </div>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={form.formState.isSubmitting || redirecting}
          >
            {redirecting ? 'Sedang memuat...' : 'Masuk'} <LogIn className="size-4" />
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Belum memiliki akun?{' '}
          <Link to="/register" className="font-bold text-brand-600 hover:text-brand-700">Daftar</Link>
        </p>
      </Card>
    </AuthShell>
  );
}
