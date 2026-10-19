# Catatan verifikasi

Dilaksanakan pada **19 Oktober 2026**, Windows, di workspace `D:\Project\ABSENSI-SMAN2`.

## Lingkungan yang diuji

- PHP portabel 8.4.26; PHP 8.2 XAMPP tetap tersedia tanpa perubahan.
- Laravel 13.37.0; Inertia Laravel 2.0.28; React 19; TypeScript; Vite 7.3.7.
- MariaDB 10.4.32 XAMPP melalui koneksi `mysql`.
- Node.js 24.15.0; npm 11.12.1.
- Chrome terpasang, Playwright: desktop 1280 x 720 dan emulasi ponsel iPhone 13 (390 x 844 CSS pixel).
- DomPDF untuk pembuatan laporan, Poppler 26.09 untuk pemeriksaan render, pypdf untuk pemeriksaan teks dan ukuran A4.

## Hasil

| Pemeriksaan | Hasil |
| --- | --- |
| Migrasi database aplikasi | Empat migration berstatus `Ran` |
| PHPUnit SQLite in-memory | 35 test, 227 assertion, lulus |
| PHPUnit koneksi mysql / MariaDB | 35 test, 227 assertion, lulus |
| Concurrency dua proses PHP nyata | 3 test, 17 assertion, lulus |
| Playwright desktop + ponsel | 2 alur lengkap, lulus |
| TypeScript | Lulus, termasuk dalam `npm run build` |
| Build Vite | Lulus |
| Validasi Composer | `composer validate --strict`: valid |
| Audit Composer dan npm | Tidak ditemukan advisory kerentanan saat diperiksa |
| Scheduler | `attendance:expire` terdaftar setiap menit; perintah diuji idempoten |
| PDF guru dan siswa | Unduhan PDF nyata, ukuran A4; render diperiksa |
| PDF banyak halaman | 65 catatan dengan keterangan panjang, tujuh halaman; seluruh halaman diperiksa |

Suite SQLite dan mysql menjalankan kasus yang sama pada dua mesin database; angka tersebut tidak dihitung sebagai dua kali jumlah fitur yang berbeda. Test contoh boolean bawaan telah dihapus; halaman publik diperiksa agar tidak menyertakan direktori siswa.

## Cakupan penting

- Login guru valid/tidak valid, login NISN dengan nol awal, penolakan siswa tidak aktif, rate limiting, dan pemisahan guard.
- Pembuatan sesi dengan snapshot, penolakan kelas kosong, validasi durasi, sesi berulang, direktori bersama antar-guru.
- Satu kiriman per siswa, penolakan Alpa dari siswa, perlindungan perubahan ID, kiriman pada deadline, penutupan manual berulang.
- Penutupan otomatis tanpa menimpa respons sah, konfirmasi, pembatasan hasil resmi, koreksi sebelum dan tepat pada deadline tujuh hari.
- Penolakan guru lain pada detail/tutup/koreksi/PDF; rollback perubahan jika ada record dari sesi lain.
- Snapshot tetap benar setelah perubahan nama dan kelas; filter hari kalender WIB; statistik menghitung catatan, bukan siswa unik.
- Pratinjau Excel, nol awal, NISN duplikat dalam file/database, nama tidak valid, rumus, file rusak, batas guru dan TTL token, konflik setelah pratinjau, dan penolakan commit kedua.
- PDF hanya dari catatan pribadi siswa atau sesi guru sendiri yang sudah dikonfirmasi; manipulasi `student_id` ditolak.
- Penyediaan akun dan reset password guru; perubahan akun dengan password saat ini; audit perubahan roster.
- Dua proses bersamaan: dua kiriman menerima tepat satu; kiriman bersamaan dengan penutupan tidak merusak catatan; dua job kedaluwarsa mempertahankan respons sebelumnya.

Alur browser di kedua ukuran layar mencakup: pemilihan peran, login guru, buka sesi, login siswa di konteks terpisah, kirim Hadir, tutup sesi, pastikan Hadir tetap tersimpan, konfirmasi, koreksi siswa lain menjadi Sakit, audit, PDF guru/siswa, tambah kelas, tambah siswa, unggah Excel, periksa duplikat, konfirmasi impor, dan mode gelap. Tidak ada error JavaScript terdeteksi pada alur tersebut. Pemeriksaan lebar halaman tidak menemukan overflow horizontal pada halaman utama yang diuji.

PDF pribadi diperiksa melalui ekstraksi teks: memuat siswa pemilik laporan dan tidak memuat nama siswa lain. PDF tujuh halaman mempertahankan semua 65 catatan, header tabel dan footer di setiap halaman, serta tidak memotong satu baris ke halaman berikutnya.

## Lokasi hasil lokal

Screenshot dan laporan pengujian berada di `.runtime/screenshots/`, diabaikan Git. Database pengujian dipisahkan:

- `absensi_sman2_test`: suite integrasi dan concurrency.
- `absensi_sman2_browser_test`: browser dan pemeriksaan tata letak PDF.

Database utama `absensi_sman2` berisi struktur yang sudah dimigrasi, **tanpa akun guru/siswa/sesi contoh**. Guru pertama dibuat dengan `teacher:create`. Tidak ada data sekolah nyata yang dimasukkan untuk pengujian.

## Batas verifikasi dan pekerjaan operasional

- Pengujian dilakukan pada MariaDB melalui driver mysql; daemon MySQL 8 murni belum tersedia untuk diuji.
- Pengujian ponsel memakai emulasi ukuran/touch di Chrome, bukan perangkat Android/iOS fisik atau mesin Safari.
- Belum dilakukan uji beban skala produksi, audit penetrasi independen, atau integrasi domain/HTTPS pada server pribadi.
- Server produksi, kredensial, domain, SSL, cron aktif, serta backup perlu disiapkan oleh pemilik server mengikuti README. Tidak ada deployment eksternal yang dilakukan.
- NISN saja tidak membuktikan identitas siswa. Pembatasan akses diterapkan setelah login, tetapi tidak dapat mencegah penyamaran oleh orang yang mengetahui NISN orang lain.

Tidak ada fitur inti yang sengaja ditinggalkan sebagai placeholder. Laravel Boost dipasang sebagai dependensi pengembangan sesuai instruksi skeleton Laravel; tidak membutuhkan layanan tambahan pada produksi.
