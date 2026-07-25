import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/AuthShell';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/utils';
import { requestPasswordReset } from '@/services/auth.service';

const schema = z.object({ email: z.string().email('Email tidak valid.') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const submit = form.handleSubmit(async values => {
    try {
      await requestPasswordReset(values.email);
      toast.success('Tautan reset telah dikirim. Periksa kotak masuk email.');
      form.reset();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <AuthShell>
      <Card className="glass border-white/80 p-6 sm:p-8">
        <MailCheck className="mb-4 size-10 text-brand-600" />
        <h1 className="text-2xl font-extrabold">Reset kata sandi</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Masukkan email akun. Supabase akan mengirimkan tautan pemulihan yang aman.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <FormField label="Email" required error={form.formState.errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="nama@perusahaan.co.id" {...form.register('email')} />
          </FormField>
          <Button className="w-full" size="lg" loading={form.formState.isSubmitting}>Kirim Tautan Reset</Button>
        </form>
        <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-brand-600">
          <ArrowLeft className="size-4" /> Kembali ke login
        </Link>
      </Card>
    </AuthShell>
  );
}
