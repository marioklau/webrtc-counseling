# SafeSpace Counseling Platform

Platform konseling psikologi berbasis web dengan fitur video call (WebRTC), manajemen jadwal, dan chat real-time.

## 📋 Fitur Utama

### 👤 Client (Pengguna)
- **Booking Konsultasi**: Memilih kategori masalah, jadwal (tanggal & jam), dan psikolog yang tersedia.
- **Video Call**: Melakukan sesi konseling tatap muka melalui browser.
- **Riwayat Konsultasi**: Melihat daftar sesi yang akan datang dan yang sudah selesai.
- **Notifikasi Status**: Mengetahui status booking (Menunggu, Disetujui, Ditolak).

### 👨‍⚕️ Psikolog (Expert)
- **Dashboard Manajemen**: Melihat permintaan masuk dan jadwal harian.
- **Persetujuan Booking**: Menyetujui atau menolak permintaan konsultasi dengan alasan.
- **Atur Jadwal (Availability)**: Mengatur hari dan jam praktik aktif.
- **Catatan Sesi**: Menambahkan catatan klinis untuk setiap sesi yang telah selesai.
- **Real-time Notification**: Notifikasi langsung saat ada booking baru.

## 🚀 Panduan Penggunaan

### 1. Pendaftaran & Login
- **Client**: Akses halaman login client (`/client-login`) dan masuk menggunakan email terdaftar.
  - *Akun Demo*: `test@email.com`; *Password*: 'dummy123'
- **Psikolog**: Akses halaman login expert (`/login`) dan masuk menggunakan email profesional.
  - *Akun Demo*: `budi@example.com` atau `siti@example.com`; *Password*: 'password123'

---

### 📖 Panduan untuk Client (Klien)

#### Melakukan Booking Baru
1. **Pilih Kategori**: Di halaman utama booking, pilih topik yang ingin dikonsultasikan (misal: Kecemasan, Depresi).
2. **Pilih Jadwal**:
   - Pilih Tanggal (Minimal H+1 dari hari ini).
   - Pilih Jam yang tersedia (Slot per jam).
3. **Pilih Psikolog**: Sistem akan menampilkan psikolog yang ahli di kategori tersebut DAN tersedia pada jadwal yang dipilih.
   - *Note*: Jika psikolog sibuk atau tidak ada jadwal, status akan muncul sebagai "Sibuk".
4. **Konfirmasi**:
   - Isi **Nama Samaran (Alias)** untuk privasi selama sesi.
   - Isi **Keluhan Singkat** (opsional).
   - Klik **Kirim Permintaan Booking**.

#### Menghadiri Sesi (Dashboard Client)
1. Buka **Dashboard**.
2. Lihat bagian **Jadwal Akan Datang**.
3. Jika status booking sudah **Disetujui (Approved)** dan waktu sesi telah tiba, tombol **Masuk Room** akan muncul.
4. Klik tombol tersebut untuk bergabung ke panggilan video.

---

### 🩺 Panduan untuk Psikolog (Expert)

#### Mengelola Permintaan (Dashboard)
1. Buka **Dashboard Psikolog**.
2. Lihat panel **Permintaan Masuk**.
3. Aksi:
   - ✅ **Setujui**: Booking akan masuk ke jadwal aktif.
   - ❌ **Tolak**: Anda wajib memberikan alasan penolakan. Booking akan dihapus dari antrean.

#### Mengatur Jadwal Praktik
1. Di Dashboard, cari panel **Atur Jadwal Availability**.
2. Centang hari praktik yang diinginkan (Senin - Minggu).
3. Tentukan **Jam Mulai** dan **Jam Selesai** untuk setiap hari aktif.
4. Klik **Simpan Perubahan**.
   - *Sistem otomatis menolak booking jika di luar jam praktik ini.*

#### Melakukan Sesi Konseling
1. Pada **Jadwal Akan Datang**, klik tombol **Masuk Room** (Video Call).
2. Setelah sesi selesai atau kedaluwarsa (1 jam setelah jadwal), sesi akan pindah ke **Riwayat**.
3. Klik kolom catatan pada riwayat untuk menambahkan **Catatan Sesi (Session Notes)**.

---

## 🛠️ Instalasi & Menjalankan Aplikasi

### Persyaratam
- Go (Golang) 1.20+
- Node.js 18+
- MySQL Database

### Langkah-langkah

1. **Database Setup**
   - Buat database MySQL.
   - Import file `backend/database/schema.sql`.

2. **Backend (Go)**
   ```bash
   cd backend
   go run .
   ```

3. **Frontend (Next.js)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Akses aplikasi di https://(IP Address):3000/*

## ⚠️ Catatan Teknis
- **WebRTC** memerlukan koneksi HTTPS amam atau localhost untuk akses kamera/mic.
