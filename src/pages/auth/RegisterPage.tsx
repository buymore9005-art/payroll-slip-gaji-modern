import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Mail, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/AuthShell';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/utils';
import { getRegistrationState, signUp } from '@/services/auth.service';

const schema = z.object({
  fullName: z.string().min(3, 'Nama minimal 3 karakter.'),
  email: z.string().email('Email tidak valid.'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.'),
  confirmation: z.string(),
  inviteCode: z.string().optional(),
}).superRefine((value, context) => {
  if (value.password !== value.confirmation) {
    context.addIssue({ code: 'custom', path: ['confirmation'], message: 'Konfirmasi kata sandi tidak cocok.' });
  }
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<{ has_users: boolean; invite_required: boolean } | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmation: '', inviteCode: '' },
  });

  useEffect(() => {
    void getRegistrationState().then(setState).catch(error => toast.error(getErrorMessage(error)));
  }, []);

  const submit = form.handleSubmit(async values => {
    if (state?.invite_required && !values.inviteCode?.trim()) {
      form.setError('inviteCode', { message: 'Kode undangan wajib diisi.' });
      return;
    }
    try {
      const data = await signUp(values);
      if (data.session) {
        toast.success(state?.has_users ? 'Akun berhasil dibuat.' : 'Super Admin pertama berhasil dibuat.');
        navigate('/app/dashboard', { replace: true });
      } else {
        toast.success('Registrasi berhasil. Periksa email untuk konfirmasi akun.');
        navigate('/login', { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <AuthShell>
      <Card className="glass border-white/80 p-6 sm:p-8">
        <div className="mb-6">
          <div className="mb-4 inline-flex rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
            <UserRoundPlus className="size-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {state?.has_users === false ? 'Buat Super Admin Pertama' : 'Daftar Akun Perusahaan'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {state?.has_users === false
              ? 'Akun pertama otomatis memperoleh akses Super Admin penuh.'
              : 'Masukkan kode undangan yang diberikan Super Admin.'}
          </p>
        </div>
        {!state ? (
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Nama Lengkap" required error={form.formState.errors.fullName?.message}>
              <Input autoComplete="name" placeholder="Nama lengkap" {...form.register('fullName')} />
            </FormField>
            <FormField label="Email" required error={form.formState.errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input type="email" autoComplete="email" className="pl-10" placeholder="nama@perusahaan.co.id" {...form.register('email')} />
              </div>
            </FormField>
            {state.invite_required && (
              <FormField label="Kode Undangan" required error={form.formState.errors.inviteCode?.message}>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-10 uppercase" placeholder="Kode dari Super Admin" {...form.register('inviteCode')} />
                </div>
              </FormField>
            )}
            <FormField label="Kata Sandi" required error={form.formState.errors.password?.message}>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input type="password" autoComplete="new-password" className="pl-10" placeholder="Minimal 8 karakter" {...form.register('password')} />
              </div>
            </FormField>
            <FormField label="Konfirmasi Kata Sandi" required error={form.formState.errors.confirmation?.message}>
              <Input type="password" autoComplete="new-password" placeholder="Ulangi kata sandi" {...form.register('confirmation')} />
            </FormField>
            <Button type="submit" className="w-full" size="lg" loading={form.formState.isSubmitting}>
              Buat Akun
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Sudah memiliki akun?{' '}
          <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700">Masuk</Link>
        </p>
      </Card>
    </AuthShell>
  );
}
