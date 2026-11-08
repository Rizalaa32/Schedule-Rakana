/**
 * Schedule-Rakana Standalone Cloud API Server
 * 100% Zero-Dependency Node.js Microservice
 * 
 * Runs independently on Tencent Cloud Lighthouse via PM2:
 *   pm2 start server.js --name schedule-rakana
 * 
 * Port: 3001 (Configurable via PORT environment variable)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'schedule_database.json');
const BACKUP_FILE = path.join(DATA_DIR, 'schedule_database.bak.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default seed (Senin, 09 November 2026)
function getInitialSeed() {
  return {
    version: 5,
    lastUpdated: new Date().toISOString(),
    settings: {
      pjk3Name: 'PT. RAKANA MITRA RIKSA',
      pjk3SubTitle: 'PJK3 Bidang Pemeriksaan & Pengujian K3 Kemnaker RI',
      pjk3RegNo: 'SKP No: 560/124/PJK3/IX/2024',
      adminPin: '1234',
      autoRotateIntervalSec: 15,
      soundEnabled: true,
      theme: 'dark',
      runningText: '⛑️ UTAMAKAN KESELAMATAN & KESEHATAN KERJA • ZERO ACCIDENT IS OUR PRIORITY • PASTIKAN SELURUH OBJEK RIKSA MEMILIKI SUKET/SLO RESMI • LAPORAN TEPAT WAKTU, AUDIT KLIEN AMAN!'
    },
    inspectors: [
      { id: 'ins-1', name: 'Ubaid Choiri Ramadhan', title: 'Ahli K3 Spesialis Pesawat Angkat & Angkut (PAA)', badgeNo: 'SKP.421/NAKER/2024', phone: '0858-7766-3421', pendingReports: 0, oldestPendingDays: 0, completedThisMonth: 12, avatar: 'UC' },
      { id: 'ins-2', name: 'Daru Catur Wicaksono, A. Md', title: 'Ahli K3 Spesialis Pesawat Tenaga & Produksi (PTP)', badgeNo: 'SKP.882/NAKER/2024', phone: '0813-1122-3344', pendingReports: 0, oldestPendingDays: 0, completedThisMonth: 10, avatar: 'DC' },
      { id: 'ins-3', name: 'Ir. Bambang Sugiarto, S.T., M.T.', title: 'Ahli K3 Spesialis PUBT & Bejana Tekan', badgeNo: 'SKP.109/NAKER/2024', phone: '0812-8899-7711', pendingReports: 0, oldestPendingDays: 0, completedThisMonth: 14, avatar: 'BS' },
      { id: 'ins-4', name: 'Dian Kusuma Wardhani, S.T.', title: 'Ahli K3 Spesialis Instalasi Listrik & Penyalur Petir', badgeNo: 'SKP.550/NAKER/2024', phone: '0817-5544-2211', pendingReports: 0, oldestPendingDays: 0, completedThisMonth: 9, avatar: 'DK' },
      { id: 'ins-5', name: 'Hendra Gunawan, S.T.', title: 'Ahli K3 Spesialis Proteksi Kebakaran (Damkar)', badgeNo: 'SKP.331/NAKER/2024', phone: '0819-2233-4455', pendingReports: 0, oldestPendingDays: 0, completedThisMonth: 11, avatar: 'HG' },
      { id: 'ins-6', name: 'MOH. HUDA', title: 'Ahli K3 Spesialis Instalasi Listrik & Penanggulangan Kebakaran', badgeNo: 'SKP.512/NAKER/2024', phone: '0812-3456-7890', pendingReports: 0, oldestPendingDays: 0, completedThisMonth: 8, avatar: 'MH' }
    ],
    schedules: [
      { id: 'sch-senin-1', date: '2026-11-09', time: '08:30', companyName: 'PT. Sadhana', address: 'Jl. Raya Surabaya-Malang, Km 59 (Raya Purwosari), Kabupaten Pasuruan', category: 'PAA', equipmentName: 'Forklift (? Unit)', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-1', inspectorName: 'Ubaid Choiri Ramadhan', companyPicName: 'Made', companyPicPhone: '085877663421', status: 'Sedang Riksa Uji', notes: 'Riksa uji unit forklift di pabrik Purwosari.' },
      { id: 'sch-senin-2', date: '2026-11-09', time: '13:00', companyName: 'PT. Delta Surya Textille', address: 'Jl. Lingkar AMD Ds Purwodadi, PO Box 7, Purwodadi, Kab. Pasuruan', category: 'PTP', equipmentName: 'Screw Compressor', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-2', inspectorName: 'Daru Catur Wicaksono, A. Md', companyPicName: 'Sri', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa uji kompresor screw.' },
      { id: 'sch-senin-3', date: '2026-11-09', time: '13:00', companyName: 'PT. Delta Surya Textille', address: 'Jl. Lingkar AMD Ds Purwodadi, PO Box 7, Purwodadi, Kab. Pasuruan', category: 'PUBT', equipmentName: 'Air Receiver Tank', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-1', inspectorName: 'Ubaid Choiri Ramadhan', companyPicName: 'Sri', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa uji bejana tekan tangki udara.' },
      { id: 'sch-senin-4', date: '2026-11-09', time: '13:00', companyName: 'PT. Delta Surya Textille', address: 'Jl. Lingkar AMD Ds Purwodadi, PO Box 7, Purwodadi, Kab. Pasuruan', category: 'PAA', equipmentName: 'Forklift (2)', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-1', inspectorName: 'Ubaid Choiri Ramadhan', companyPicName: 'Sri', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa uji 2 unit forklift.' },
      { id: 'sch-senin-5', date: '2026-11-09', time: '13:00', companyName: 'PT. Delta Surya Textille', address: 'Jl. Lingkar AMD Ds Purwodadi, PO Box 7, Purwodadi, Kab. Pasuruan', category: 'LISTRIK', equipmentName: 'Pemanfaatan Listrik', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-2', inspectorName: 'Daru Catur Wicaksono, A. Md', companyPicName: 'Sri', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa instalasi pemanfaatan tenaga listrik.' },
      { id: 'sch-ati-gempol', date: '2026-11-09', time: '08:30', companyName: 'PT. ATI GEMPOL', address: '-', category: 'LISTRIK', equipmentName: 'LISTRIK , PETIR, KOMPRESSOR', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-6', inspectorName: 'MOH. HUDA', companyPicName: 'BU TITIN', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa uji instalasi listrik, petir, dan kompressor.' },
      { id: 'sch-basecamp-padel', date: '2026-11-09', time: '13:30', companyName: 'CV BASECAMP PADEL', address: '9MQP+JGH, Damean, Kepulungan, Kec. Gempol, Pasuruan, Jawa Timur', category: 'DAMKAR', equipmentName: 'APAR', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-6', inspectorName: 'MOH. HUDA', companyPicName: 'BU RISMA', companyPicPhone: '+62 878-8545-6085', status: 'Terjadwal', notes: 'Riksa uji proteksi kebakaran APAR.' },
      { id: 'sch-niramas-senin', date: '2026-11-09', time: '14:30', companyName: 'PT. NIRAMAS', address: '-', category: 'DAMKAR', equipmentName: 'HYDRANT', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-6', inspectorName: 'MOH. HUDA', companyPicName: 'PAK SOFYAN', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa uji instalasi hydrant pabrik.' },
      { id: 'sch-malidas-sterilindo', date: '2026-11-10', time: '09:00', companyName: 'PT. MALIDAS STERILINDO (BELUM FIKS)', address: 'Jl. Kidemang Singomenggolo No. 22, Sidomulyo, Kec. Buduran, Sidoarjo', category: 'PAA', equipmentName: 'PETIR (6), GENSET, LISTRIK, HOIST, LIFT BARANG, FORKLIFT (2), REACH TRUCK', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-1', inspectorName: 'Ubaid Choiri Ramadhan', companyPicName: 'IBU NADIA', companyPicPhone: '+62 813-3514-5475', status: 'Terjadwal', notes: 'Jadwal belum fiks - konfirmasi ulang dengan Ibu Nadia.' },
      { id: 'sch-rabu-1', date: '2026-11-11', time: '08:30', companyName: 'PT. Iseki Indonesia', address: 'Jalan Kraton Industri Raya No. 11 - 11A, Kawasan Industri PIER, Pasuruan', category: 'PAA', equipmentName: 'OHTC (6), E. Towing, Reach Stacker (2), Hand Pallet (2), Chain Hoist', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-1', inspectorName: 'Ubaid Choiri Ramadhan', companyPicName: 'Yuli', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa uji rangkaian pesawat angkat dan angkut.' },
      { id: 'sch-kamis-1', date: '2026-11-12', time: '08:30', companyName: 'PT. Hakiki Donarta', address: 'Jl. Kemirisewu RT. 01 RW. 03, Desa Kemirisewu, Kec. Pandaan, Pasuruan', category: 'PUBT', equipmentName: 'Boiler & Bejana Tekan', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-1', inspectorName: 'Ubaid Choiri Ramadhan', companyPicName: 'Yoyok', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa uji PUBT.' },
      { id: 'sch-kamis-2', date: '2026-11-12', time: '08:30', companyName: 'PT. Landkrone', address: 'Dusun Wonogriyo, Desa Sumbersuko, Kecamatan Gempol, Pasuruan', category: 'PTP', equipmentName: 'Mesin Produksi & Genset', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-2', inspectorName: 'Daru Catur Wicaksono, A. Md', companyPicName: 'Yoyok', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa uji PTP.' },
      { id: 'sch-kamis-3', date: '2026-11-12', time: '08:30', companyName: 'PT. Niramas', address: 'Jl. Gunung Gangsir No. 13 (Jl. Randupitu-Gunung Gangsir), Beji, Pasuruan', category: 'PAA', equipmentName: 'Forklift & Overhead Crane', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-1', inspectorName: 'Ubaid Choiri Ramadhan', companyPicName: 'Sofyan', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa uji PAA.' },
      { id: 'sch-indofood-kamis', date: '2026-11-12', time: '08:30', companyName: 'PT. INDOFOOD', address: '-', category: 'PUBT', equipmentName: 'BOILER', inspectionType: 'Riksa Uji Berkala', inspectorId: 'ins-2', inspectorName: 'Daru Catur Wicaksono, A. Md', companyPicName: 'PAK RUDY', companyPicPhone: '-', status: 'Terjadwal', notes: 'Riksa uji ketel uap boiler.' }
    ]
  };
}

// Read database from file with fallback
function readDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data && data.schedules) return data;
    }
  } catch (err) {
    console.error('[DB READ ERROR]', err.message);
  }
  const seed = getInitialSeed();
  saveDatabase(seed);
  return seed;
}

// Atomic save database to file + backup
function saveDatabase(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    const jsonStr = JSON.stringify(data, null, 2);
    
    // Backup previous valid file
    if (fs.existsSync(DB_FILE)) {
      try {
        fs.copyFileSync(DB_FILE, BACKUP_FILE);
      } catch (e) {}
    }

    const tmpFile = DB_FILE + '.tmp';
    fs.writeFileSync(tmpFile, jsonStr, 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('[DB WRITE ERROR]', err.message);
    return false;
  }
}

// Merge incoming data safely (Anti-Reset)
function mergeData(incoming) {
  const current = readDatabase();
  
  if (incoming.settings) {
    current.settings = { ...current.settings, ...incoming.settings };
  }

  if (Array.isArray(incoming.inspectors) && incoming.inspectors.length > 0) {
    current.inspectors = incoming.inspectors;
  }

  if (Array.isArray(incoming.schedules)) {
    // If client sent schedules, protect against accidental empty array wipeout
    if (incoming.schedules.length > 0) {
      current.schedules = incoming.schedules;
    }
  }

  saveDatabase(current);
  return current;
}

// Request Handler
const server = http.createServer((req, res) => {
  // CORS Headers - Allow cross-origin requests from GitHub Pages and anywhere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Health check & Info
  if (pathname === '/' || pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Schedule-Rakana Cloud Sync API',
      version: '1.0.0',
      port: PORT,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. GET /api/schedule/data -> Fetch full shared schedule database
  if (req.method === 'GET' && (pathname === '/api/schedule/data' || pathname === '/api/schedules')) {
    const db = readDatabase();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify(db));
    return;
  }

  // 3. POST /api/schedule/data -> Save / Update shared schedule database
  if (req.method === 'POST' && (pathname === '/api/schedule/data' || pathname === '/api/schedules')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Protection against massive payload (> 10MB)
      if (body.length > 10 * 1024 * 1024) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload || (!payload.schedules && !payload.inspectors && !payload.settings)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid payload structure' }));
          return;
        }

        const updated = mergeData(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Data berhasil disinkronkan ke server cloud Tencent!',
          lastUpdated: updated.lastUpdated
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Bad JSON: ' + err.message }));
      }
    });
    return;
  }

  // 404 Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan', path: pathname }));
});

// Initialize DB file on startup
readDatabase();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` Schedule-Rakana Standalone Cloud API`);
  console.log(` Port: ${PORT}`);
  console.log(` Status: Siap Melayani Sinkronisasi Real-Time`);
  console.log(` Database: ${DB_FILE}`);
  console.log(`====================================================`);
});

