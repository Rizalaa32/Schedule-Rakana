# ⛑️ Rakana PJK3 - Riksa Uji Schedule & Report Backlog TV Dashboard

Sistem Informasi Dashboard Jadwal Pemeriksaan & Pengujian K3 (Riksa Uji) serta Monitoring Backlog Laporan Ahli K3 untuk Perusahaan Jasa Keselamatan & Kesehatan Kerja (**PJK3**).

Aplikasi web berbasis **Pure Frontend (HTML5, Tailwind CSS, Vanilla JS)** ini dirancang khusus untuk monitor HDMI TV kantor / display ruang operasional dengan konsep **Zero Scroll (1 Screen Static Viewport)** dan sistem rotasi 2 slide otomatis.

![Dashboard Preview](https://img.shields.io/badge/PJK3-Kemnaker_RI-06B6D4?style=for-the-badge)
![Zero Scroll](https://img.shields.io/badge/Layout-Zero_Scroll_1_Screen-10B981?style=for-the-badge)
![Weekly Board](https://img.shields.io/badge/Display-6_Day_Calendar_Board-F59E0B?style=for-the-badge)

---

## 🌟 Desain Zero-Scroll TV (Tanpa Scroll, 1 Layar Penuh)

Monitor TV di kantor bersifat statis dan dilihat dari kejauhan tanpa mouse. Seluruh antarmuka ini didesain mengunci viewport (`overflow: hidden; 100vh`) sehingga **tidak memerlukan scroll sama sekali**.

### 📋 SLIDE 1: Papan Kalender 1 Minggu (Senin s/d Sabtu) dalam 1 Layar
* **Tata Letak 6 Kolom Hari (Senin – Sabtu)**:
  * Kolom 1: **SENIN** (Tanggal)
  * Kolom 2: **SELASA** (Tanggal)
  * Kolom 3: **RABU** (Tanggal)
  * Kolom 4: **KAMIS** (Tanggal)
  * Kolom 5: **JUMAT** (Tanggal)
  * Kolom 6: **SABTU** (Tanggal)
* **Penanda Hari Ini (Today Highlight)**: Kolom untuk hari ini otomatis ditandai dengan aksen gradient cyan terang, badge `HARI INI`, dan efek glow.
* **Informasi Lengkap Tanpa Scroll**:
  * Nama Perusahaan (Teks putih tebal kontras tinggi).
  * Bidang K3 (PUBT, PAA, Listrik & Petir, Damkar, Elevator, PTP, Lingkungan Kerja) & Jam riksa.
  * Objek / Alat Uji K3 & Ahli K3 bertugas.
  * **Kotak Kontak PIC Klien (Emerald Box)**: Nama PIC, **Nomor HP PIC berukuran besar (`📞 0812-xxxx-xxxx`)**, serta tombol WhatsApp.
  * Status terkini (*Sedang Riksa*, *OTW Lokasi*, *Terjadwal*, *Selesai*).
  * Hari tanpa kunjungan lapangan otomatis menampilkan status *Standby di Kantor / Review LHPP*.

---

### 🚨 SLIDE 2: Monitoring Tanggungan Laporan Ahli K3 dalam 1 Layar
* **Top Metric Badges**: Total Dokumen Belum Terbit, Jumlah Ahli K3 Kritis (>5 Lap), dan Jumlah Ahli K3 Bebas Tanggungan.
* **Pemisahan 2 Sisi Layar (Zero Scroll)**:
  * **Sisi Kiri**: Ahli K3 yang memiliki tanggungan laporan (LHPP):
    * 🔴 **Kritis (>5 Laporan)**: Indikator merah pulsing, alert `🚨 KRITIS (>5)`, usia laporan tertua (hari).
    * 🟡 **Perhatian (3–5 Laporan)**: Indikator kuning `⚠️ PERHATIAN`.
    * 🔵 **Dalam Proses (1–2 Laporan)**: Indikator biru `⏳ DALAM PROSES`.
  * **Sisi Kanan**: Ahli K3 yang bebas tanggungan (0 laporan tertunda) dengan apresiasi `🏆 NIHIL BACKLOG • Tertib Administrasi`.

---

### ⏱️ Pengendali Rotasi Otomatis (Slide Controller)
* **Progress Bar Countdown**: Garis progress bar animasi di bagian atas yang berjalan selama **15 detik** sebelum otomatis berganti slide.
* **Kontrol Fleksibel**:
  * Tombol tab langsung: `[1] Jadwal 1 Minggu` dan `[2] Tanggungan Ahli K3`.
  * Tombol navigasi `<` (Sebelumnya) dan `>` (Berikutnya).
  * Tombol **Jeda / Lanjutkan Rotasi** (`⏸` / `▶`) atau cukup tekan tombol **Spasi**.

---

## 📱 Ekspor WhatsApp 1-Klik
* Tekan tombol **"Format WA"** (atau tekan tombol <kbd>W</kbd>) untuk membuka modal pratinjau pesan WhatsApp siap kirim.
* Pilihan template:
  1. **Jadwal 1 Minggu (Senin – Sabtu)**: Rekap seluruh jadwal minggu ini per hari dengan nomor PIC untuk broadcast awal pekan.
  2. **Jadwal Hari Ini**: Format ringkas hari ini.
  3. **Preview Besok**: Agenda esok hari.
  4. **Rekap Tanggungan Ahli K3**: Laporan backlog untuk rapat koordinasi.
  5. **Ringkasan Singkat (Executive Brief)**.

---

## ⌨️ Pintasan Keyboard TV

| Tombol | Fungsi |
| :---: | :--- |
| <kbd>1</kbd> | Langsung ke **Slide 1: Jadwal 1 Minggu (Senin – Sabtu)** |
| <kbd>2</kbd> | Langsung ke **Slide 2: Tanggungan Ahli K3** |
| <kbd>Spasi</kbd> | Jeda / Lanjutkan rotasi otomatis slide |
| <kbd>→</kbd> / <kbd>←</kbd> | Ganti ke slide berikutnya / sebelumnya |
| <kbd>F</kbd> | Layar Penuh TV (Fullscreen Mode) |
| <kbd>W</kbd> | Buka Modal Ekspor WhatsApp |
| <kbd>A</kbd> | Buka Panel Admin (PIN: `1234`) |
| <kbd>T</kbd> | Toggle Tema Gelap / Terang (Dark/Light) |
| <kbd>Esc</kbd> | Tutup Modal Aktif |

---

## 🚀 Cara Menjalankan

Cukup klik ganda file [index.html](file:///c:/Users/rizal/Antigravity_Project/Schedule-Rakana/Schedule-Rakana/index.html) di browser Google Chrome / Microsoft Edge. Tampilan 6 kolom hari dalam 1 layar tanpa scroll langsung aktif.
