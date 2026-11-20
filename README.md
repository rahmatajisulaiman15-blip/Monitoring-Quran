# Tahfidz Monitor — Monitoring Hafalan Qur'an

Aplikasi web untuk memantau setoran hafalan Al-Qur'an satu kelas (30 siswa) pada Juz 26–30.

**Versi online:** https://site-a1bbf5e296c54d5e96e89f32fe150259.freebuff.page — database online terpisah dari data lokal di folder `.wrangler`.

## Fitur

- **Login email & password** (password di-hash PBKDF2-SHA256, sesi cookie 30 hari).
- **30 siswa otomatis** saat akun pertama dibuat, nama/kelas bisa diubah kapan saja.
- **Setoran harian**: pilih siswa, tanggal, juz, halaman awal–akhir, catatan. Halaman divalidasi sesuai juz (Juz 30 = 23 halaman, Juz 29–26 = 20 halaman).
- **Grafik balok 30 warna** (satu warna tetap per siswa), bisa dibandingkan per bulan atau per tahun ajaran.
- **Akumulasi bulanan**: tabel hari, tanggal, bulan, jumlah halaman, plus rincian siswa per hari, rekap per siswa, ekspor CSV, dan cetak.
- **Evaluasi per siswa**: posisi hafalan tiap juz, tren bulanan, tabel rekap bulan + akumulasi, daftar setoran.
- **Bagikan ke orang tua**: tautan laporan publik (tanpa login) + teks WhatsApp + cetak/simpan PDF.
- **Tahun ajaran bisa berganti** lewat Pengaturan tanpa membuat ulang data siswa; data lama tetap tersimpan per tahun ajaran.
- Tema warna grey–beige yang lembut, responsif untuk ponsel.

## Menjalankan

### Cara cepat (Windows)

Klik dua kali **`Buka Aplikasi.bat`**. File itu akan menyalakan server lokal di jendela baru, menunggu sampai siap, lalu membuka `http://127.0.0.1:8787` di Chrome. Biarkan jendela *Server Tahfidz Monitor* tetap terbuka selama aplikasi dipakai; menutupnya akan mematikan server.

### Cara manual

Proyek ini memakai Vite (React) untuk antarmuka dan Cloudflare Worker + D1 untuk API.

```bash
npm install            # sekali saja
npm run build          # bangun antarmuka ke ./dist
npx wrangler dev       # http://localhost:8787 (D1 lokal otomatis dibuat)
```

Saat pertama kali dibuka, aplikasi menampilkan halaman **Buat akun pengajar**. Setelah akun dibuat, 30 data siswa, tahun ajaran berjalan, dan identitas kelas disiapkan otomatis.

Untuk pengembangan antarmuka dengan hot reload:

```bash
npx wrangler dev --port 8787   # terminal 1
npm run dev                    # terminal 2, http://localhost:5173 (proxy /api ke 8787)
```

Catatan: di mesin ini Node.js dipasang portable di `.tools/node` (tidak mengubah sistem), sehingga perintah di atas dijalankan dengan `PATH="$PWD/.tools/node:$PATH"`.

## Deploy

```bash
npm run build
npx wrangler deploy
```

Buat database D1 bernama `monitoring-quran`, lalu sesuaikan `database_id` pada `wrangler.jsonc`. Skema tabel dibuat otomatis oleh Worker pada permintaan pertama.

## Struktur

```
src/                 antarmuka React (halaman, komponen, konteks)
worker/              API, autentikasi, dan skema D1
shared/              tipe bersama + konfigurasi halaman juz
```

## Data contoh

Pengaturan → *Isi data contoh bulan ini* menambahkan setoran contoh agar grafik langsung terlihat. Hapus dengan *Hapus semua setoran*.
