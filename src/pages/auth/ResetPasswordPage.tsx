import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/AuthShell';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/utils';
import { updatePassword } from '@/services/auth.service';

const schema = z.object({
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.'),
  confirmation: z.string(),
}).refine(value => value.password === value.confirmation, {
  path: ['confirmation'],
  message: 'Konfirmasi kata sandi tidak cocok.',
});
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmation: '' },
  });

  const submit = form.handleSubmit(async values => {
    try {
      await updatePassword(values.password);
      toast.success('Kata sandi berhasil diperbarui.');
      navigate('/app/dashboard', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <AuthShell>
      <Card className="glass border-white/80 p-6 sm:p-8">
        <KeyRound className="mb-4 size-10 text-brand-600" />
        <h1 className="text-2xl font-extrabold">Buat kata sandi baru</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Gunakan minimal delapan karakter dan simpan dengan aman.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <FormField label="Kata Sandi Baru" required error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('password')} />
          </FormField>
          <FormField label="Konfirmasi" required error={form.formState.errors.confirmation?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('confirmation')} />
          </FormField>
          <Button className="w-full" size="lg" loading={form.formState.isSubmitting}>Simpan Kata Sandi</Button>
        </form>
      </Card>
    </AuthShell>
  );
}
