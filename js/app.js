/**
 * Core Application Controller for Rakana PJK3 TV Dashboard
 * ZERO-SCROLL 2-SLIDE TV SYSTEM:
 *   - Slide 1: Dynamic Flexible Weekly Board (Hanya Tampilkan Hari yang Ada Riksa Uji)
 *   - Slide 2: Monitoring Tanggungan Laporan Ahli K3 in ONE Screen (With Backlog vs Zero Backlog)
 */

class RakanaApp {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 2;
    this.isAutoRotating = true;
    this.rotationIntervalSec = 15;
    this.timerCountdown = 15;
    this.progressInterval = null;
    this.audioContext = null;
    this.isMuted = false;
    this.init();
  }

  init() {
    // Ensure storage migration runs on init
    RakanaDB.getSettings();
    RakanaDB.getInspectors();

    this.initTheme();
    this.initClock();
    this.initAudioContext();
    this.bindEvents();
    this.refreshAll();
    this.startAutoRotation();

    // Day change check every minute
    setInterval(() => {
      this.checkDayChange();
    }, 60000);
  }

  initTheme() {
    const settings = RakanaDB.getSettings();
    const savedTheme = localStorage.getItem('rakana_theme') || settings.theme || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }

  toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('rakana_theme', isLight ? 'light' : 'dark');
    this.showToast(`Mode tema diubah ke ${isLight ? 'Terang (Light)' : 'Gelap (Dark)'}`, 'info');
  }

  initAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.audioContext = new AudioContextClass();
    }
  }

  playAudioFeedback(type = 'success') {
    const settings = RakanaDB.getSettings();
    if (!settings.soundEnabled || this.isMuted || !this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      const now = this.audioContext.currentTime;

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'copy') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'slide') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  }

  initClock() {
    const updateTime = () => {
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      const dayName = days[now.getDay()];
      const dateNum = String(now.getDate()).padStart(2, '0');
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();

      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      const clockEl = document.getElementById('tv-clock');
      const dateEl = document.getElementById('tv-date');
      const dayEl = document.getElementById('tv-day-badge');

      if (clockEl) clockEl.innerText = `${hours}:${minutes}:${seconds}`;
      if (dateEl) dateEl.innerText = `${dateNum} ${monthName} ${year}`;
      if (dayEl) dayEl.innerText = `${dayName.toUpperCase()}`;
    };

    updateTime();
    setInterval(updateTime, 1000);
  }

  checkDayChange() {
    const todayStr = getRelativeDate(0);
    if (this.lastRecordedDate && this.lastRecordedDate !== todayStr) {
      this.lastRecordedDate = todayStr;
      this.refreshAll();
      this.showToast('Tanggal berganti: Jadwal diperbarui otomatis.', 'info');
    }
    this.lastRecordedDate = todayStr;
  }

  // --- SLIDE NAVIGATION & AUTO-ROTATION ---

  startAutoRotation() {
    const settings = RakanaDB.getSettings();
    this.rotationIntervalSec = parseInt(settings.autoRotateIntervalSec || 15);
    this.timerCountdown = this.rotationIntervalSec;

    clearInterval(this.progressInterval);

    if (!this.isAutoRotating) return;

    const progressBar = document.getElementById('slide-progress');
    const stepTime = 100;
    const totalSteps = (this.rotationIntervalSec * 1000) / stepTime;
    let currentStep = 0;

    this.progressInterval = setInterval(() => {
      if (!this.isAutoRotating) return;
      currentStep++;
      const percent = Math.min(100, (currentStep / totalSteps) * 100);
      if (progressBar) progressBar.style.width = `${percent}%`;

      if (currentStep >= totalSteps) {
        currentStep = 0;
        this.nextSlide(true);
      }
    }, stepTime);
  }

  resetProgress() {
    const progressBar = document.getElementById('slide-progress');
    if (progressBar) progressBar.style.width = '0%';
    this.startAutoRotation();
  }

  switchSlide(slideNumber, fromAuto = false) {
    this.currentSlide = slideNumber;

    const slide1 = document.getElementById('slide-1-view');
    const slide2 = document.getElementById('slide-2-view');

    const btnSlide1 = document.getElementById('btn-nav-slide-1');
    const btnSlide2 = document.getElementById('btn-nav-slide-2');

    if (slideNumber === 1) {
      if (slide1) slide1.classList.remove('hidden');
      if (slide2) slide2.classList.add('hidden');

      if (btnSlide1) {
        btnSlide1.className = 'slide-nav-pill px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/50 flex items-center space-x-1.5';
      }
      if (btnSlide2) {
        btnSlide2.className = 'slide-nav-pill px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center space-x-1.5';
      }

      this.updateActiveBadge();

    } else {
      if (slide1) slide1.classList.add('hidden');
      if (slide2) slide2.classList.remove('hidden');

      if (btnSlide1) {
        btnSlide1.className = 'slide-nav-pill px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center space-x-1.5';
      }
      if (btnSlide2) {
        btnSlide2.className = 'slide-nav-pill px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition bg-rose-500 text-white shadow-lg shadow-rose-950/50 flex items-center space-x-1.5';
      }

      const activeBadge = document.getElementById('active-slide-badge');
      if (activeBadge) activeBadge.innerText = 'SLIDE 2/2: STATUS TANGGUNGAN LAPORAN AHLI K3';
    }

    if (!fromAuto) {
      this.playAudioFeedback('slide');
    }
    this.resetProgress();
    this.refreshIcons();
  }

  nextSlide(fromAuto = false) {
    const next = this.currentSlide === 1 ? 2 : 1;
    this.switchSlide(next, fromAuto);
  }

  prevSlide() {
    const prev = this.currentSlide === 1 ? 2 : 1;
    this.switchSlide(prev, false);
  }

  toggleAutoRotation() {
    this.isAutoRotating = !this.isAutoRotating;
    const btn = document.getElementById('btn-toggle-autorotate');
    const progressBar = document.getElementById('slide-progress');

    if (this.isAutoRotating) {
      if (btn) btn.innerHTML = `<i data-lucide="pause" class="w-3.5 h-3.5"></i> <span class="hidden sm:inline">Jeda</span>`;
      this.startAutoRotation();
      this.showToast('Rotasi slide otomatis aktif (15 detik)', 'info');
    } else {
      if (btn) btn.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5"></i> <span class="hidden sm:inline">Putar</span>`;
      clearInterval(this.progressInterval);
      if (progressBar) progressBar.style.width = '0%';
      this.showToast('Rotasi slide otomatis dijeda', 'info');
    }
    this.refreshIcons();
  }

  bindEvents() {
    // Fullscreen Toggle
    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }

    // Theme Toggle Button
    const btnTheme = document.getElementById('btn-toggle-theme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => this.toggleTheme());
    }

    // Slide Switching Buttons
    const btnNavSlide1 = document.getElementById('btn-nav-slide-1');
    if (btnNavSlide1) {
      btnNavSlide1.addEventListener('click', () => this.switchSlide(1));
    }

    const btnNavSlide2 = document.getElementById('btn-nav-slide-2');
    if (btnNavSlide2) {
      btnNavSlide2.addEventListener('click', () => this.switchSlide(2));
    }

    const btnPrevSlide = document.getElementById('btn-prev-slide');
    if (btnPrevSlide) {
      btnPrevSlide.addEventListener('click', () => this.prevSlide());
    }

    const btnNextSlide = document.getElementById('btn-next-slide');
    if (btnNextSlide) {
      btnNextSlide.addEventListener('click', () => this.nextSlide());
    }

    const btnAutoRotate = document.getElementById('btn-toggle-autorotate');
    if (btnAutoRotate) {
      btnAutoRotate.addEventListener('click', () => this.toggleAutoRotation());
    }

    // WhatsApp Modal Triggers
    const btnOpenWa = document.getElementById('btn-open-wa-modal');
    if (btnOpenWa) {
      btnOpenWa.addEventListener('click', () => this.openWhatsAppModal());
    }

    const btnCloseWa = document.getElementById('btn-close-wa-modal');
    if (btnCloseWa) {
      btnCloseWa.addEventListener('click', () => this.closeWhatsAppModal());
    }

    // WA Format Switchers
    document.querySelectorAll('.wa-format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.wa-format-btn').forEach(b => {
          b.classList.remove('bg-emerald-600', 'text-white');
          b.classList.add('bg-slate-800', 'text-slate-300');
        });
        btn.classList.add('bg-emerald-600', 'text-white');
        btn.classList.remove('bg-slate-800', 'text-slate-300');

        const formatType = btn.getAttribute('data-format');
        this.updateWhatsAppPreview(formatType);
      });
    });

    // Copy WA Text
    const btnCopyWa = document.getElementById('btn-copy-wa-text');
    if (btnCopyWa) {
      btnCopyWa.addEventListener('click', () => this.copyWhatsAppText());
    }

    // Open in WA Web Direct
    const btnDirectWa = document.getElementById('btn-direct-wa');
    if (btnDirectWa) {
      btnDirectWa.addEventListener('click', () => {
        const text = document.getElementById('wa-preview-textarea').value;
        const encoded = encodeURIComponent(text);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
      });
    }

    // Download TXT
    const btnDownloadTxt = document.getElementById('btn-download-wa-txt');
    if (btnDownloadTxt) {
      btnDownloadTxt.addEventListener('click', () => this.downloadWhatsAppText());
    }

    // Close Admin Modal Button
    const btnCloseAdmin = document.getElementById('btn-close-admin-modal');
    if (btnCloseAdmin) {
      btnCloseAdmin.addEventListener('click', () => {
        if (window.adminManager) window.adminManager.closeAdminModal();
      });
    }

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') this.closeAllModals();
        return;
      }

      if (e.key === '1') {
        this.switchSlide(1);
      } else if (e.key === '2') {
        this.switchSlide(2);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.toggleAutoRotation();
      } else if (e.key === 'ArrowRight') {
        this.nextSlide();
      } else if (e.key === 'ArrowLeft') {
        this.prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      } else if (e.key === 'a' || e.key === 'A') {
        if (window.adminManager) window.adminManager.openAdminModal();
      } else if (e.key === 'w' || e.key === 'W') {
        this.openWhatsAppModal();
      } else if (e.key === 't' || e.key === 'T') {
        this.toggleTheme();
      } else if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Handle Window Resize for TV/Preview responsive layouts
    window.addEventListener('resize', () => {
      this.renderWeeklyBoard();
    });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Fullscreen failed: ${err.message}`);
      });
      this.showToast('Mode TV Layar Penuh Diaktifkan', 'info');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        this.showToast('Keluar dari Layar Penuh', 'info');
      }
    }
  }

  closeAllModals() {
    this.closeWhatsAppModal();
    if (window.adminManager) window.adminManager.closeAdminModal();
  }

  refreshAll() {
    this.renderHeaderAndBranding();
    this.renderStats();
    this.renderWeeklyBoard();
    this.renderBacklogSlide();
    this.renderRunningTicker();
    this.refreshIcons();
  }

  renderHeaderAndBranding() {
    const s = RakanaDB.getSettings();
    const brandNameEl = document.getElementById('header-pjk3-name');
    const brandSubEl = document.getElementById('header-pjk3-sub');
    const brandRegEl = document.getElementById('header-pjk3-reg');

    if (brandNameEl) brandNameEl.innerText = s.pjk3Name || 'PT. RAKANA MITRA RIKSA';
    if (brandSubEl) brandSubEl.innerText = s.pjk3SubTitle || 'Layanan Riksa Uji K3 Kemnaker RI';
    if (brandRegEl) brandRegEl.innerText = s.pjk3RegNo || '-';
  }

  renderRunningTicker() {
    const s = RakanaDB.getSettings();
    const tickerEl = document.getElementById('marquee-text');
    if (tickerEl) {
      tickerEl.innerText = s.runningText || 'UTAMAKAN KESELAMATAN & KESEHATAN KERJA • ZERO ACCIDENT IS OUR PRIORITY';
    }
  }

  renderStats() {
    const schedules = RakanaDB.getSchedules();
    const inspectors = RakanaDB.getInspectors();
    const weekDates = getThisWeekDates();

    const thisWeekSchedules = schedules.filter(s => weekDates.includes(s.date));

    let totalBacklog = 0;
    let criticalBacklogCount = 0;
    let zeroBacklogCount = 0;

    inspectors.forEach(ins => {
      const b = parseInt(ins.pendingReports || 0);
      totalBacklog += b;
      if (b > 5) criticalBacklogCount++;
      if (b === 0) zeroBacklogCount++;
    });

    const elWeekCount = document.getElementById('stat-week-count');
    if (elWeekCount) elWeekCount.innerText = thisWeekSchedules.length;

    const elTotalBacklog = document.getElementById('stat-backlog-total');
    const elCriticalCount = document.getElementById('stat-backlog-critical');
    const elZeroCount = document.getElementById('stat-backlog-zero');

    if (elTotalBacklog) elTotalBacklog.innerText = totalBacklog;
    if (elCriticalCount) elCriticalCount.innerText = criticalBacklogCount;
    if (elZeroCount) elZeroCount.innerText = zeroBacklogCount;
  }

  updateActiveBadge(activeDaysCount = 0) {
    const activeBadge = document.getElementById('active-slide-badge');
    if (activeBadge && this.currentSlide === 1) {
      activeBadge.innerText = `SLIDE 1/2: JADWAL MINGGU INI (${activeDaysCount} HARI AKTIF)`;
    }
  }

  // --- SLIDE 1: DYNAMIC FLEXIBLE WEEKLY BOARD (HANYA HARI YANG ADA RIKSA) ---

  renderWeeklyBoard() {
    const container = document.getElementById('weekly-board-container');
    if (!container) return;

    const schedules = RakanaDB.getSchedules();
    const today = getRelativeDate(0);
    const weekDates = getThisWeekDates(); // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]

    // Days name mapping
    const dayNameMap = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    // 1. FILTER ONLY DAYS IN THE WEEK THAT HAVE AT LEAST 1 SCHEDULE!
    let activeDayObjects = [];

    weekDates.slice(0, 6).forEach((dateStr, idx) => {
      const daySchedules = schedules
        .filter(s => s.date === dateStr)
        .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

      // If there is at least 1 inspection on this day, include it!
      if (daySchedules.length > 0) {
        activeDayObjects.push({
          dayName: dayNameMap[idx],
          dateStr: dateStr,
          schedules: daySchedules
        });
      }
    });

    // Fallback: If no days this week have schedules, look at rolling upcoming days
    if (activeDayObjects.length === 0) {
      const upcomingDistinctDates = [...new Set(schedules.map(s => s.date))]
        .filter(d => d >= today)
        .sort()
        .slice(0, 6);

      upcomingDistinctDates.forEach(dateStr => {
        const parts = dateStr.split('-');
        let name = 'HARI INI';
        if (parts.length === 3) {
          const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const daysIndo = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
          name = daysIndo[dObj.getDay()];
        }
        activeDayObjects.push({
          dayName: name,
          dateStr: dateStr,
          schedules: schedules.filter(s => s.date === dateStr)
        });
      });
    }

    this.updateActiveBadge(activeDayObjects.length);

    // If completely empty:
    if (activeDayObjects.length === 0) {
      container.className = 'grid grid-cols-1 h-full w-full overflow-hidden';
      container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
          <div class="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-3">
            <i data-lucide="calendar-check" class="w-8 h-8"></i>
          </div>
          <h3 class="text-xl font-black text-white">Tidak Ada Jadwal Riksa Uji Terdaftar Minggu Ini</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-md">
            Seluruh personil Ahli K3 bertugas di kantor untuk pemeriksaan teknis dokumen dan finalisasi LHPP.
          </p>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    // 2. DYNAMIC COLUMN SIZING:
    // On wide TV screen (>= 1200px): columns auto-fill full width (grid-cols-N)
    // On narrower preview pane or laptop (< 1200px): smooth horizontal scroll with min-w-[280px] per column
    const isWideScreen = window.innerWidth >= 1200;
    const numCols = Math.max(1, Math.min(6, activeDayObjects.length));
    
    let colClass = 'grid-cols-3';
    if (numCols === 1) colClass = 'grid-cols-1';
    else if (numCols === 2) colClass = 'grid-cols-2';
    else if (numCols === 3) colClass = 'grid-cols-3';
    else if (numCols === 4) colClass = 'grid-cols-4';
    else if (numCols === 5) colClass = 'grid-cols-5';
    else if (numCols >= 6) colClass = 'grid-cols-6';

    if (isWideScreen) {
      container.className = `grid ${colClass} gap-3 h-full w-full overflow-hidden`;
    } else {
      container.className = `flex flex-row gap-3 h-full w-full overflow-x-auto overflow-y-hidden custom-horizontal-scrollbar pb-1`;
    }

    let html = '';

    activeDayObjects.forEach((dayObj) => {
      const isToday = dayObj.dateStr === today;

      // Format date like "02 Nov"
      let dateFormatted = dayObj.dateStr;
      if (dayObj.dateStr) {
        const parts = dayObj.dateStr.split('-');
        if (parts.length === 3) {
          const mIdx = parseInt(parts[1]) - 1;
          dateFormatted = `${parts[2]} ${monthsShort[mIdx] || ''}`;
        }
      }

      const colHeaderClass = isToday
        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-950/60 border-cyan-400'
        : 'bg-slate-950/90 text-slate-200 border-slate-800';

      const colBorderClass = isToday
        ? 'border-cyan-500/80 bg-slate-900/90 glow-cyan'
        : 'border-slate-800/80 bg-slate-900/60';

      // SUB-GRID LOGIC TO PREVENT VERTICAL CUTOFF:
      // Only split into 2 sub-columns if screen is very wide (>= 1440px) AND day has >= 4 schedules
      const useSubGrid = isWideScreen && window.innerWidth >= 1440 && dayObj.schedules.length >= 4 && numCols <= 3;
      const stackClass = useSubGrid 
        ? 'grid grid-cols-2 gap-2 h-full overflow-hidden' 
        : 'flex flex-col gap-2 h-full overflow-y-auto custom-scrollbar pr-0.5';

      const colWidthClass = isWideScreen ? 'w-full' : 'min-w-[280px] w-[300px] shrink-0';

      html += `
        <div class="flex flex-col h-full rounded-2xl border p-2.5 overflow-hidden transition-all duration-300 ${colWidthClass} ${colBorderClass}">
          
          <!-- Column Day Header -->
          <div class="p-2.5 rounded-xl border flex items-center justify-between mb-2 shrink-0 ${colHeaderClass}">
            <div class="flex items-center space-x-2">
              <span class="font-black text-sm md:text-base tracking-wider uppercase">${dayObj.dayName}</span>
              <span class="text-xs font-mono ${isToday ? 'text-slate-950 font-black' : 'text-cyan-400 font-bold'}">${dateFormatted}</span>
            </div>
            
            <div class="flex items-center space-x-1.5">
              ${isToday ? `<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-950 text-cyan-300">HARI INI</span>` : ''}
              <span class="px-2 py-0.5 rounded text-xs font-mono font-bold ${isToday ? 'bg-slate-950/30 text-white' : 'bg-slate-800 text-slate-300'}">
                ${dayObj.schedules.length} Riksa
              </span>
            </div>
          </div>

          <!-- Cards Stack (Zero Scroll, Fitted) -->
          <div class="${stackClass}">
      `;

      dayObj.schedules.forEach((sch) => {
        const catClass = `badge-${sch.category ? sch.category.toLowerCase() : 'pubt'}`;
        
        let statusDot = 'bg-blue-400';
        let cardPulse = '';

        if (sch.status === 'Sedang Riksa Uji') {
          statusDot = 'bg-emerald-400 beacon-dot';
          cardPulse = 'border-emerald-500/70 bg-emerald-950/20';
        } else if (sch.status === 'Otw Lokasi') {
          statusDot = 'bg-yellow-400';
        } else if (sch.status === 'Selesai Riksa') {
          statusDot = 'bg-slate-500';
        }

        const cleanPhone = (sch.companyPicPhone || '').replace(/[^0-9]/g, '');
        const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
        const waMsg = encodeURIComponent(`Halo ${sch.companyPicName || 'Bpk/Ibu'}, kami dari ${RakanaDB.getSettings().pjk3Name} ingin konfirmasi riksa uji K3 (${sch.category}) untuk ${sch.companyName}.`);
        const waLink = cleanPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : '#';

        html += `
          <div class="tv-card-enter rounded-xl bg-slate-950/90 hover:bg-slate-950 border border-slate-800/90 p-2.5 flex flex-col justify-between shadow-md transition ${cardPulse}">
            
            <div>
              <!-- Category & Time -->
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${catClass}">
                  ${sch.category || 'K3'}
                </span>
                <div class="flex items-center space-x-1 text-[11px] font-mono font-bold text-cyan-400">
                  <span class="w-1.5 h-1.5 rounded-full ${statusDot}"></span>
                  <span>${sch.time || '08:30'} WIB</span>
                </div>
              </div>

              <!-- Company Name (Large, Bold, High Legibility) -->
              <div class="font-black text-xs md:text-sm text-white line-clamp-1 leading-tight tracking-tight mt-0.5" title="${sch.companyName}">
                ${sch.companyName}
              </div>

              <!-- Equipment -->
              <div class="text-[11px] text-cyan-200/90 font-medium line-clamp-1 mt-0.5" title="${sch.equipmentName}">
                🔧 ${sch.equipmentName || 'Riksa Uji K3'}
              </div>

              <!-- Ahli K3 in charge -->
              <div class="text-[11px] text-slate-300 font-semibold line-clamp-1 mt-0.5" title="${sch.inspectorName}">
                👷 ${sch.inspectorName}
              </div>
            </div>

            <!-- PROMINENT PIC & PHONE BOX (EMERALD HIGH CONTRAST) -->
            <div class="mt-2 p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-200">
              <div class="text-[10px] text-emerald-400 font-extrabold truncate leading-tight">
                👤 ${sch.companyPicName || 'PIC Lapangan'}
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-xs font-black font-mono text-emerald-300 tracking-wide">
                  📞 ${sch.companyPicPhone || '-'}
                </span>
                ${cleanPhone ? `
                  <a href="${waLink}" target="_blank" class="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider shadow transition" title="Chat WhatsApp">
                    WA
                  </a>
                ` : ''}
              </div>
            </div>

          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    this.refreshIcons();
  }

  // --- SLIDE 2: MONITORING TANGGUNGAN LAPORAN AHLI K3 (1 SCREEN ZERO SCROLL) ---

  renderBacklogSlide() {
    const inspectors = RakanaDB.getInspectors();

    const withBacklog = inspectors.filter(ins => parseInt(ins.pendingReports || 0) > 0);
    const zeroBacklog = inspectors.filter(ins => parseInt(ins.pendingReports || 0) === 0);

    withBacklog.sort((a, b) => {
      const pDiff = parseInt(b.pendingReports || 0) - parseInt(a.pendingReports || 0);
      if (pDiff !== 0) return pDiff;
      return parseInt(b.oldestPendingDays || 0) - parseInt(a.oldestPendingDays || 0);
    });

    zeroBacklog.sort((a, b) => parseInt(b.completedThisMonth || 0) - parseInt(a.completedThisMonth || 0));

    const containerWithBacklog = document.getElementById('backlog-with-tanggunan-container');
    if (containerWithBacklog) {
      if (withBacklog.length === 0) {
        containerWithBacklog.innerHTML = `
          <div class="col-span-full h-full flex items-center justify-center p-6 text-center rounded-2xl bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 font-bold">
            🎉 LUAR BIASA! Seluruh Ahli K3 saat ini tidak memiliki tanggungan laporan (Zero Backlog).
          </div>
        `;
      } else {
        containerWithBacklog.innerHTML = withBacklog.map((ins) => {
          const pending = parseInt(ins.pendingReports || 0);
          let alertCardStyle = '';
          let badgeStyle = '';
          let alertTitle = '';
          let dotColor = '';

          if (pending > 5) {
            alertCardStyle = 'border-rose-500/70 bg-rose-950/25 glow-rose';
            badgeStyle = 'bg-rose-500/30 text-rose-200 border-rose-500 font-black animate-pulse';
            alertTitle = '🚨 KRITIS (>5)';
            dotColor = 'bg-rose-500 beacon-dot';
          } else if (pending >= 3) {
            alertCardStyle = 'border-amber-500/60 bg-amber-950/20 glow-amber';
            badgeStyle = 'bg-amber-500/30 text-amber-200 border-amber-500/60 font-bold';
            alertTitle = '⚠️ PERHATIAN (3-5)';
            dotColor = 'bg-amber-400';
          } else {
            alertCardStyle = 'border-blue-500/40 bg-blue-950/20';
            badgeStyle = 'bg-blue-500/30 text-blue-200 border-blue-500/50 font-bold';
            alertTitle = '⏳ DALAM PROSES (1-2)';
            dotColor = 'bg-blue-400';
          }

          return `
            <div class="tv-card-enter rounded-2xl border p-3 flex flex-col justify-between shadow-xl ${alertCardStyle}">
              <div>
                <div class="flex items-center justify-between gap-1 mb-1.5">
                  <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${badgeStyle}">
                    ${alertTitle}
                  </span>
                  <div class="flex items-baseline space-x-1 font-mono">
                    <span class="text-2xl font-black text-white">${pending}</span>
                    <span class="text-[10px] font-bold text-slate-300 uppercase">Lap</span>
                  </div>
                </div>

                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-cyan-300 font-black flex items-center justify-center shrink-0 text-sm">
                    ${ins.avatar || ins.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div class="truncate">
                    <h3 class="text-sm font-black text-white leading-tight truncate">${ins.name}</h3>
                    <p class="text-[11px] text-cyan-300 font-semibold truncate">${ins.title}</p>
                  </div>
                </div>
              </div>

              <div class="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
                <div class="flex items-center space-x-1.5">
                  <span class="w-2 h-2 rounded-full ${dotColor}"></span>
                  <span>Tertua: <strong class="text-white font-mono">${ins.oldestPendingDays > 0 ? `${ins.oldestPendingDays} Hari` : 'Review'}</strong></span>
                </div>
                <span class="font-mono text-cyan-400 text-[10px]">📞 ${ins.phone || '-'}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    const containerZeroBacklog = document.getElementById('backlog-zero-tanggunan-container');
    if (containerZeroBacklog) {
      if (zeroBacklog.length === 0) {
        containerZeroBacklog.innerHTML = `
          <div class="p-3 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
            Seluruh Ahli K3 saat ini sedang memiliki laporan dalam proses.
          </div>
        `;
      } else {
        containerZeroBacklog.innerHTML = zeroBacklog.map((ins) => {
          return `
            <div class="tv-card-enter rounded-xl bg-emerald-950/20 border border-emerald-500/40 p-2.5 flex items-center justify-between shadow-md">
              <div class="flex items-center space-x-2.5 truncate">
                <div class="w-8 h-8 rounded-lg bg-emerald-900/60 text-emerald-300 font-black flex items-center justify-center shrink-0 text-xs">
                  <i data-lucide="check" class="w-4 h-4 text-emerald-400"></i>
                </div>
                <div class="truncate">
                  <div class="text-xs font-black text-white truncate">${ins.name}</div>
                  <div class="text-[10px] text-emerald-400 font-semibold truncate">${ins.title}</div>
                </div>
              </div>

              <div class="text-right shrink-0 pl-2">
                <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  NIHIL BACKLOG
                </span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    this.refreshIcons();
  }

  // --- WHATSAPP EXPORT CONTROLLER ---

  openWhatsAppModal() {
    const modal = document.getElementById('wa-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this.updateWhatsAppPreview('weekly');
    this.refreshIcons();
  }

  closeWhatsAppModal() {
    const modal = document.getElementById('wa-modal');
    if (modal) modal.classList.add('hidden');
  }

  updateWhatsAppPreview(formatType) {
    const textarea = document.getElementById('wa-preview-textarea');
    if (!textarea) return;

    let text = '';
    if (formatType === 'weekly') {
      text = WhatsAppExporter.generateWeeklySchedule();
    } else if (formatType === 'daily') {
      text = WhatsAppExporter.generateDailySchedule();
    } else if (formatType === 'tomorrow') {
      text = WhatsAppExporter.generateTomorrowPreview();
    } else if (formatType === 'backlog') {
      text = WhatsAppExporter.generateBacklogReport();
    } else if (formatType === 'brief') {
      text = WhatsAppExporter.generateBriefSummary();
    }

    textarea.value = text;
  }

  copyWhatsAppText() {
    const textarea = document.getElementById('wa-preview-textarea');
    if (!textarea) return;

    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => {
      this.playAudioFeedback('copy');
      this.showToast('✅ Format WhatsApp berhasil disalin ke clipboard! Silakan tempel (Ctrl+V) di WhatsApp.', 'success');

      const btn = document.getElementById('btn-copy-wa-text');
      if (btn) {
        const origHTML = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> <span>Tersalin!</span>`;
        this.refreshIcons();
        setTimeout(() => {
          btn.innerHTML = origHTML;
          this.refreshIcons();
        }, 2000);
      }
    }).catch(err => {
      document.execCommand('copy');
      this.showToast('Format teks tersalin.', 'success');
    });
  }

  downloadWhatsAppText() {
    const textarea = document.getElementById('wa-preview-textarea');
    if (!textarea) return;

    const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jadwal-Riksa-Uji-Rakana-${getRelativeDate(0)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.showToast('File teks berhasil diunduh.', 'info');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    let bg = 'bg-slate-900 border-slate-700 text-slate-100';
    let icon = 'info';

    if (type === 'success') {
      bg = 'bg-emerald-950 border-emerald-600 text-emerald-100 shadow-emerald-950/50';
      icon = 'check-circle';
    } else if (type === 'error') {
      bg = 'bg-rose-950 border-rose-600 text-rose-100 shadow-rose-950/50';
      icon = 'alert-circle';
    }

    toast.className = `p-3 rounded-xl border shadow-2xl flex items-center space-x-2 text-xs font-medium transition-all duration-300 transform translate-y-3 opacity-0 ${bg}`;
    toast.innerHTML = `
      <i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    this.refreshIcons();

    setTimeout(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    }, 20);

    setTimeout(() => {
      toast.classList.add('translate-y-3', 'opacity-0');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
}

// Instantiate and expose globally
document.addEventListener('DOMContentLoaded', () => {
  window.App = new RakanaApp();
  window.adminManager = new AdminManager();
});
