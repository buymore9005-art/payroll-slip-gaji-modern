# Verification Report

Tanggal verifikasi: 25 Juli 2026

## Pemeriksaan yang Lulus

- Parser TypeScript membaca **84 file `.ts`/`.tsx` dan config** tanpa kesalahan sintaks.
- Pemeriksaan semantic lokal TypeScript dengan deklarasi library eksternal sementara selesai tanpa diagnostic.
- **13 assertion domain** lulus untuk:
  - total pendapatan,
  - total potongan,
  - gaji bersih,
  - normalisasi nilai negatif dan `NaN`,
  - perlindungan gaji bersih agar tidak negatif,
  - validasi import Excel,
  - parsing angka format Indonesia,
  - preservasi nol di depan rekening dan nomor HP,
  - deteksi NIK duplikat,
  - matriks permission ketiga role.
- Seluruh import alias lokal `@/...` mengarah ke file yang tersedia.
- Tidak ada penanda pekerjaan tertunda atau instruksi yang meminta pengembang melanjutkan implementasi.
- SQL one-run mempunyai **180 statement top-level**, delimiter string/comment/dollar quote seimbang, dan transaksi berakhir dengan `COMMIT`.
- SQL memuat 10 tabel utama, 8 RPC utama, 10 tabel dengan RLS, Storage bucket private, policy Storage, trigger, view, index, dan seed data.
- Template Excel berhasil dibuka melalui `artifact_tool`.
- Sheet `Data Karyawan` mempunyai header:
  `NIK, Nama, Jabatan, Divisi, Departemen, Rekening, Bank, Gaji Pokok, Tunjangan, Email, HP`.
- Scan formula error workbook tidak menemukan `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, atau `#N/A`.
- Preview visual sheet petunjuk tidak menunjukkan teks terpotong atau sel bertabrakan.

## Pemeriksaan Dependency Eksternal

Registry npm internal pada lingkungan pembuatan artifact mengembalikan HTTP `503 Service Unavailable`. Karena itu, `npm install`, Vitest dengan dependency nyata, ESLint dengan dependency nyata, dan build Vite produksi tidak dapat dijalankan di lingkungan ini.

Repository menyertakan workflow `.github/workflows/ci.yml` yang menjalankan:

```bash
npm install --no-audit --no-fund
npm run test
npm run typecheck
npm run lint
npm run build
```

Workflow tersebut akan memberikan gate dependency nyata saat repository di-push ke GitHub, dan Vercel akan memakai perintah build yang sama.

## Artifact yang Diverifikasi

- `supabase/setup.sql`
- `public/templates/template-import-karyawan.xlsx`
- seluruh source di `src/`
- config Vite, TypeScript, Tailwind, ESLint, PostCSS, Vercel, dan environment example
- dokumentasi deployment, arsitektur, keamanan, dan matriks role

## Perbaikan Build Vercel — Motion

Pemeriksaan tanggal 25 Juli 2026 setelah laporan Rollup:

- `framer-motion` dikunci ke `12.42.2`.
- npm `overrides` mengunci `motion-dom` ke `12.42.2` dan `motion-utils` ke `12.39.0`.
- runtime build dikunci ke Node `22.x`; CI juga memakai Node 22.
- `packageManager` menetapkan npm `10.9.2`.
- `vercel.json` menetapkan install command, build command, dan output directory secara eksplisit.
- regression test `src/tests/dependencyVersions.test.ts` memeriksa alignment versi tersebut.
- parser TypeScript membaca 83 file source/config tanpa kesalahan sintaks.
- pemeriksaan statis dependency alignment lulus.

Build dependency nyata belum dapat dijalankan di lingkungan pembuatan artifact karena registry npm internal mengembalikan HTTP 503, sedangkan akses langsung ke registry npm publik diblokir DNS. Deployment Vercel harus dilakukan tanpa Build Cache agar dependency Motion lama tidak digunakan ulang.

