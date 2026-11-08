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

// Helper to get all dates for a calendar week (weekOffset: 0 = this week, 1 = next week, -1 = last week)
function getWeekDates(weekOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + (weekOffset * 7));
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

function getThisWeekDates() {
  return getWeekDates(0);
}

function getNextWeekDates() {
  return getWeekDates(1);
}

// Determines the active work week:
// Intelligently detects whether this week (getThisWeekDates) or next week (getNextWeekDates) has active schedules,
// and defaults to the upcoming week on weekends (Fri/Sat/Sun).
function getActiveWorkWeekDates() {
  const thisWeek = getThisWeekDates();
  const nextWeek = getNextWeekDates();

  let schedules = [];
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('rakana_pjk3_schedules');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) schedules = parsed;
      }
    }
  } catch (e) {
    schedules = [];
  }

  const countThisWeek = schedules.filter(s => thisWeek.includes(s.date)).length;
  const countNextWeek = schedules.filter(s => nextWeek.includes(s.date)).length;

  const d = new Date();
  const day = d.getDay();

  // If next week has schedules and this week has none, prioritize next week
  if (countNextWeek > 0 && countThisWeek === 0) {
    return nextWeek;
  }

  // On Friday (5), Saturday (6), or Sunday (0), prioritize upcoming work week
  if (day === 5 || day === 6 || day === 0) {
    return (countNextWeek > 0 || countThisWeek === 0) ? nextWeek : thisWeek;
  }

  // Monday through Thursday
  if (countThisWeek > 0) return thisWeek;
  if (countNextWeek > 0) return nextWeek;

  return thisWeek;
}

function isDateInThisWeek(dateString) {
  const weekDates = getActiveWorkWeekDates();
  return weekDates.includes(dateString);
}

const DEFAULT_SETTINGS = {
  pjk3Name: 'PT. RAKANA MITRA RIKSA',
  pjk3SubTitle: 'PJK3 Bidang Pemeriksaan & Pengujian K3 Kemnaker RI',
  pjk3RegNo: 'SKP No: 560/124/PJK3/IX/2024',
  adminPin: '1234',
  autoRotateIntervalSec: 15, // seconds per slide
  autoRotateEnabled: true,
  soundEnabled: true,
  theme: 'dark',
  runningText: '⛑️ UTAMAKAN KESELAMATAN & KESEHATAN KERJA • ZERO ACCIDENT IS OUR PRIORITY • PASTIKAN SELURUH OBJEK RIKSA MEMILIKI SUKET/SLO RESMI • LAPORAN TEPAT WAKTU, AUDIT KLIEN AMAN!',
  version: 5
};

const DEFAULT_INSPECTORS = [
  {
    id: 'ins-1',
    name: 'Ubaid Choiri Ramadhan',
    title: 'Ahli K3 Spesialis Pesawat Angkat & Angkut (PAA)',
    badgeNo: 'SKP.421/NAKER/2024',
    phone: '0858-7766-3421',
    pendingReports: 0,
    oldestPendingDays: 0,
    completedThisMonth: 12,
    avatar: 'UC'
  },
  {
    id: 'ins-2',
    name: 'Daru Catur Wicaksono, A. Md',
    title: 'Ahli K3 Spesialis Pesawat Tenaga & Produksi (PTP)',
    badgeNo: 'SKP.882/NAKER/2024',
    phone: '0813-1122-3344',
    pendingReports: 0,
    oldestPendingDays: 0,
    completedThisMonth: 10,
    avatar: 'DC'
  },
  {
    id: 'ins-3',
    name: 'Ir. Bambang Sugiarto, S.T., M.T.',
    title: 'Ahli K3 Spesialis PUBT & Bejana Tekan',
    badgeNo: 'SKP.109/NAKER/2024',
    phone: '0812-8899-7711',
    pendingReports: 0,
    oldestPendingDays: 0,
    completedThisMonth: 14,
    avatar: 'BS'
  },
  {
    id: 'ins-4',
    name: 'Dian Kusuma Wardhani, S.T.',
    title: 'Ahli K3 Spesialis Instalasi Listrik & Penyalur Petir',
    badgeNo: 'SKP.550/NAKER/2024',
    phone: '0817-5544-2211',
    pendingReports: 0,
    oldestPendingDays: 0,
    completedThisMonth: 9,
    avatar: 'DK'
  },
  {
    id: 'ins-5',
    name: 'Hendra Gunawan, S.T.',
    title: 'Ahli K3 Spesialis Proteksi Kebakaran (Damkar)',
    badgeNo: 'SKP.331/NAKER/2024',
    phone: '0819-2233-4455',
    pendingReports: 0,
    oldestPendingDays: 0,
    completedThisMonth: 11,
    avatar: 'HG'
  },
  {
    id: 'ins-6',
    name: 'MOH. HUDA',
    title: 'Ahli K3 Spesialis Instalasi Listrik & Penanggulangan Kebakaran',
    badgeNo: 'SKP.512/NAKER/2024',
    phone: '0812-3456-7890',
    pendingReports: 0,
    oldestPendingDays: 0,
    completedThisMonth: 8,
    avatar: 'MH'
  }
];

function generateDefaultSchedules() {
  const week = getActiveWorkWeekDates();
  const monday = week[0];   // 2026-11-09
  const tuesday = week[1];  // 2026-11-10
  const wednesday = week[2];// 2026-11-11
  const thursday = week[3]; // 2026-11-12
  const friday = week[4];   // 2026-11-13
  const saturday = week[5]; // 2026-11-14

  return [
    // SENIN 09 Nov
    {
      id: 'sch-senin-1',
      date: monday,
      time: '08:30',
      companyName: 'PT. Sadhana',
      address: 'Jl. Raya Surabaya-Malang, Km 59 (Raya Purwosari), Kabupaten Pasuruan',
      category: 'PAA',
      equipmentName: 'Forklift (? Unit)',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-1',
      inspectorName: 'Ubaid Choiri Ramadhan',
      companyPicName: 'Made',
      companyPicPhone: '085877663421',
      status: 'Sedang Riksa Uji',
      notes: 'Riksa uji unit forklift di pabrik Purwosari.'
    },
    {
      id: 'sch-senin-2',
      date: monday,
      time: '13:00',
      companyName: 'PT. Delta Surya Textille',
      address: 'Jl. Lingkar AMD Ds Purwodadi, PO Box 7, Purwodadi, Kab. Pasuruan',
      category: 'PTP',
      equipmentName: 'Screw Compressor',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-2',
      inspectorName: 'Daru Catur Wicaksono, A. Md',
      companyPicName: 'Sri',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa uji kompresor screw.'
    },
    {
      id: 'sch-senin-3',
      date: monday,
      time: '13:00',
      companyName: 'PT. Delta Surya Textille',
      address: 'Jl. Lingkar AMD Ds Purwodadi, PO Box 7, Purwodadi, Kab. Pasuruan',
      category: 'PUBT',
      equipmentName: 'Air Receiver Tank',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-1',
      inspectorName: 'Ubaid Choiri Ramadhan',
      companyPicName: 'Sri',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa uji bejana tekan tangki udara.'
    },
    {
      id: 'sch-senin-4',
      date: monday,
      time: '13:00',
      companyName: 'PT. Delta Surya Textille',
      address: 'Jl. Lingkar AMD Ds Purwodadi, PO Box 7, Purwodadi, Kab. Pasuruan',
      category: 'PAA',
      equipmentName: 'Forklift (2)',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-1',
      inspectorName: 'Ubaid Choiri Ramadhan',
      companyPicName: 'Sri',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa uji 2 unit forklift.'
    },
    {
      id: 'sch-senin-5',
      date: monday,
      time: '13:00',
      companyName: 'PT. Delta Surya Textille',
      address: 'Jl. Lingkar AMD Ds Purwodadi, PO Box 7, Purwodadi, Kab. Pasuruan',
      category: 'LISTRIK',
      equipmentName: 'Pemanfaatan Listrik',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-2',
      inspectorName: 'Daru Catur Wicaksono, A. Md',
      companyPicName: 'Sri',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa instalasi pemanfaatan tenaga listrik.'
    },
    {
      id: 'sch-ati-gempol',
      date: monday,
      time: '08:30',
      companyName: 'PT. ATI GEMPOL',
      address: '-',
      category: 'LISTRIK',
      equipmentName: 'LISTRIK , PETIR, KOMPRESSOR',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-6',
      inspectorName: 'MOH. HUDA',
      companyPicName: 'BU TITIN',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa uji instalasi listrik, petir, dan kompressor.'
    },
    {
      id: 'sch-basecamp-padel',
      date: monday,
      time: '13:30',
      companyName: 'CV BASECAMP PADEL',
      address: '9MQP+JGH, Damean, Kepulungan, Kec. Gempol, Pasuruan, Jawa Timur',
      category: 'DAMKAR',
      equipmentName: 'APAR',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-6',
      inspectorName: 'MOH. HUDA',
      companyPicName: 'BU RISMA',
      companyPicPhone: '+62 878-8545-6085',
      status: 'Terjadwal',
      notes: 'Riksa uji proteksi kebakaran APAR.'
    },
    {
      id: 'sch-niramas-senin',
      date: monday,
      time: '14:30',
      companyName: 'PT. NIRAMAS',
      address: '-',
      category: 'DAMKAR',
      equipmentName: 'HYDRANT',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-6',
      inspectorName: 'MOH. HUDA',
      companyPicName: 'PAK SOFYAN',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa uji instalasi hydrant pabrik.'
    },

    // SELASA 10 Nov
    {
      id: 'sch-malidas-sterilindo',
      date: tuesday,
      time: '09:00',
      companyName: 'PT. MALIDAS STERILINDO (BELUM FIKS)',
      address: 'Jl. Kidemang Singomenggolo No. 22, Sidomulyo, Kec. Buduran, Sidoarjo',
      category: 'PAA',
      equipmentName: 'PETIR (6), GENSET, LISTRIK, HOIST, LIFT BARANG, FORKLIFT (2), REACH TRUCK',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-1',
      inspectorName: 'Ubaid Choiri Ramadhan',
      companyPicName: 'IBU NADIA',
      companyPicPhone: '+62 813-3514-5475',
      status: 'Terjadwal',
      notes: 'Jadwal belum fiks - konfirmasi ulang dengan Ibu Nadia.'
    },

    // RABU 11 Nov
    {
      id: 'sch-rabu-1',
      date: wednesday,
      time: '08:30',
      companyName: 'PT. Iseki Indonesia',
      address: 'Jalan Kraton Industri Raya No. 11 - 11A, Kawasan Industri PIER, Pasuruan',
      category: 'PAA',
      equipmentName: 'OHTC (6), E. Towing, Reach Stacker (2), Hand Pallet (2), Chain Hoist',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-1',
      inspectorName: 'Ubaid Choiri Ramadhan',
      companyPicName: 'Yuli',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa uji rangkaian pesawat angkat dan angkut.'
    },

    // KAMIS 12 Nov
    {
      id: 'sch-kamis-1',
      date: thursday,
      time: '08:30',
      companyName: 'PT. Hakiki Donarta',
      address: 'Jl. Kemirisewu RT. 01 RW. 03, Desa Kemirisewu, Kec. Pandaan, Pasuruan',
      category: 'PUBT',
      equipmentName: 'Boiler & Bejana Tekan',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-1',
      inspectorName: 'Ubaid Choiri Ramadhan',
      companyPicName: 'Yoyok',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa uji PUBT.'
    },
    {
      id: 'sch-kamis-2',
      date: thursday,
      time: '08:30',
      companyName: 'PT. Landkrone',
      address: 'Dusun Wonogriyo, Desa Sumbersuko, Kecamatan Gempol, Pasuruan',
      category: 'PTP',
      equipmentName: 'Mesin Produksi & Genset',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-2',
      inspectorName: 'Daru Catur Wicaksono, A. Md',
      companyPicName: 'Yoyok',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa uji PTP.'
    },
    {
      id: 'sch-kamis-3',
      date: thursday,
      time: '08:30',
      companyName: 'PT. Niramas',
      address: 'Jl. Gunung Gangsir No. 13 (Jl. Randupitu-Gunung Gangsir), Beji, Pasuruan',
      category: 'PAA',
      equipmentName: 'Forklift & Overhead Crane',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-1',
      inspectorName: 'Ubaid Choiri Ramadhan',
      companyPicName: 'Sofyan',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa uji PAA.'
    },
    {
      id: 'sch-indofood-kamis',
      date: thursday,
      time: '08:30',
      companyName: 'PT. INDOFOOD',
      address: '-',
      category: 'PUBT',
      equipmentName: 'BOILER',
      inspectionType: 'Riksa Uji Berkala',
      inspectorId: 'ins-2',
      inspectorName: 'Daru Catur Wicaksono, A. Md',
      companyPicName: 'PAK RUDY',
      companyPicPhone: '-',
      status: 'Terjadwal',
      notes: 'Riksa uji ketel uap boiler.'
    }
  ];
}

class RakanaDB {
  static getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      // Auto-migrate old legacy name & upgrade to version 3
      if (parsed.pjk3Name === 'PT. RAKANA INSPEKSI TEKNIK' || !parsed.version || parsed.version < 3) {
        parsed.pjk3Name = DEFAULT_SETTINGS.pjk3Name;
        parsed.pjk3SubTitle = DEFAULT_SETTINGS.pjk3SubTitle;
        parsed.pjk3RegNo = DEFAULT_SETTINGS.pjk3RegNo;
        parsed.version = 3;
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
      const isSyncedV4 = localStorage.getItem('rakana_pjk3_v4_inspectors') === 'true';

      if (!data || !isSyncedV4) {
        this.saveInspectors(DEFAULT_INSPECTORS);
        localStorage.setItem('rakana_pjk3_v4_inspectors', 'true');
        return DEFAULT_INSPECTORS;
      }

      let parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveInspectors(DEFAULT_INSPECTORS);
        return DEFAULT_INSPECTORS;
      }

      // Ensure MOH. HUDA is included
      if (!parsed.some(ins => ins.name && ins.name.toUpperCase().includes('HUDA'))) {
        parsed.push({
          id: 'ins-6',
          name: 'MOH. HUDA',
          title: 'Ahli K3 Spesialis Instalasi Listrik & Penanggulangan Kebakaran',
          badgeNo: 'SKP.512/NAKER/2024',
          phone: '0812-3456-7890',
          pendingReports: 0,
          oldestPendingDays: 0,
          completedThisMonth: 8,
          avatar: 'MH'
        });
        this.saveInspectors(parsed);
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

      let parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const defaultSchedules = generateDefaultSchedules();
        this.saveSchedules(defaultSchedules);
        return defaultSchedules;
      }

      let changed = false;

      // Clean up copy tags
      parsed.forEach(s => {
        if (s.companyName && s.companyName.includes('(Copy)')) {
          s.companyName = s.companyName.replace(/(\s*\(Copy\))+/gi, '').trim();
          changed = true;
        }
      });

      // ABSOLUTE PROTECTION - JANGAN PERNAH ADA YANG DI-CLEAR:
      // Pastikan seluruh jadwal (Sadhana, Delta Surya, Iseki, Hakiki, Landkrone, Niramas,
      // Ati Gempol, Basecamp Padel, Malidas, Indofood) tetap ada dan utuh.
      // Jika ada yang belum masuk di browser ini, masukkan tanpa menghapus data yang ada.
      const defaults = generateDefaultSchedules();
      defaults.forEach(def => {
        const exists = parsed.some(p => 
          p.id === def.id || 
          (p.companyName && p.companyName.toLowerCase().trim() === def.companyName.toLowerCase().trim() && p.date === def.date && p.category === def.category)
        );
        if (!exists) {
          parsed.push(def);
          changed = true;
        }
      });

      if (changed) {
        this.saveSchedules(parsed);
      }
      return parsed;
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
      localStorage.setItem('rakana_pjk3_v5_nov9_synced', 'true');
      localStorage.setItem('rakana_pjk3_v4_inspectors', 'true');
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
window.getWeekDates = getWeekDates;
window.getThisWeekDates = getThisWeekDates;
window.getNextWeekDates = getNextWeekDates;
window.getActiveWorkWeekDates = getActiveWorkWeekDates;
window.isDateInThisWeek = isDateInThisWeek;
