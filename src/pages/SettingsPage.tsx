import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Copy,
  KeyRound,
  Moon,
  RefreshCcw,
  Sun,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { FormField } from '@/components/common/FormField';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { useTheme } from '@/hooks/useTheme';
import { getErrorMessage } from '@/lib/utils';
import {
  getCompanySettings,
  regenerateInviteCode,
  saveCompanySettings,
} from '@/services/settings.service';
import type { CompanySettingsRow } from '@/types/database';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const settings = useQuery({ queryKey: ['company-settings'], queryFn: getCompanySettings });
  const { data: logoUrl } = useSignedUrl(settings.data?.logo_path);
  const [form, setForm] = useState<CompanySettingsRow | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [rotateOpen, setRotateOpen] = useState(false);
  const logoPreview = useMemo(() => (logo ? URL.createObjectURL(logo) : null), [logo]);

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('Pengaturan belum dimuat.');
      if (!form.company_name.trim()) throw new Error('Nama perusahaan wajib diisi.');
      return saveCompanySettings({
        ...form,
        logo,
        oldLogoPath: form.logo_path,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Pengaturan perusahaan berhasil disimpan.');
      setLogo(null);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const rotateMutation = useMutation({
    mutationFn: regenerateInviteCode,
    onSuccess: async code => {
      await queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      setForm(current => current ? { ...current, registration_invite_code: code } : current);
      toast.success('Kode undangan baru berhasil dibuat.');
      setRotateOpen(false);
    },
    onError: error => toast.error(getErrorMessage(error)),
  });

  const update = <K extends keyof CompanySettingsRow>(key: K, value: CompanySettingsRow[K]) => {
    setForm(current => current ? { ...current, [key]: value } : current);
  };

  const copyInvite = async () => {
    if (!form?.registration_invite_code) return;
    await navigator.clipboard.writeText(form.registration_invite_code);
    toast.success('Kode undangan disalin.');
  };

  if (settings.isLoading || !form) {
    return (
      <>
        <PageHeader title="Pengaturan" description="Identitas perusahaan dan konfigurasi aplikasi." />
        <div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-[520px]" /><Skeleton className="h-[520px]" /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Atur identitas yang tampil pada slip, logo Storage, tema, zona waktu, dan kode undangan akun."
        actions={<Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Simpan Pengaturan</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-extrabold">Identitas Perusahaan</h2>
              <p className="mt-1 text-xs text-slate-500">Data ini disalin ke snapshot setiap payroll.</p>
            </div>
            <Building2 className="size-5 text-brand-500" />
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField label="Nama Perusahaan" required>
              <Input value={form.company_name} onChange={event => update('company_name', event.target.value)} />
            </FormField>
            <FormField label="Alamat">
              <Textarea value={form.address} onChange={event => update('address', event.target.value)} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Email">
                <Input type="email" value={form.email} onChange={event => update('email', event.target.value)} />
              </FormField>
              <FormField label="Nomor Telepon">
                <Input value={form.phone} onChange={event => update('phone', event.target.value)} />
              </FormField>
              <FormField label="NPWP Perusahaan">
                <Input value={form.tax_id} onChange={event => update('tax_id', event.target.value)} />
              </FormField>
              <FormField label="Watermark Slip">
                <Input value={form.watermark_text} onChange={event => update('watermark_text', event.target.value.toUpperCase())} />
              </FormField>
              <FormField label="Mata Uang">
                <Select value={form.currency} onChange={event => update('currency', event.target.value)}>
                  <option value="IDR">IDR — Rupiah Indonesia</option>
                </Select>
              </FormField>
              <FormField label="Zona Waktu">
                <Select value={form.timezone} onChange={event => update('timezone', event.target.value)}>
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                </Select>
              </FormField>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <h2 className="font-extrabold">Logo Perusahaan</h2>
                <p className="mt-1 text-xs text-slate-500">Dipakai pada preview dan PDF slip.</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/30">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo baru" className="max-h-28 max-w-full object-contain" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo perusahaan" className="max-h-28 max-w-full object-contain" />
                ) : (
                  <Building2 className="size-14 text-slate-300" />
                )}
              </div>
              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                <Upload className="size-4" /> Pilih Logo
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={event => setLogo(event.target.files?.[0] ?? null)}
                />
              </label>
              <p className="mt-2 text-center text-xs text-slate-500">PNG transparan direkomendasikan; JPG dan WebP juga didukung. Maksimal 5 MB.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="font-extrabold">Tampilan</h2>
                <p className="mt-1 text-xs text-slate-500">Tema tersimpan di perangkat ini.</p>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              <Button variant={theme === 'light' ? 'primary' : 'secondary'} onClick={() => setTheme('light')}>
                <Sun className="size-4" /> Terang
              </Button>
              <Button variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => setTheme('dark')}>
                <Moon className="size-4" /> Gelap
              </Button>
              <Button variant={theme === 'system' ? 'primary' : 'secondary'} onClick={() => setTheme('system')}>
                Sistem
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="font-extrabold">Kode Undangan Registrasi</h2>
                <p className="mt-1 text-xs text-slate-500">Akun kedua dan seterusnya wajib memakai kode ini.</p>
              </div>
              <KeyRound className="size-5 text-brand-500" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input readOnly value={form.registration_invite_code} className="font-mono font-black tracking-wider" />
                <Button variant="secondary" size="icon" onClick={() => void copyInvite()} aria-label="Salin kode">
                  <Copy className="size-4" />
                </Button>
              </div>
              <Button className="mt-3 w-full" variant="secondary" onClick={() => setRotateOpen(true)}>
                <RefreshCcw className="size-4" /> Rotasi Kode Undangan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={rotateOpen}
        title="Buat kode undangan baru?"
        description="Kode lama langsung tidak berlaku. Bagikan kode baru hanya kepada calon pengguna yang berwenang."
        confirmLabel="Rotasi Kode"
        variant="primary"
        loading={rotateMutation.isPending}
        onClose={() => setRotateOpen(false)}
        onConfirm={() => rotateMutation.mutate()}
      />
    </>
  );
}
