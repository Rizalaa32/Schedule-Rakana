# Backend API Standalone Schedule-Rakana (Tencent Cloud)

Layanan backend mandiri untuk sinkronisasi jadwal real-time ke semua perangkat (TV, PC, Tablet, HP).
**100% Terpisah & Tidak Mempengaruhi Web Lain di Server.**

---

## Cara Menjalankan di Server Tencent Cloud (2 Langkah Mudah)

### Langkah 1: Buat Folder & Salin File di Server
Di terminal server Tencent Cloud Anda:
```bash
# Buat folder khusus
mkdir -p /home/ubuntu/schedule-server
cd /home/ubuntu/schedule-server

# Salin file server.js dan ecosystem.config.js ke folder ini
```

### Langkah 2: Jalankan dengan PM2
```bash
# Jalankan service secara mandiri
pm2 start ecosystem.config.js

# Simpan agar otomatis hidup jika server restart
pm2 save
```

Periksa status:
```bash
pm2 status
```
Anda akan melihat 2 aplikasi berjalan berdampingan secara mandiri:
1. `riksauji-pjk3` (Web Foto - Port 3000)
2. `schedule-rakana` (Web Jadwal - Port 3001)

---

## Konfigurasi Firewall Tencent Cloud
Buka **Panel Tencent Cloud** -> **Lighthouse** -> **Firewall**:
* Tambahkan aturan baru (*Add Rule*):
  * **Protocol**: TCP
  * **Port**: `3001`
  * **Action**: Allow

Selesai! Alamat API server Anda siap digunakan:
`http://IP-SERVER-ANDA:3001`

