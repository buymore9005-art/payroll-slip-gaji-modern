# Perbaikan Build Vercel: Motion Dependency Mismatch

## Gejala

Rollup berhenti pada import `invariant`/`noop` dari `motion-utils` di dalam `framer-motion`.

## Penyebab

Versi awal memakai `framer-motion` 12.4.7 tanpa lockfile. Vercel menggunakan npm ketika lockfile tidak tersedia, dan rentang Node `>=20` dipetakan ke runtime terbaru yang tersedia. Akibatnya dependency transitif Motion dapat dipasang dalam kombinasi yang berbeda dari paket yang diuji.

## Perbaikan

- `framer-motion` dipindahkan ke `12.42.2`.
- `motion-dom` dikunci ke `12.42.2`.
- `motion-utils` dikunci ke `12.39.0`.
- Runtime Vercel dikunci ke Node `22.x`.
- npm dikunci ke `10.9.2` melalui `packageManager`.
- `vercel.json` menetapkan install, build, dan output directory secara eksplisit.

## Redeploy

Lakukan redeploy tanpa menggunakan Build Cache agar `node_modules` lama tidak digunakan kembali.
