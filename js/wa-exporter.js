/**
 * WhatsApp Schedule Exporter for Rakana PJK3
 * Formats schedules and backlog tracking into professional, emoji-styled WhatsApp broadcasts.
 */

class WhatsAppExporter {
  static getIndonesianDayName(dateObj) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[dateObj.getDay()];
  }

  static getIndonesianMonthName(dateObj) {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[dateObj.getMonth()];
  }

  static formatDateIndonesian(dateString) {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayName = this.getIndonesianDayName(d);
    const day = d.getDate();
    const monthName = this.getIndonesianMonthName(d);
    const year = d.getFullYear();
    return `${dayName}, ${day} ${monthName} ${year}`;
  }

  static getCategoryEmoji(categoryId) {
    switch (categoryId) {
      case 'PUBT': return '🔥 *[PUBT]*';
      case 'PAA': return '🏗️ *[PAA]*';
      case 'LISTRIK': return '⚡ *[LISTRIK & PETIR]*';
      case 'DAMKAR': return '🧯 *[DAMKAR]*';
      case 'ELEVATOR': return '🛗 *[ELEVATOR & LIFT]*';
      case 'PTP': return '⚙️ *[PTP]*';
      case 'LINGKUNGAN': return '🌿 *[LINGKUNGAN KERJA]*';
      default: return '🔍 *[RIKSA UJI]*';
    }
  }

  static getStatusEmoji(status) {
    switch (status) {
      case 'Sedang Riksa Uji': return '🟢 *SEDANG BERLANGSUNG*';
      case 'Otw Lokasi': return '🟡 *OTW MENUJU LOKASI*';
      case 'Selesai Riksa': return '✅ *SELESAI RIKSA*';
      case 'Tertunda': return '🔴 *RESCHEDULE / TERTUNDA*';
      default: return '⏳ *TERJADWAL*';
    }
  }

  /**
   * Helper: Group schedules by company for clean WhatsApp broadcast
   */
  static groupSchedulesByCompany(schedules) {
    const map = new Map();
    schedules.forEach(sch => {
      const cleanName = (sch.companyName || 'Tanpa Nama PT').replace(/(\s*\(Copy\))+/gi, '').trim();
      const key = cleanName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          companyName: cleanName,
          time: sch.time || '08:30',
          address: sch.address || '',
          companyPicName: sch.companyPicName || '',
          companyPicPhone: sch.companyPicPhone || '',
          status: sch.status || 'Terjadwal',
          equipments: [],
          inspectors: []
        });
      }
      const g = map.get(key);
      if (sch.equipmentName) {
        g.equipments.push(sch.category ? `[${sch.category}] ${sch.equipmentName}` : sch.equipmentName);
      }
      if (sch.inspectorName && !g.inspectors.includes(sch.inspectorName)) {
        g.inspectors.push(sch.inspectorName);
      }
      if (!g.companyPicName && sch.companyPicName) g.companyPicName = sch.companyPicName;
      const curPhone = (g.companyPicPhone || '').trim();
      const newPhone = (sch.companyPicPhone || '').trim();
      if ((!curPhone || curPhone === '-') && (newPhone && newPhone !== '-')) {
        g.companyPicPhone = newPhone;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
  }

  /**
   * Generates Full Weekly Schedule broadcast text for WhatsApp (Senin - Sabtu)
   */
  static generateWeeklySchedule(weekType = 'active') {
    const settings = RakanaDB.getSettings();
    const schedules = RakanaDB.getSchedules();

    let weekDates;
    let titleWeek;
    if (weekType === 'next_week') {
      weekDates = getNextWeekDates();
      titleWeek = 'MINGGU DEPAN';
    } else if (weekType === 'this_week') {
      weekDates = getThisWeekDates();
      titleWeek = 'MINGGU INI';
    } else {
      weekDates = getActiveWorkWeekDates();
      const d = new Date();
      titleWeek = (d.getDay() === 5 || d.getDay() === 6 || d.getDay() === 0) ? 'MINGGU DEPAN' : 'MINGGU INI';
    }

    const startFormatted = this.formatDateIndonesian(weekDates[0]);
    const endFormatted = this.formatDateIndonesian(weekDates[5]);

    let text = `📅 *AGENDA RIKSA UJI K3 ${titleWeek}*\n`;
    text += `🏢 *${settings.pjk3Name.toUpperCase()}*\n`;
    text += `🗓️ _Periode: ${startFormatted} s/d ${endFormatted}_\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let totalThisWeek = 0;

    weekDates.slice(0, 6).forEach((dateStr) => {
      const daySchedules = schedules.filter(s => s.date === dateStr);
      const companyGroups = this.groupSchedulesByCompany(daySchedules);

      const formattedDay = this.formatDateIndonesian(dateStr);
      text += `📌 *${formattedDay.toUpperCase()}* (${companyGroups.length} Perusahaan)\n`;

      if (companyGroups.length === 0) {
        text += `   _Tidak ada agenda riksa lapangan (Standby / Draft LHPP)_\n\n`;
      } else {
        totalThisWeek += companyGroups.length;
        companyGroups.forEach((grp, i) => {
          text += `   ${i + 1}. *${grp.companyName}*\n`;
          text += `      ⏰ Waktu: ${grp.time || '08:30'} WIB\n`;
          text += `      👷 Ahli K3: *${grp.inspectors.join(', ') || 'Tim Ahli K3'}*\n`;
          text += `      👤 PIC: *${grp.companyPicName || '-'}* (📞 ${grp.companyPicPhone || '-'})\n`;
          text += `      🔧 Objek: ${grp.equipments.join(' • ') || '-'}\n`;
          if (grp.address) text += `      📍 Lokasi: ${grp.address}\n`;
        });
        text += `\n`;
      }
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *Total Kunjungan Riksa Uji ${titleWeek.toLowerCase()}:* ${totalThisWeek} Perusahaan\n\n`;
    text += `⛑️ *Zero Accident is Our Priority!*\n`;
    text += `_Pastikan APD lengkap, formulir checklist terisi, & koordinasi dengan PIC sebelum berangkat._ ✨`;

    return text;
  }

  /**
   * Generates Full Daily Schedule broadcast text for WhatsApp
   */
  static generateDailySchedule(targetDate = null) {
    const settings = RakanaDB.getSettings();
    const schedules = RakanaDB.getSchedules();
    const inspectors = RakanaDB.getInspectors();

    const dateToQuery = targetDate || getRelativeDate(0);
    const daySchedule = schedules.filter(s => s.date === dateToQuery);
    const companyGroups = this.groupSchedulesByCompany(daySchedule);

    const formattedDate = this.formatDateIndonesian(dateToQuery);
    const numIcons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    let text = `📋 *JADWAL RIKSA UJI K3 - ${settings.pjk3Name.toUpperCase()}*\n`;
    text += `🏢 _${settings.pjk3SubTitle}_\n`;
    text += `📅 *Hari/Tanggal:* ${formattedDate}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (companyGroups.length === 0) {
      text += `_Tidak ada agenda riksa uji lapangan yang terjadwal untuk tanggal ini._\n`;
      text += `_Seluruh personel Ahli K3 standby & fokus penyusunan Laporan Hasil Pemeriksaan (LHPP)._\n\n`;
    } else {
      text += `📍 *DAFTAR AGENDA RIKSA UJI LAPANGAN (${companyGroups.length} Perusahaan):*\n\n`;

      companyGroups.forEach((grp, idx) => {
        const num = numIcons[idx] || `[${idx + 1}]`;
        const statusBadge = this.getStatusEmoji(grp.status);

        text += `${num} *${grp.companyName.toUpperCase()}*\n`;
        text += `   ⏰ *Waktu:* Pukul ${grp.time || '08:30'} WIB\n`;
        if (grp.address) text += `   📍 *Lokasi:* ${grp.address}\n`;
        text += `   🔧 *Objek Riksa:* ${grp.equipments.join(' • ') || '-'}\n`;
        text += `   👷 *Ahli K3 / Inspektur:* *${grp.inspectors.join(', ') || 'Tim Ahli K3'}*\n`;
        text += `   👤 *PIC Klien:* ${grp.companyPicName || '-'} (📞 ${grp.companyPicPhone || '-'})\n`;
        text += `   📊 *Status:* ${statusBadge}\n\n`;
      });
    }

    // Append Brief Backlog Alert
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *MONITORING BACKLOG LAPORAN (LHPP) AHLI K3:*\n`;
    
    // Sort inspectors by pending reports descending
    const sortedInspectors = [...inspectors].sort((a, b) => b.pendingReports - a.pendingReports);
    
    sortedInspectors.forEach(ins => {
      let icon = '🟢';
      let tag = 'Aman / Nihil';
      if (ins.pendingReports > 5) {
        icon = '🔴';
        tag = 'KRITIS/URGENT';
      } else if (ins.pendingReports >= 3) {
        icon = '🟡';
        tag = 'Perhatian';
      } else if (ins.pendingReports > 0) {
        icon = '🔵';
        tag = 'On Track';
      }
      text += `${icon} *${ins.name}*: ${ins.pendingReports} Laporan (${tag})\n`;
    });

    text += `\n⛑️ *PESAN KESELAMATAN:*\n`;
    text += `_"${settings.runningText.replace(/•/g, '\n- ')}"_\n\n`;
    text += `_Dibuat otomatis oleh Sistem Informasi Rakana PJK3 Command Center_ ✨`;

    return text;
  }

  /**
   * Generates Tomorrow's Preview text
   */
  static generateTomorrowPreview() {
    const tomorrowDate = getRelativeDate(1);
    return this.generateDailySchedule(tomorrowDate);
  }

  /**
   * Generates Dedicated Backlog & Performance Report for Management
   */
  static generateBacklogReport() {
    const settings = RakanaDB.getSettings();
    const inspectors = RakanaDB.getInspectors();
    const formattedDate = this.formatDateIndonesian(getRelativeDate(0));

    let text = `🚨 *LAPORAN MONITORING BACKLOG LHPP AHLI K3*\n`;
    text += `🏢 *${settings.pjk3Name}*\n`;
    text += `📅 *Update Per:* ${formattedDate}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let totalBacklog = 0;
    let totalCompleted = 0;

    inspectors.forEach(ins => {
      totalBacklog += parseInt(ins.pendingReports || 0);
      totalCompleted += parseInt(ins.completedThisMonth || 0);
    });

    text += `📈 *RINGKASAN TOTAL:* \n`;
    text += `• Total Laporan Tertunda: *${totalBacklog} Dokumen*\n`;
    text += `• Selesai Bulan Ini: *${totalCompleted} Dokumen*\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👷 *RINCIAN STATUS MASING-MASING AHLI K3:*\n\n`;

    // Sort by highest backlog
    const sorted = [...inspectors].sort((a, b) => b.pendingReports - a.pendingReports);

    sorted.forEach((ins, idx) => {
      let statusIcon = '🟢';
      let statusText = 'Nihil Tanggungan (Bebas Backlog)';
      if (ins.pendingReports > 5) {
        statusIcon = '🔴';
        statusText = 'KRITIS - Melebihi Batas H+7';
      } else if (ins.pendingReports >= 3) {
        statusIcon = '🟡';
        statusText = 'PERINGATAN - Perlu Segera Difinalisasi';
      } else if (ins.pendingReports > 0) {
        statusIcon = '🔵';
        statusText = 'Dalam Pengerjaan (Aman)';
      }

      text += `${idx + 1}. *${ins.name}*\n`;
      text += `   Spesialisasi: ${ins.title}\n`;
      text += `   Jumlah Pending: ${statusIcon} *${ins.pendingReports} Laporan* [${statusText}]\n`;
      if (ins.oldestPendingDays > 0) {
        text += `   Laporan Tertua: ${ins.oldestPendingDays} Hari Belum Submit\n`;
      }
      text += `   Selesai Bulan Ini: ${ins.completedThisMonth} Laporan\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚠️ *Catatan PJK3 Management:*\n`;
    text += `Harap seluruh Ahli K3 menuntaskan draft laporan riksa uji maksimal 7 hari kerja setelah riksa uji lapangan agar penerbitan Surat Keterangan (Suket) dari Disnaker tidak terhambat. Terima kasih. 🙏\n`;

    return text;
  }

  /**
   * Generates Executive Short Summary
   */
  static generateBriefSummary(targetDate = null) {
    const settings = RakanaDB.getSettings();
    const schedules = RakanaDB.getSchedules();
    const dateToQuery = targetDate || getRelativeDate(0);
    const daySchedule = schedules.filter(s => s.date === dateToQuery);
    const formattedDate = this.formatDateIndonesian(dateToQuery);

    let text = `📢 *RINGKASAN AGENDA RIKSA UJI - ${settings.pjk3Name}*\n`;
    text += `📅 ${formattedDate}\n\n`;

    if (daySchedule.length === 0) {
      text += `Hari ini tidak ada agenda kunjungan lapangan.\n`;
    } else {
      daySchedule.forEach((sch, i) => {
        text += `${i + 1}. *${sch.companyName}* (${sch.category}) - ${sch.inspectorName} [${sch.status}]\n`;
      });
    }

    text += `\nTetap utamakan safety & K3! ⛑️`;
    return text;
  }
}

window.WhatsAppExporter = WhatsAppExporter;
