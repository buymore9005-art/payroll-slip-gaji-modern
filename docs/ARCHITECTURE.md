# Architecture

## Model Deployment

Aplikasi merupakan Single Page Application Vite yang di-host Vercel. Browser berkomunikasi langsung dengan Supabase memakai anon key. Keamanan tidak bergantung pada UI karena setiap tabel dan Storage object dilindungi RLS.

## Lapisan Front-End

- `components/ui`: primitive visual reusable.
- `components/common`: komponen lintas fitur.
- `components/layout`: navigasi dan shell aplikasi.
- `components/employees`: form karyawan dan kehadiran.
- `components/payroll`: form payroll dan preview slip.
- `pages`: route-level composition dan data fetching.
- `services`: seluruh operasi Supabase dan export.
- `hooks`: sesi, tema, permission, debounce, signed URL.
- `contexts`: Auth dan Theme.
- `utils`: kalkulasi murni, format, file, device, dan validasi import.
- `types`: kontrak domain dan bentuk row database.

TanStack Query mengelola cache server state. React Hook Form dan Zod mengelola form serta validasi. Route utama dimuat dengan `lazy()` agar bundle awal lebih kecil.

## Model Data

- `profiles` memperluas `auth.users`.
- `divisions → departments → positions` membentuk struktur organisasi.
- `employees` mengacu pada ketiga master organisasi.
- `attendance_summaries` menyimpan satu rekap per karyawan dan periode.
- `payrolls` menyimpan satu payroll per karyawan dan periode.
- `import_batches` menyimpan ringkasan import.
- `activity_logs` menyimpan audit.
- `company_settings` mempunyai satu row dengan `id = 1`.

## Snapshot Payroll

Saat payroll dibuat dan kembali saat difinalisasi, trigger mengambil snapshot identitas karyawan, organisasi, rekening, dan perusahaan ke JSONB. View slip mengutamakan snapshot tersebut. Perubahan master setelah finalisasi tidak mengubah slip historis.

Kolom `total_income`, `total_deduction`, dan `net_salary` merupakan generated columns sehingga perhitungan final kembali dijamin database.

## Lifecycle Payroll

```text
draft → finalized → paid
   └──────────────→ cancelled
finalized ────────→ cancelled
```

- Hanya draft yang dapat diedit dan dihapus.
- Finalisasi mengisi `finalized_at` dan mengunci komponen finansial.
- Pembayaran mengisi `paid_at`.
- Payroll dibayar tidak dapat dikembalikan.
- Nomor slip dan token verifikasi unik.

## Export

PDF, QR, Excel, CSV, dan ZIP dibuat di browser. Pendekatan ini tidak memerlukan server khusus, function berbayar, filesystem persisten, atau perubahan konfigurasi Vercel.

## Public Verification

Route publik memanggil `verify_payslip`. RPC security-definer melakukan exact match nomor slip dan token, hanya menerima status `finalized` atau `paid`, menyamarkan NIK, dan tidak mengembalikan rincian penghasilan/potongan.
