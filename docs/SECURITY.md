# Security Model

## Authentication

Supabase Auth menangani session, refresh token, registrasi, login, logout, dan reset kata sandi. Aplikasi hanya memakai anon key.

## Authorization

Role berada pada `profiles.role`:

- `super_admin`
- `hrd`
- `admin_payroll`

Permission UI berada di `src/lib/permissions.ts`. RLS pada `supabase/setup.sql` merupakan sumber kebenaran untuk akses data.

## Bootstrap

- Profil pertama otomatis Super Admin.
- Profil berikutnya memerlukan invite code.
- Invite code disimpan pada `company_settings`.
- RPC pengaturan mengosongkan invite code untuk role selain Super Admin.
- Super Admin dapat merotasi code.
- Trigger mencegah Super Admin aktif terakhir dinonaktifkan, diturunkan, atau dihapus.

## Storage

Bucket `payroll-assets` private dan membatasi file hingga 5 MB.

- `employees/`: ditulis Super Admin atau HRD.
- `company/`: ditulis Super Admin.
- `avatars/<auth.uid>/`: ditulis pemilik akun.
- Seluruh pengguna aktif dapat membaca melalui signed URL.

Validasi MIME juga dilakukan pada browser.

## Payroll Integrity

- Total dihitung generated columns.
- Snapshot dibuat trigger.
- Employee dan periode tidak dapat diubah setelah payroll dibuat.
- Payroll final immutable.
- Hanya draft dapat dihapus.
- Token verifikasi memakai random bytes.
- Public verification tidak mempunyai akses SELECT tabel payroll.

## Audit

`log_activity` mengambil `auth.uid()`, request IP, dan user-agent dari request Supabase. Device dikirim aplikasi. Perubahan master organisasi juga dicatat trigger database.

## Secret Management

Nilai berikut aman untuk browser:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nilai berikut tidak boleh dimasukkan ke repository atau Vercel front-end:

- Supabase `service_role`.
- Database password.
- JWT signing secret.
- Access token pribadi.

## Operational Recommendations

- Rotasi invite code setelah bootstrap.
- Aktifkan email confirmation untuk lingkungan produksi.
- Gunakan custom SMTP perusahaan.
- Aktifkan MFA pada akun Supabase, GitHub, dan Vercel.
- Backup database secara berkala.
- Audit akun Super Admin setiap bulan.
- Jangan mengubah payroll final melalui SQL manual kecuali dalam prosedur koreksi yang terdokumentasi.
