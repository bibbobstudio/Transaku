# PPOB Offline — Phase 1

Aplikasi lokal Vanilla HTML/CSS/JavaScript yang siap dibungkus dengan Capacitor Android.

## Jalankan di browser

1. Instal Node.js LTS, lalu jalankan `npm install`.
2. Jalankan `npm start` dan buka alamat yang tampil (biasanya `http://localhost:5173`).
3. Uji tambah, edit, cari, favorit, hapus pelanggan, serta ekspor/impor backup.

Versi browser menyimpan data di `localStorage` agar CRUD bisa diuji tanpa Android. Ini hanya adapter pengembangan; pada Android, `database.js` membuat tabel SQLite melalui `@capacitor-community/sqlite` dan menggunakan SQLite sebagai penyimpanan utama.

## Menyiapkan Android (sesudah web stabil)

1. Instal Android Studio dan Android SDK, hubungkan ponsel dengan USB debugging aktif.
2. Jalankan `npx cap add android` sekali.
3. Jalankan `npm run cap:sync`, lalu `npm run cap:android`.
4. Dari Android Studio pilih perangkat USB dan tekan Run.

## Batas Phase 1

Sudah: fondasi UI/navigasi, data pelanggan, SQLite/browser storage, backup/import, settings printer, transaksi Token PLN/Transfer, status pembayaran, serta struk HTML.

Belum: ledger dan pembayaran hutang, riwayat/filter transaksi, OCR, serta pencetakan Bluetooth. Modul untuk fitur-fitur tersebut sudah disediakan sebagai batas pengembangan berikutnya.
