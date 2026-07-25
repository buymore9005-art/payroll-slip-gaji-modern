# Payroll & Slip Gaji Modern

Aplikasi payroll siap deploy untuk perusahaan kecil hingga menengah, dibangun dengan React, Vite, TypeScript, Tailwind CSS, Supabase, dan Vercel.

## Fitur Utama

- Supabase Authentication dengan tiga role: **Super Admin**, **HRD**, dan **Admin Payroll**.
- Dashboard analitik: total karyawan, slip, pengeluaran gaji, bonus, potongan, statistik bulanan, grafik divisi, departemen, kehadiran, dan payroll hari ini.
- CRUD karyawan lengkap, termasuk foto private di Supabase Storage.
- Master divisi, departemen, dan jabatan.
- Import Excel dengan template resmi, validasi, preview, pembuatan lookup otomatis, upsert berdasarkan NIK, dan progress.
- Rekap kehadiran bulanan.
- Payroll draft, generate massal, kalkulasi otomatis, finalisasi immutable, dan status pembayaran.
- Slip premium dengan snapshot historis, nomor unik, watermark, QR Code verifikasi, dan halaman verifikasi publik yang membatasi data sensitif.
- Export PDF per karyawan, cetak, ZIP beberapa/semua slip, Excel, dan CSV.
- Audit login, tambah, edit, hapus, import, export, cetak, finalisasi, dan pembayaran, termasuk IP, user-agent, dan device.
- Dark mode, light mode, responsive layout, toast, dialog konfirmasi, skeleton, animasi, dan error boundary.
- Supabase Row Level Security, policy Storage, trigger integritas, view analitik, RPC aman, dan seed data.

## Teknologi

- React 18 + Vite 5 + TypeScript 5
- Tailwind CSS
- Supabase Database, Auth, dan Storage
- TanStack Query
- React Hook Form + Zod
- Recharts
- jsPDF + QRCode + JSZip + SheetJS
- Vercel

## Mulai Cepat

### 1. Buat project Supabase

Buat project Supabase baru. Setelah project aktif:

1. Buka **SQL Editor**.
2. Salin seluruh isi [`supabase/setup.sql`](supabase/setup.sql).
3. Jalankan sebagai satu query.
4. Pastikan transaksi selesai tanpa error.

SQL tersebut membuat seluruh tabel, enum, relasi, foreign key, index, generated column, function, RPC, trigger, view, RLS, policy, private Storage bucket, dan seed data.

### 2. Siapkan environment lokal

Salin file environment:

```bash
cp .env.example .env.local
```

Isi dua nilai dari **Supabase Dashboard → Project Settings → API**:

```env
VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY
VITE_APP_NAME=Payroll Modern
```

Jangan pernah memakai `service_role` key di browser atau Vercel.

### 3. Jalankan lokal

Gunakan Node.js 22.x.

```bash
npm install
npm run dev
```

Aplikasi tersedia di `http://localhost:5173`.

### 4. Konfigurasi URL Auth Supabase

Di **Authentication → URL Configuration**, atur:

- Site URL lokal: `http://localhost:5173`
- Redirect URL lokal: `http://localhost:5173/**`
- Site URL produksi: domain Vercel Anda
- Redirect URL produksi: `https://DOMAIN-ANDA/**`

Konfigurasi ini memastikan tautan reset kata sandi kembali ke route `/reset-password`.

### 5. Deploy ke GitHub dan Vercel

1. Upload seluruh isi repository ke GitHub.
2. Di Vercel, pilih **Add New Project** dan import repository.
3. Framework akan terdeteksi sebagai **Vite**.
4. Tambahkan environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_NAME`
5. Deploy.

`vercel.json` sudah mengarahkan seluruh route SPA ke `index.html`, sehingga route seperti `/app/payroll` dan `/verify/...` tetap bekerja ketika dibuka langsung.

## Akun Pertama dan Kode Undangan

- Akun pertama yang mendaftar otomatis menjadi **Super Admin**.
- Akun berikutnya wajib memakai kode undangan.
- Seed awal memakai kode `PAYROLL2026`.
- Setelah Super Admin pertama berhasil masuk, segera buka **Pengaturan → Kode Undangan Registrasi** dan lakukan rotasi kode.
- Akun baru setelah pengguna pertama memperoleh role **Admin Payroll**. Super Admin dapat mengubahnya menjadi HRD atau Super Admin melalui menu **Pengguna & Role**.

Jika konfirmasi email diaktifkan pada Supabase, pengguna perlu mengonfirmasi email sebelum login.

## Matriks Akses

| Fitur | Super Admin | HRD | Admin Payroll |
|---|:---:|:---:|:---:|
| Dashboard | Ya | Ya | Ya |
| Lihat karyawan | Ya | Ya | Ya |
| Tambah/edit/hapus karyawan | Ya | Ya | Tidak |
| Master organisasi | Ya | Ya | Tidak |
| Import Excel | Ya | Ya | Tidak |
| Lihat kehadiran | Ya | Ya | Ya |
| Kelola kehadiran | Ya | Ya | Tidak |
| Lihat payroll & slip | Ya | Ya | Ya |
| Buat/edit payroll draft | Ya | Tidak | Ya |
| Finalisasi & pembayaran | Ya | Tidak | Ya |
| Export slip tunggal | Ya | Ya | Ya |
| Export ZIP massal | Ya | Tidak | Ya |
| Audit aktivitas | Ya | Tidak | Tidak |
| Pengguna & role | Ya | Tidak | Tidak |
| Pengaturan perusahaan | Ya | Tidak | Tidak |

Hak akses tidak hanya disembunyikan di UI. Semua operasi database dan Storage kembali divalidasi oleh RLS Supabase.

## Alur Payroll

1. Pastikan master organisasi dan karyawan sudah lengkap.
2. Isi rekap kehadiran bila digunakan.
3. Buka **Penggajian** dan pilih periode.
4. Gunakan **Generate Massal** atau **Buat Payroll**.
5. Edit komponen bonus, insentif, lembur, THR, potongan, kasbon, BPJS, dan pajak.
6. Finalisasi payroll. Saat finalisasi, database menyimpan snapshot karyawan dan perusahaan serta mengunci komponen finansial.
7. Tandai payroll dibayar.
8. Buka **Slip Gaji** untuk preview, PDF, cetak, ZIP, Excel, atau CSV.

## Import Excel

Template tersedia di:

```text
public/templates/template-import-karyawan.xlsx
```

Kolom pada sheet pertama harus tetap:

```text
NIK, Nama, Jabatan, Divisi, Departemen, Rekening, Bank,
Gaji Pokok, Tunjangan, Email, HP
```

Perilaku import:

- Baris kosong dilewati.
- NIK duplikat dalam file ditolak.
- Email dan angka divalidasi.
- Divisi, departemen, dan jabatan baru dibuat otomatis.
- Karyawan di-upsert berdasarkan NIK.
- Rekening, NIK, dan HP diperlakukan sebagai teks agar nol di depan tetap tersimpan.
- Hasil import dicatat pada `import_batches` dan `activity_logs`.

## Keamanan

- Bucket `payroll-assets` bersifat private.
- Signed URL berlaku sementara.
- Public verification hanya melalui RPC `verify_payslip`.
- Halaman verifikasi menampilkan nama, NIK tersamarkan, jabatan, perusahaan, periode, status, dan total bersih saja.
- Function snapshot internal tidak dapat dipanggil melalui API publik.
- Payroll final tidak dapat diedit atau dihapus.
- Payroll dibayar tidak dapat dikembalikan ke status sebelumnya.
- Database mencegah penurunan role atau penonaktifan Super Admin aktif terakhir.
- Invite code hanya dikembalikan kepada Super Admin.
- Seluruh akses database tetap mengikuti RLS, meskipun request dibuat di luar UI.

Dokumentasi keamanan lebih lengkap tersedia di [`docs/SECURITY.md`](docs/SECURITY.md).

## Script

```bash
npm run dev        # development server
npm run test       # unit test
npm run typecheck  # TypeScript project check
npm run lint       # ESLint
npm run build      # production build
npm run preview    # preview hasil build
```

## Struktur Repository

```text
payroll-slip-gaji-modern/
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── templates/
│       └── template-import-karyawan.xlsx
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── auth/
│   │   ├── common/
│   │   ├── employees/
│   │   ├── layout/
│   │   ├── payroll/
│   │   └── ui/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   │   └── auth/
│   ├── services/
│   ├── styles/
│   ├── tests/
│   ├── types/
│   └── utils/
├── supabase/
│   └── setup.sql
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── ROLE_MATRIX.md
│   └── SECURITY.md
├── .env.example
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.cjs
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
└── vite.config.ts
```

## Data Seed

SQL setup menambahkan:

- Satu identitas perusahaan.
- Tiga divisi.
- Enam departemen.
- Sembilan jabatan.
- Delapan karyawan.
- Enam bulan payroll demonstrasi.
- Rekap kehadiran periode berjalan.

Data dapat diedit atau dihapus melalui aplikasi sesuai aturan relasi.

## Catatan Export Massal

PDF dan ZIP dibuat di browser agar deployment tetap murni statis/serverless di Vercel. Progress ditampilkan selama proses. Untuk jumlah slip yang sangat besar, filter per bulan atau divisi membantu mengurangi konsumsi memori browser.

## Lisensi

MIT. Lihat [`LICENSE`](LICENSE).


## Laporan Verifikasi

Hasil pemeriksaan artifact tersedia di [`docs/VERIFICATION.md`](docs/VERIFICATION.md).

## Perbaikan Build Vercel

Catatan dependency Motion dan langkah redeploy tersedia di [`docs/VERCEL_BUILD_FIX.md`](docs/VERCEL_BUILD_FIX.md).
