# Deployment Guide

## Prasyarat

- Akun GitHub.
- Akun Supabase.
- Akun Vercel.
- Node.js 20 atau lebih baru untuk pengembangan lokal.

## Urutan Deployment Produksi

### Supabase

1. Buat project baru.
2. Buka SQL Editor.
3. Jalankan `supabase/setup.sql` secara utuh.
4. Buka **Project Settings → API** dan catat:
   - Project URL.
   - Anon public key.
5. Buka **Authentication → URL Configuration**.
6. Setelah domain Vercel tersedia, tambahkan:
   - `https://DOMAIN-VERCEL`
   - `https://DOMAIN-VERCEL/**`

Bucket `payroll-assets` dibuat otomatis oleh SQL dan tidak perlu dibuat manual.

### GitHub

Upload seluruh file repository tanpa `.env.local` dan tanpa `node_modules`.

Contoh:

```bash
git init
git add .
git commit -m "feat: initialize payroll modern"
git branch -M main
git remote add origin URL_REPOSITORY_GITHUB
git push -u origin main
```

### Vercel

1. Import repository GitHub.
2. Framework Preset: Vite.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Tambahkan environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_NAME
```

6. Deploy.
7. Tambahkan domain produksi ke konfigurasi URL Auth Supabase.
8. Daftar akun pertama melalui `/register`.

## Verifikasi Setelah Deployment

- `/register` menampilkan pendaftaran Super Admin pertama.
- Login berhasil.
- Dashboard menampilkan seed data.
- Foto karyawan dapat diunggah.
- Template Excel dapat diunduh.
- Generate payroll massal tidak menggandakan periode yang sudah ada.
- Finalisasi mengunci payroll.
- PDF mempunyai nomor slip, watermark, dan QR.
- QR membuka `/verify/<nomor-slip>?token=<token>`.
- Refresh langsung pada `/app/payroll` tidak menghasilkan 404.
- Dark mode tersimpan setelah reload.

## Environment Preview Vercel

Untuk preview deployment, tambahkan URL preview ke Supabase Redirect URLs. Karena URL preview dapat berubah, gunakan custom preview domain atau pattern domain yang diizinkan oleh dashboard Supabase.

## Rollback

Front-end dapat di-rollback melalui Deployment History Vercel. Database sebaiknya dibackup sebelum perubahan SQL lanjutan. File `setup.sql` merupakan baseline awal; migrasi produksi berikutnya sebaiknya dibuat sebagai file SQL terpisah dan tidak menghapus data historis.
