/**
 * Data Storage & Seed Management for Rakana PJK3
 * Provides offline persistence via localStorage with pre-filled realistic PJK3 data.
 */

const STORAGE_KEYS = {
  SCHEDULES: 'rakana_pjk3_schedules_v1',
  INSPECTORS: 'rakana_pjk3_inspectors_v1',
  SETTINGS: 'rakana_pjk3_settings_v1',
  AUTH: 'rakana_pjk3_auth_v1'
};

const K3_CATEGORIES = [
  { id: 'PUBT', name: 'Pesawat Uap & Bejana Tekan (PUBT)', icon: 'flame', color: 'amber' },
  { id: 'PAA', name: 'Pesawat Angkat & Angkut (PAA)', icon: 'forklift', color: 'blue' },
  { id: 'LISTRIK', name: 'Instalasi Listrik & Penyalur Petir', icon: 'zap', color: 'yellow' },
  { id: 'DAMKAR', name: 'Instalasi Proteksi Kebakaran', icon: 'shield-alert', color: 'rose' },
  { id: 'ELEVATOR', name: 'Elevator & Eskalator', icon: 'arrow-up-down', color: 'purple' },
  { id: 'PTP', name: 'Pesawat Tenaga & Produksi (PTP)', icon: 'cog', color: 'cyan' },
  { id: 'LINGKUNGAN', name: 'Pengujian Lingkungan Kerja', icon: 'activity', color: 'emerald' }
];

const INSPECTION_STATUSES = [
  { id: 'Terjadwal', label: 'Terjadwal', color: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  { id: 'Otw Lokasi', label: 'OTW Lokasi', color: 'yellow', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  { id: 'Sedang Riksa Uji', label: 'Sedang Riksa Uji', color: 'emerald', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', pulse: true },
  { id: 'Selesai Riksa', label: 'Selesai Riksa', color: 'gray', bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' },
  { id: 'Tertunda', label: 'Tertunda / Reschedule', color: 'rose', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' }
];

// Helper to get formatted YYYY-MM-DD relative to today
function getRelativeDate(dayOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get all dates for the current calendar week (Senin s/d Minggu)
function getThisWeekDates() {
  const d = new Date();
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const dayStr = String(cur.getDate()).padStart(2, '0');
    weekDates.push(`${y}-${m}-${dayStr}`);
  }
  return weekDates;
}

function isDateInThisWeek(dateString) {
  const weekDates = getThisWeekDates();
  return weekDates.includes(dateString);
}

const DEFAULT_SETTINGS = {
  pjk3Name: 'PT. RAKANA MITRA RIKSA',
  pjk3SubTitle: 'Layanan Riksa Uji K3 Kemnaker RI',
  pjk3RegNo: '-',
  adminPin: '1234',
  autoRotateIntervalSec: 15, // seconds per slide
  autoRotateEnabled: true,
  soundEnabled: true,
  theme: 'dark',
  runningText: '⛑️ UTAMAKAN KESELAMATAN & KESEHATAN KERJA • ZERO ACCIDENT IS OUR PRIORITY • PASTIKAN SELURUH OBJEK RIKSA MEMILIKI SUKET/SLO RESMI • LAPORAN TEPAT WAKTU, AUDIT KLIEN AMAN!',
  version: 2
};

const DEFAULT_INSPECTORS = [
  {
    id: 'ins-1',
    name: 'Ir. Bambang Sugiarto, S.T., M.T.',
    title: 'Ahli K3 Spesialis PUBT & PTP',
    badgeNo: 'SKP.421/NAKER/2023',
    phone: '0812-8899-7711',
    pendingReports: 2, // Has pending (2)
    oldestPendingDays: 4,
    completedThisMonth: 12,
    avatar: 'BS'
  },
  {
    id: 'ins-2',
    name: 'Hendra Gunawan, S.T.',
    title: 'Ahli K3 Spesialis Pesawat Angkat Angkut (PAA)',
    badgeNo: 'SKP.882/NAKER/2024',
    phone: '0813-1122-3344',
    pendingReports: 6, // High backlog (Red alert)
    oldestPendingDays: 14,
    completedThisMonth: 9,
    avatar: 'HG'
  },
  {
    id: 'ins-3',
    name: 'Dian Kusuma Wardhani, S.T.',
    title: 'Ahli K3 Spesialis Instalasi Listrik & Petir',
    badgeNo: 'SKP.109/NAKER/2023',
    phone: '0817-5544-2211',
    pendingReports: 1, // Has pending (1)
    oldestPendingDays: 2,
    completedThisMonth: 15,
    avatar: 'DK'
  },
  {
    id: 'ins-4',
    name: 'Rian Febrian, S.Tr.T.',
    title: 'Ahli K3 Spesialis Proteksi Kebakaran',
    badgeNo: 'SKP.550/NAKER/2024',
    phone: '0856-7890-1234',
    pendingReports: 4, // Medium backlog (Yellow alert)
    oldestPendingDays: 7,
    completedThisMonth: 8,
    avatar: 'RF'
  },
  {
    id: 'ins-5',
    name: 'Siti Nurhaliza, S.T.',
    title: 'Ahli K3 Spesialis Elevator & Eskalator',
    badgeNo: 'SKP.331/NAKER/2024',
    phone: '0819-2233-4455',
    pendingReports: 0, // Zero backlog (Bebas Tanggungan / Hijau)
    oldestPendingDays: 0,
    completedThisMonth: 11,
    avatar: 'SN'
  },
  {
    id: 'ins-6',
    name: 'Fajar Ramadhan, S.K.M.',
    title: 'Penguji K3 Lingkungan Kerja',
    badgeNo: 'SKP.776/NAKER/2023',
    phone: '0878-9900-1122',
    pendingReports: 3, // Medium backlog
    oldestPendingDays: 5,
    completedThisMonth: 7,
    avatar: 'FR'
  },
  {
    id: 'ins-7',
    name: 'Agus Setiawan, S.T.',
    title: 'Ahli K3 Spesialis Bejana Tekan & Tangki Timbun',
    badgeNo: 'SKP.902/NAKER/2024',
    phone: '0812-7711-2299',
    pendingReports: 0, // Zero backlog (Bebas Tanggungan / Hijau)
    oldestPendingDays: 0,
    completedThisMonth: 14,
    avatar: 'AS'
  }
];

function generateDefaultSchedules() {
  const week = getThisWeekDates();
  const monday = week[0];
  const tuesday = week[1];
  const wednesday = week[2];
  const thursday = week[3];
  const friday = week[4];
  const saturday = week[5];

  return [
    // Senin
    {
      id: 'sch-101',
      date: monday,
      time: '08:30',
      companyName: 'PT. Indofood CBP Sukses Makmur Tbk',
      address: 'Kawasan Industri MM2100 Blok C-2, Cikarang Barat, Bekasi',
      category: 'PUBT',
      equipmentName: 'Boiler Pipa Air Takuma 15 Ton/Jam (1 Unit) & Bejana Tekan (3 Unit)',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-1',
      inspectorName: 'Ir. Bambang Sugiarto, S.T., M.T.',
      companyPicName: 'Bpk. Ahmad Fauzi (HSE Mgr)',
      companyPicPhone: '0812-9876-5432',
      status: 'Sedang Riksa Uji',
      notes: 'Bawa UT Thickness Gauge, Safety Valve Test bench, dan sertifikat kalibrasi.'
    },
    {
      id: 'sch-102',
      date: monday,
      time: '09:00',
      companyName: 'PT. Astra Honda Motor (Plant 4)',
      address: 'Jl. Raya Pegangsaan Dua Km 2.2, Kelapa Gading, Jakarta Utara',
      category: 'PAA',
      equipmentName: 'Overhead Crane 10 Ton (2 Unit) & Forklift Toyota 3.5 Ton (4 Unit)',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-2',
      inspectorName: 'Hendra Gunawan, S.T.',
      companyPicName: 'Ibu Ratna Dewi (Dept. K3)',
      companyPicPhone: '0813-8765-4321',
      status: 'Otw Lokasi',
      notes: 'Load test beban 125% disediakan pihak klien. Wajib APD lengkap.'
    },
    {
      id: 'sch-103',
      date: monday,
      time: '13:00',
      companyName: 'PT. Kalbe Farma Tbk',
      address: 'Kawasan Industri Delta Silicon II, Lippo Cikarang',
      category: 'LISTRIK',
      equipmentName: 'Instalasi Penyalur Petir Radius Franklin (4 Pole) & Panel LVMDP Utama',
      inspectionType: 'Riksa Uji Pertama & Berkala',
      inspectorId: 'ins-3',
      inspectorName: 'Dian Kusuma Wardhani, S.T.',
      companyPicName: 'Bpk. Teguh Prasetyo',
      companyPicPhone: '0811-3456-7890',
      status: 'Terjadwal',
      notes: 'Pengukuran grounding earth tester dan thermography infrared panel.'
    },

    // Selasa
    {
      id: 'sch-201',
      date: tuesday,
      time: '08:30',
      companyName: 'PT. Mayora Indah Tbk',
      address: 'Jl. Telesonic, Jatake, Pasir Jaya, Jatiuwung, Tangerang',
      category: 'PUBT',
      equipmentName: 'Boiler Miura 3 Ton/Jam (2 Unit) & Receiver Tank',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-1',
      inspectorName: 'Ir. Bambang Sugiarto, S.T., M.T.',
      companyPicName: 'Bpk. Heri Siswanto (Plant Eng)',
      companyPicPhone: '0812-4455-6677',
      status: 'Terjadwal',
      notes: 'NDT Dye Penetrant Test pada nozel las utama.'
    },
    {
      id: 'sch-202',
      date: tuesday,
      time: '09:00',
      companyName: 'PT. Unilever Indonesia Tbk (Home Care Factory)',
      address: 'Kawasan Industri Jababeka V Blok U, Cikarang Timur',
      category: 'LINGKUNGAN',
      equipmentName: 'Pengujian Kebisingan, Iklim Kerja, Pencahayaan & Debu Total (15 Titik)',
      inspectionType: 'Pengujian Higiene Industri',
      inspectorId: 'ins-6',
      inspectorName: 'Fajar Ramadhan, S.K.M.',
      companyPicName: 'Ibu Annisa Pratiwi (EHS)',
      companyPicPhone: '0877-2233-4411',
      status: 'Terjadwal',
      notes: 'Sampling 8 jam kerja sesuai Permenaker No. 5 Tahun 2018.'
    },
    {
      id: 'sch-203',
      date: tuesday,
      time: '13:30',
      companyName: 'PT. United Tractors Tbk',
      address: 'Jl. Raya Bekasi Km. 22, Cakung, Jakarta Timur',
      category: 'DAMKAR',
      equipmentName: 'Instalasi Fire Alarm Addressable & Pompa Hydrant Diesel 1000 GPM',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-4',
      inspectorName: 'Rian Febrian, S.Tr.T.',
      companyPicName: 'Bpk. Kevin Ramli (Safety Officer)',
      companyPicPhone: '0852-1122-9988',
      status: 'Terjadwal',
      notes: 'Flow test nozzle hydrant pilar halaman & uji smoke detector gudang.'
    },

    // Rabu
    {
      id: 'sch-301',
      date: wednesday,
      time: '09:00',
      companyName: 'PT. Toyota Motor Manufacturing Indonesia',
      address: 'Kawasan Industri KIIC Lot DD-1, Karawang Barat',
      category: 'PTP',
      equipmentName: 'Mesin Press Stamping Komatsu 500 Ton (3 Unit) & Robot Welding',
      inspectionType: 'Riksa Uji Pertama',
      inspectorId: 'ins-1',
      inspectorName: 'Ir. Bambang Sugiarto, S.T., M.T.',
      companyPicName: 'Bpk. Bagus Wicaksono',
      companyPicPhone: '0815-9988-7766',
      status: 'Terjadwal',
      notes: 'Pemeriksaan safety guard sensor dan emergency stop system.'
    },
    {
      id: 'sch-302',
      date: wednesday,
      time: '13:00',
      companyName: 'Wisma Nusantara & Grand Hyatt',
      address: 'Jl. M.H. Thamrin No. 59, Menteng, Jakarta Pusat',
      category: 'ELEVATOR',
      equipmentName: 'Passenger Elevator Otis High Speed (6 Unit) & Escalator (2 Unit)',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-5',
      inspectorName: 'Siti Nurhaliza, S.T.',
      companyPicName: 'Bpk. Dedi Supriyadi (Chief Eng)',
      companyPicPhone: '0818-7788-9900',
      status: 'Terjadwal',
      notes: 'Uji governor safety gear & koordinasi building management.'
    },

    // Kamis
    {
      id: 'sch-401',
      date: thursday,
      time: '08:30',
      companyName: 'PT. Pertamina Gas (Operation West Java Area)',
      address: 'Stasiun Kompresor Gas Cilamaya, Karawang',
      category: 'PUBT',
      equipmentName: 'Gas Scrubber & Knock-out Drum Vessel Tekanan Tinggi',
      inspectionType: 'Riksa Uji Khusus',
      inspectorId: 'ins-7',
      inspectorName: 'Agus Setiawan, S.T.',
      companyPicName: 'Bpk. Irfan Maulana (Operation Spv)',
      companyPicPhone: '0811-9876-5432',
      status: 'Terjadwal',
      notes: 'Permit confined space dan hot work approval wajib sebelum riksa.'
    },
    {
      id: 'sch-402',
      date: thursday,
      time: '10:00',
      companyName: 'PT. Bridgestone Tire Indonesia',
      address: 'Jl. Raya Bekasi Km. 27, Harapan Jaya, Bekasi Utara',
      category: 'PAA',
      equipmentName: 'Gantry Crane 25 Ton & Reach Truck Nichiyu (3 Unit)',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-2',
      inspectorName: 'Hendra Gunawan, S.T.',
      companyPicName: 'Bpk. Joko Susilo (Maintenance Mgr)',
      companyPicPhone: '0813-2211-0099',
      status: 'Terjadwal',
      notes: 'Pemeriksaan tali kawat baja (wire rope), drum, dan rem hoist.'
    },

    // Jumat
    {
      id: 'sch-501',
      date: friday,
      time: '08:30',
      companyName: 'RS Pondok Indah - Puri Indah',
      address: 'Jl. Puri Indah Raya Blok S-2, Kembangan Selatan, Jakarta Barat',
      category: 'DAMKAR',
      equipmentName: 'Instalasi Hydrant Gedung, Sprinkler Otomatis & FM200 Server Room',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-4',
      inspectorName: 'Rian Febrian, S.Tr.T.',
      companyPicName: 'dr. Hendrawan (Ketua K3RS)',
      companyPicPhone: '0816-7788-9911',
      status: 'Terjadwal',
      notes: 'Pemeriksaan interlocking system FM200 dan pressure valve.'
    },
    {
      id: 'sch-502',
      date: friday,
      time: '13:30',
      companyName: 'PT. Sinar Sosro (Pabrik Cakung)',
      address: 'Jl. Raya Sultan Agung Km. 28, Medan Satria, Bekasi',
      category: 'LISTRIK',
      equipmentName: 'Transformator 2000 kVA, Cubicle 20 kV & Grounding Grid Gardu Induk',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-3',
      inspectorName: 'Dian Kusuma Wardhani, S.T.',
      companyPicName: 'Bpk. Arif Wibowo (Elektrikal)',
      companyPicPhone: '0812-6655-4433',
      status: 'Terjadwal',
      notes: 'Pengujian minyak trafo (breakdown voltage) dan uji relay proteksi.'
    },

    // Sabtu
    {
      id: 'sch-601',
      date: saturday,
      time: '09:00',
      companyName: 'PT. Santos Jaya Abadi (Kapal Api)',
      address: 'Jl. Surya Madya Kav. 1-28C, Surya Cipta City, Karawang',
      category: 'PUBT',
      equipmentName: 'Boiler Batubara 10 Ton & Tangki Udara Tekan Kompresor',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-1',
      inspectorName: 'Ir. Bambang Sugiarto, S.T., M.T.',
      companyPicName: 'Bpk. Danang Setyadi (HSE)',
      companyPicPhone: '0817-6655-1100',
      status: 'Terjadwal',
      notes: 'Hydrostatic test tekanan 1.5x design pressure.'
    }
  ];
}

class RakanaDB {
  static getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      // Auto-migrate old legacy name if stored in user's browser localStorage
      if (parsed.pjk3Name === 'PT. RAKANA INSPEKSI TEKNIK' || !parsed.version || parsed.version < 2) {
        parsed.pjk3Name = DEFAULT_SETTINGS.pjk3Name;
        parsed.pjk3SubTitle = DEFAULT_SETTINGS.pjk3SubTitle;
        parsed.pjk3RegNo = DEFAULT_SETTINGS.pjk3RegNo;
        parsed.version = 2;
        this.saveSettings(parsed);
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      console.error('Error reading settings:', e);
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Error saving settings:', e);
      return false;
    }
  }

  static getInspectors() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INSPECTORS);
      if (!data) {
        this.saveInspectors(DEFAULT_INSPECTORS);
        return DEFAULT_INSPECTORS;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveInspectors(DEFAULT_INSPECTORS);
        return DEFAULT_INSPECTORS;
      }
      // If user has old state where total backlog is 0 or empty, reload DEFAULT_INSPECTORS once
      const totalPending = parsed.reduce((sum, ins) => sum + (parseInt(ins.pendingReports) || 0), 0);
      if (totalPending === 0 && !localStorage.getItem('rakana_pjk3_inspectors_v2_synced')) {
        localStorage.setItem('rakana_pjk3_inspectors_v2_synced', 'true');
        this.saveInspectors(DEFAULT_INSPECTORS);
        return DEFAULT_INSPECTORS;
      }
      return parsed;
    } catch (e) {
      console.error('Error reading inspectors:', e);
      return DEFAULT_INSPECTORS;
    }
  }

  static saveInspectors(inspectors) {
    try {
      localStorage.setItem(STORAGE_KEYS.INSPECTORS, JSON.stringify(inspectors));
      return true;
    } catch (e) {
      console.error('Error saving inspectors:', e);
      return false;
    }
  }

  static getSchedules() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      if (!data) {
        const defaultSchedules = generateDefaultSchedules();
        this.saveSchedules(defaultSchedules);
        return defaultSchedules;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading schedules:', e);
      return generateDefaultSchedules();
    }
  }

  static saveSchedules(schedules) {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
      return true;
    } catch (e) {
      console.error('Error saving schedules:', e);
      return false;
    }
  }

  static resetToDemoData() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem(STORAGE_KEYS.INSPECTORS, JSON.stringify(DEFAULT_INSPECTORS));
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(generateDefaultSchedules()));
      localStorage.setItem('rakana_pjk3_inspectors_v2_synced', 'true');
      return true;
    } catch (e) {
      console.error('Error resetting demo data:', e);
      return false;
    }
  }

  static exportFullBackup() {
    return {
      appName: 'Schedule-Rakana PJK3',
      exportDate: new Date().toISOString(),
      settings: this.getSettings(),
      inspectors: this.getInspectors(),
      schedules: this.getSchedules()
    };
  }

  static importFullBackup(jsonData) {
    try {
      if (!jsonData.schedules || !jsonData.inspectors) {
        throw new Error('Format file backup tidak valid. Data schedule/inspector tidak ditemukan.');
      }
      if (jsonData.settings) this.saveSettings(jsonData.settings);
      this.saveInspectors(jsonData.inspectors);
      this.saveSchedules(jsonData.schedules);
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      throw e;
    }
  }
}

// Global export for vanilla js scripts
window.STORAGE_KEYS = STORAGE_KEYS;
window.K3_CATEGORIES = K3_CATEGORIES;
window.INSPECTION_STATUSES = INSPECTION_STATUSES;
window.RakanaDB = RakanaDB;
window.getRelativeDate = getRelativeDate;
window.getThisWeekDates = getThisWeekDates;
window.isDateInThisWeek = isDateInThisWeek;
