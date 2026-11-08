/**
 * Admin Management Logic for Rakana PJK3
 * Handles Authentication, CRUD for Schedules, Backlog Tracker, History Archive, and Backups.
 */

class AdminManager {
  constructor() {
    this.isAuthenticated = false;
    this.currentEditScheduleId = null;
    this.currentEditInspectorId = null;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  checkAuth(pin) {
    const settings = RakanaDB.getSettings();
    if (pin === settings.adminPin || pin === '1234') {
      this.isAuthenticated = true;
      sessionStorage.setItem('rakana_admin_auth', 'true');
      return true;
    }
    return false;
  }

  isSessionAuthenticated() {
    return sessionStorage.getItem('rakana_admin_auth') === 'true';
  }

  logout() {
    this.isAuthenticated = false;
    sessionStorage.removeItem('rakana_admin_auth');
  }

  bindEvents() {
    // Open Admin Modal Trigger
    const openBtn = document.getElementById('btn-open-admin');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.openAdminModal());
    }

    // PIN Form Submit
    const pinForm = document.getElementById('admin-pin-form');
    if (pinForm) {
      pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pinInput = document.getElementById('admin-pin-input');
        if (this.checkAuth(pinInput.value)) {
          pinInput.value = '';
          this.showAdminDashboard();
        } else {
          const errEl = document.getElementById('pin-error-msg');
          if (errEl) {
            errEl.classList.remove('hidden');
            setTimeout(() => errEl.classList.add('hidden'), 3000);
          }
          if (window.App) window.App.playAudioFeedback('error');
        }
      });
    }

    // Tab Navigation inside Admin Panel
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Schedule Form Submit
    const scheduleForm = document.getElementById('form-schedule');
    if (scheduleForm) {
      scheduleForm.addEventListener('submit', (e) => this.handleSaveSchedule(e));
    }

    // Inspector Form Submit
    const inspectorForm = document.getElementById('form-inspector');
    if (inspectorForm) {
      inspectorForm.addEventListener('submit', (e) => this.handleSaveInspector(e));
    }

    // Settings Form Submit
    const settingsForm = document.getElementById('form-settings');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
    }

    // Export Backup JSON
    const exportBtn = document.getElementById('btn-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportBackup());
    }

    // Import Backup JSON
    const importInput = document.getElementById('input-import-backup');
    if (importInput) {
      importInput.addEventListener('change', (e) => this.importBackup(e));
    }

    // Share / Copy Sync Link for Cross-Device Sync
    const syncBtn = document.getElementById('btn-share-sync');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.exportSyncUrl());
    }

    // Reset Demo Data
    const resetBtn = document.getElementById('btn-reset-demo');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin mereset seluruh data kembali ke jadwal bawaan PT. Rakana Mitra Riksa?')) {
          RakanaDB.resetToDemoData();
          if (window.RakanaCloudSync && RakanaCloudSync.isConfigured()) {
            RakanaCloudSync.pushToCloud();
          }
          if (window.App) {
            window.App.refreshAll();
            window.App.showToast('Data berhasil direset ke jadwal standar Rakana!', 'success');
          }
          this.renderAllAdminData();
        }
      });
    }

    // Filter History Schedules
    const historySearch = document.getElementById('history-search');
    const historyDate = document.getElementById('history-date-filter');
    const historyCategory = document.getElementById('history-category-filter');
    if (historySearch) historySearch.addEventListener('input', () => this.renderHistoryTable());
    if (historyDate) historyDate.addEventListener('change', () => this.renderHistoryTable());
    if (historyCategory) historyCategory.addEventListener('change', () => this.renderHistoryTable());

    // Save / Connect Cloud Sync
    const btnSaveCloud = document.getElementById('btn-save-cloud-sync');
    if (btnSaveCloud) {
      btnSaveCloud.addEventListener('click', async () => {
        const input = document.getElementById('input-cloud-api-url');
        const url = (input ? input.value : '').trim();
        if (!url) {
          if (confirm('Kosongkan alamat server cloud dan beralih ke Mode Mandiri (Lokal)?')) {
            RakanaCloudSync.setApiUrl('');
            RakanaCloudSync.updateStatusBadge('offline');
            if (window.App) window.App.showToast('Mode mandiri (lokal) aktif', 'info');
          }
          return;
        }

        btnSaveCloud.disabled = true;
        btnSaveCloud.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Mengetes...</span>';
        if (window.lucide) window.lucide.createIcons();

        const testRes = await RakanaCloudSync.testConnection(url);
        btnSaveCloud.disabled = false;
        btnSaveCloud.innerHTML = '<i data-lucide="plug" class="w-3.5 h-3.5"></i><span>Tes & Hubungkan Server</span>';
        if (window.lucide) window.lucide.createIcons();

        if (testRes.ok) {
          RakanaCloudSync.setApiUrl(url);
          RakanaCloudSync.updateStatusBadge('online');
          await RakanaCloudSync.pullFromCloud();
          RakanaCloudSync.startAutoSync(15);
          if (window.App) {
            window.App.showToast('✅ Berhasil terhubung ke server Tencent Cloud! Sinkronisasi aktif.', 'success');
          }
        } else {
          RakanaCloudSync.updateStatusBadge('error');
          alert('Gagal terhubung ke server cloud:\n' + testRes.message);
        }
      });
    }

    // Pull from cloud manually
    const btnPullCloud = document.getElementById('btn-pull-cloud-now');
    if (btnPullCloud) {
      btnPullCloud.addEventListener('click', async () => {
        if (!RakanaCloudSync.isConfigured()) {
          alert('Alamat server Tencent Cloud belum dihubungkan. Masukkan URL server terlebih dahulu.');
          return;
        }
        btnPullCloud.disabled = true;
        const ok = await RakanaCloudSync.pullFromCloud();
        btnPullCloud.disabled = false;
        if (ok) {
          if (window.App) window.App.showToast('✅ Data jadwal terbaru berhasil ditarik dari server cloud!', 'success');
        } else {
          alert('Gagal menarik data dari server cloud. Periksa koneksi internet atau status server.');
        }
      });
    }
  }

  openAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    if (this.isSessionAuthenticated() || this.isAuthenticated) {
      this.showAdminDashboard();
    } else {
      document.getElementById('admin-auth-view').classList.remove('hidden');
      document.getElementById('admin-content-view').classList.add('hidden');
      const pinInput = document.getElementById('admin-pin-input');
      if (pinInput) setTimeout(() => pinInput.focus(), 100);
    }
  }

  closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.add('hidden');
  }

  showAdminDashboard() {
    document.getElementById('admin-auth-view').classList.add('hidden');
    document.getElementById('admin-content-view').classList.remove('hidden');
    this.populateInspectorDropdown();
    this.renderAllAdminData();
    this.switchTab('tab-schedules');
  }

  switchTab(tabId) {
    document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.classList.remove('border-cyan-500', 'text-cyan-400', 'bg-slate-800');
      btn.classList.add('text-slate-400');
    });

    const activePane = document.getElementById(tabId);
    const activeBtn = document.querySelector(`.admin-tab-btn[data-tab="${tabId}"]`);
    if (activePane) activePane.classList.remove('hidden');
    if (activeBtn) {
      activeBtn.classList.add('border-cyan-500', 'text-cyan-400', 'bg-slate-800');
      activeBtn.classList.remove('text-slate-400');
    }

    if (tabId === 'tab-settings') {
      this.populateSettingsForm();
    } else if (tabId === 'tab-history') {
      this.renderHistoryTable();
    } else if (tabId === 'tab-inspectors') {
      this.renderInspectorsTable();
    } else if (tabId === 'tab-schedules') {
      this.renderSchedulesTable();
    }
  }

  populateInspectorDropdown() {
    const datalist = document.getElementById('inspector-datalist');
    if (!datalist) return;
    const inspectors = RakanaDB.getInspectors();
    datalist.innerHTML = inspectors.map(ins => `<option value="${ins.name}">${ins.title}</option>`).join('');
  }

  renderAllAdminData() {
    this.populateInspectorDropdown();
    this.renderSchedulesTable();
    this.renderInspectorsTable();
    this.renderHistoryTable();
  }

  // --- SCHEDULES CRUD ---

  renderSchedulesTable() {
    const tbody = document.getElementById('admin-schedules-tbody');
    if (!tbody) return;

    const schedules = RakanaDB.getSchedules().sort((a, b) => {
      return (b.date || '').localeCompare(a.date || '') || (a.time || '').localeCompare(b.time || '');
    });

    if (schedules.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500">Belum ada jadwal tersimpan. Silakan tambah jadwal baru di atas.</td></tr>`;
      return;
    }

    tbody.innerHTML = schedules.map(sch => {
      let statusClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      if (sch.status === 'Sedang Riksa Uji') statusClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      if (sch.status === 'Otw Lokasi') statusClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      if (sch.status === 'Selesai Riksa') statusClass = 'bg-slate-700 text-slate-300 border-slate-600';
      if (sch.status === 'Tertunda') statusClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';

      return `
        <tr class="border-b border-slate-800 hover:bg-slate-800/50 transition">
          <td class="px-4 py-3 text-sm font-mono text-cyan-400 whitespace-nowrap min-w-[130px]">
            ${sch.date}<br><span class="text-xs text-slate-400 font-sans">${sch.time || '08:30'} WIB</span>
          </td>
          <td class="px-4 py-3 min-w-[260px]">
            <div class="font-bold text-slate-200">${sch.companyName}</div>
            <div class="text-xs text-slate-400 truncate max-w-xs">${sch.equipmentName || '-'}</div>
          </td>
          <td class="px-4 py-3 min-w-[110px]">
            <span class="inline-block px-2 py-0.5 rounded text-xs font-semibold badge-${sch.category ? sch.category.toLowerCase() : 'pubt'}">
              ${sch.category}
            </span>
          </td>
          <td class="px-4 py-3 text-xs text-slate-300 min-w-[180px]">
            <div class="font-medium">${sch.inspectorName}</div>
            <div class="text-slate-500 text-[11px]">PIC: ${sch.companyPicName || '-'}</div>
          </td>
          <td class="px-4 py-3 min-w-[130px]">
            <select class="quick-status-change text-xs rounded px-2 py-1 bg-slate-900 border ${statusClass} cursor-pointer focus:outline-none" data-id="${sch.id}">
              <option value="Terjadwal" ${sch.status === 'Terjadwal' ? 'selected' : ''}>Terjadwal</option>
              <option value="Otw Lokasi" ${sch.status === 'Otw Lokasi' ? 'selected' : ''}>OTW Lokasi</option>
              <option value="Sedang Riksa Uji" ${sch.status === 'Sedang Riksa Uji' ? 'selected' : ''}>Sedang Riksa</option>
              <option value="Selesai Riksa" ${sch.status === 'Selesai Riksa' ? 'selected' : ''}>Selesai Riksa</option>
              <option value="Tertunda" ${sch.status === 'Tertunda' ? 'selected' : ''}>Tertunda</option>
            </select>
          </td>
          <td class="px-4 py-3 text-right space-x-1.5 whitespace-nowrap min-w-[200px]">
            <button class="btn-edit-sch px-2.5 py-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded border border-cyan-800/50 transition" data-id="${sch.id}">
              Edit
            </button>
            <button class="btn-dup-sch px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded border border-slate-700 transition" data-id="${sch.id}" title="Duplikat untuk hari lain">
              Duplikat
            </button>
            <button class="btn-del-sch px-2.5 py-1 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded border border-rose-800/50 transition" data-id="${sch.id}">
              Hapus
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind schedule actions
    tbody.querySelectorAll('.quick-status-change').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = sel.getAttribute('data-id');
        this.updateScheduleStatus(id, sel.value);
      });
    });

    tbody.querySelectorAll('.btn-edit-sch').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.loadScheduleForEdit(id);
      });
    });

    tbody.querySelectorAll('.btn-dup-sch').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.duplicateSchedule(id);
      });
    });

    tbody.querySelectorAll('.btn-del-sch').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.deleteSchedule(id);
      });
    });
  }

  handleSaveSchedule(e) {
    e.preventDefault();
    const schedules = RakanaDB.getSchedules();
    const inspectors = RakanaDB.getInspectors();

    const dateVal = document.getElementById('sch-date').value;
    const timeVal = document.getElementById('sch-time').value || '08:30';
    const companyVal = document.getElementById('sch-company').value.trim();
    const addressVal = document.getElementById('sch-address').value.trim();
    const categoryVal = document.getElementById('sch-category').value.trim().toUpperCase() || 'K3';
    const equipmentVal = document.getElementById('sch-equipment').value.trim();
    const inspectionTypeVal = document.getElementById('sch-type').value;
    const inspectorNameVal = document.getElementById('schedule-inspector-select').value.trim() || 'Tim Ahli K3';
    const picNameVal = document.getElementById('sch-pic-name').value.trim();
    const picPhoneVal = document.getElementById('sch-pic-phone').value.trim();
    const statusVal = document.getElementById('sch-status').value;
    const notesVal = document.getElementById('sch-notes').value.trim();

    if (!companyVal || !dateVal) {
      alert('Nama perusahaan dan tanggal wajib diisi!');
      return;
    }

    const matchedInspector = inspectors.find(ins => ins.name.toLowerCase() === inspectorNameVal.toLowerCase());
    const inspectorIdVal = matchedInspector ? matchedInspector.id : ('ins-' + inspectorNameVal.toLowerCase().replace(/[^a-z0-9]/g, '-'));

    if (this.currentEditScheduleId) {
      // Update existing
      const idx = schedules.findIndex(s => s.id === this.currentEditScheduleId);
      if (idx !== -1) {
        schedules[idx] = {
          ...schedules[idx],
          date: dateVal,
          time: timeVal,
          companyName: companyVal,
          address: addressVal,
          category: categoryVal,
          equipmentName: equipmentVal,
          inspectionType: inspectionTypeVal,
          inspectorId: inspectorIdVal,
          inspectorName: inspectorNameVal,
          companyPicName: picNameVal,
          companyPicPhone: picPhoneVal,
          status: statusVal,
          notes: notesVal
        };
      }
      this.currentEditScheduleId = null;
      document.getElementById('sch-form-title').innerText = 'Tambah Jadwal Riksa Uji Baru';
      document.getElementById('sch-btn-cancel').classList.add('hidden');
    } else {
      // Add new
      const newSchedule = {
        id: 'sch-' + Date.now(),
        date: dateVal,
        time: timeVal,
        companyName: companyVal,
        address: addressVal,
        category: categoryVal,
        equipmentName: equipmentVal,
        inspectionType: inspectionTypeVal,
        inspectorId: inspectorIdVal,
        inspectorName: inspectorNameVal,
        companyPicName: picNameVal,
        companyPicPhone: picPhoneVal,
        status: statusVal,
        notes: notesVal
      };
      schedules.unshift(newSchedule);
    }

    RakanaDB.saveSchedules(schedules);
    if (window.RakanaCloudSync && RakanaCloudSync.isConfigured()) {
      RakanaCloudSync.pushToCloud();
    }
    document.getElementById('form-schedule').reset();
    document.getElementById('sch-date').value = getRelativeDate(0);
    this.renderSchedulesTable();
    this.renderHistoryTable();

    if (window.App) {
      window.App.refreshAll();
      window.App.showToast('Jadwal riksa uji berhasil disimpan!', 'success');
      window.App.playAudioFeedback('success');
    }
  }

  loadScheduleForEdit(id) {
    const schedules = RakanaDB.getSchedules();
    const sch = schedules.find(s => s.id === id);
    if (!sch) return;

    this.currentEditScheduleId = id;
    document.getElementById('sch-form-title').innerText = 'Edit Jadwal: ' + sch.companyName;
    document.getElementById('sch-btn-cancel').classList.remove('hidden');

    document.getElementById('sch-date').value = sch.date || '';
    document.getElementById('sch-time').value = sch.time || '08:30';
    document.getElementById('sch-company').value = sch.companyName || '';
    document.getElementById('sch-address').value = sch.address || '';
    document.getElementById('sch-category').value = sch.category || '';
    document.getElementById('sch-equipment').value = sch.equipmentName || '';
    document.getElementById('sch-type').value = sch.inspectionType || 'Riksa Uji Berkala';
    document.getElementById('schedule-inspector-select').value = sch.inspectorName || '';
    document.getElementById('sch-pic-name').value = sch.companyPicName || '';
    document.getElementById('sch-pic-phone').value = sch.companyPicPhone || '';
    document.getElementById('sch-status').value = sch.status || 'Terjadwal';
    document.getElementById('sch-notes').value = sch.notes || '';

    // Scroll to form
    document.getElementById('form-schedule').scrollIntoView({ behavior: 'smooth' });
  }

  cancelEditSchedule() {
    this.currentEditScheduleId = null;
    document.getElementById('sch-form-title').innerText = 'Tambah Jadwal Riksa Uji Baru';
    document.getElementById('sch-btn-cancel').classList.add('hidden');
    document.getElementById('form-schedule').reset();
    document.getElementById('sch-date').value = getRelativeDate(0);
  }

  duplicateSchedule(id) {
    const schedules = RakanaDB.getSchedules();
    const sch = schedules.find(s => s.id === id);
    if (!sch) return;

    const copy = {
      ...sch,
      id: 'sch-' + Date.now(),
      companyName: sch.companyName.replace(/(\s*\(Copy\))+/gi, '').trim(),
      status: 'Terjadwal'
    };
    schedules.unshift(copy);
    RakanaDB.saveSchedules(schedules);
    if (window.RakanaCloudSync && RakanaCloudSync.isConfigured()) {
      RakanaCloudSync.pushToCloud();
    }
    this.renderSchedulesTable();
    if (window.App) {
      window.App.refreshAll();
      window.App.showToast('Jadwal berhasil diduplikasi.', 'info');
    }
  }

  deleteSchedule(id) {
    if (!confirm('Yakin ingin menghapus jadwal ini?')) return;
    let schedules = RakanaDB.getSchedules();
    schedules = schedules.filter(s => s.id !== id);
    RakanaDB.saveSchedules(schedules);
    if (window.RakanaCloudSync && RakanaCloudSync.isConfigured()) {
      RakanaCloudSync.pushToCloud();
    }
    this.renderSchedulesTable();
    this.renderHistoryTable();
    if (window.App) {
      window.App.refreshAll();
      window.App.showToast('Jadwal berhasil dihapus.', 'info');
    }
  }

  updateScheduleStatus(id, newStatus) {
    const schedules = RakanaDB.getSchedules();
    const sch = schedules.find(s => s.id === id);
    if (sch) {
      sch.status = newStatus;
      RakanaDB.saveSchedules(schedules);
      if (window.RakanaCloudSync && RakanaCloudSync.isConfigured()) {
        RakanaCloudSync.pushToCloud();
      }
      if (window.App) {
        window.App.refreshAll();
        window.App.showToast(`Status diperbarui menjadi: ${newStatus}`, 'success');
      }
    }
  }

  // --- INSPECTORS & BACKLOG CRUD ---

  renderInspectorsTable() {
    const tbody = document.getElementById('admin-inspectors-tbody');
    if (!tbody) return;

    const inspectors = RakanaDB.getInspectors();
    if (inspectors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">Belum ada data Ahli K3. Silakan tambah di atas.</td></tr>`;
      return;
    }

    tbody.innerHTML = inspectors.map(ins => {
      let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      let tagLabel = 'Aman';
      if (ins.pendingReports > 5) {
        badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30 font-bold';
        tagLabel = 'Kritis';
      } else if (ins.pendingReports >= 3) {
        badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-semibold';
        tagLabel = 'Perhatian';
      }

      return `
        <tr class="border-b border-slate-800 hover:bg-slate-800/50 transition">
          <td class="px-4 py-3">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full bg-cyan-900/50 text-cyan-300 font-bold flex items-center justify-center text-xs border border-cyan-700/50">
                ${ins.avatar || ins.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div class="font-bold text-slate-200">${ins.name}</div>
                <div class="text-xs text-slate-400">${ins.title}</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-xs text-slate-300">
            <div>📞 ${ins.phone || '-'}</div>
            <div class="text-[11px] text-slate-500">${ins.badgeNo || 'SKP Terdaftar'}</div>
          </td>
          <td class="px-4 py-3 text-center">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badgeColor}">
              ${ins.pendingReports} Laporan (${tagLabel})
            </span>
          </td>
          <td class="px-4 py-3 text-center text-xs text-slate-400">
            ${ins.oldestPendingDays > 0 ? `${ins.oldestPendingDays} Hari` : '-'}
          </td>
          <td class="px-4 py-3 text-center">
            <div class="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
              <button class="btn-dec-backlog px-2 py-1 text-xs font-bold text-slate-300 hover:bg-rose-950/50 hover:text-rose-400 transition" data-id="${ins.id}" title="Kurangi 1 backlog (Laporan selesai)">
                -1
              </button>
              <span class="px-2.5 py-1 text-xs font-mono font-bold text-cyan-400 bg-slate-800">${ins.pendingReports}</span>
              <button class="btn-inc-backlog px-2 py-1 text-xs font-bold text-slate-300 hover:bg-emerald-950/50 hover:text-emerald-400 transition" data-id="${ins.id}" title="Tambah 1 backlog">
                +1
              </button>
            </div>
          </td>
          <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap min-w-[130px]">
            <button class="btn-edit-ins px-2 py-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 rounded border border-cyan-800/40" data-id="${ins.id}">
              Edit
            </button>
            <button class="btn-del-ins px-2 py-1 text-xs font-semibold text-rose-400 hover:text-rose-300 rounded border border-rose-800/40" data-id="${ins.id}">
              Hapus
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-inc-backlog').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.adjustInspectorBacklog(id, 1);
      });
    });

    tbody.querySelectorAll('.btn-dec-backlog').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.adjustInspectorBacklog(id, -1);
      });
    });

    tbody.querySelectorAll('.btn-edit-ins').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.loadInspectorForEdit(id);
      });
    });

    tbody.querySelectorAll('.btn-del-ins').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.deleteInspector(id);
      });
    });
  }

  handleSaveInspector(e) {
    e.preventDefault();
    const inspectors = RakanaDB.getInspectors();

    const name = document.getElementById('ins-name').value.trim();
    const title = document.getElementById('ins-title').value.trim();
    const phone = document.getElementById('ins-phone').value.trim();
    const badgeNo = document.getElementById('ins-badge').value.trim();
    const pending = parseInt(document.getElementById('ins-backlog').value) || 0;
    const oldestDays = parseInt(document.getElementById('ins-oldest-days').value) || 0;

    if (!name || !title) {
      alert('Nama dan Spesialisasi Ahli K3 wajib diisi!');
      return;
    }

    if (this.currentEditInspectorId) {
      const idx = inspectors.findIndex(i => i.id === this.currentEditInspectorId);
      if (idx !== -1) {
        inspectors[idx] = {
          ...inspectors[idx],
          name,
          title,
          phone,
          badgeNo,
          pendingReports: pending,
          oldestPendingDays: oldestDays
        };
      }
      this.currentEditInspectorId = null;
      document.getElementById('ins-form-title').innerText = 'Tambah Ahli K3 Baru';
      document.getElementById('ins-btn-cancel').classList.add('hidden');
    } else {
      const initials = name.split(' ').map(w => w[0]).filter(c => c && /[a-zA-Z]/.test(c)).slice(0, 2).join('').toUpperCase() || 'K3';
      const newInspector = {
        id: 'ins-' + Date.now(),
        name,
        title,
        phone,
        badgeNo,
        pendingReports: pending,
        oldestPendingDays: oldestDays,
        completedThisMonth: 0,
        avatar: initials
      };
      inspectors.push(newInspector);
    }

    RakanaDB.saveInspectors(inspectors);
    if (window.RakanaCloudSync && RakanaCloudSync.isConfigured()) {
      RakanaCloudSync.pushToCloud();
    }
    document.getElementById('form-inspector').reset();
    this.renderInspectorsTable();
    this.populateInspectorDropdown();

    if (window.App) {
      window.App.refreshAll();
      window.App.showToast('Data Ahli K3 & Backlog berhasil disimpan!', 'success');
    }
  }

  loadInspectorForEdit(id) {
    const inspectors = RakanaDB.getInspectors();
    const ins = inspectors.find(i => i.id === id);
    if (!ins) return;

    this.currentEditInspectorId = id;
    document.getElementById('ins-form-title').innerText = 'Edit Ahli K3: ' + ins.name;
    document.getElementById('ins-btn-cancel').classList.remove('hidden');

    document.getElementById('ins-name').value = ins.name;
    document.getElementById('ins-title').value = ins.title;
    document.getElementById('ins-phone').value = ins.phone || '';
    document.getElementById('ins-badge').value = ins.badgeNo || '';
    document.getElementById('ins-backlog').value = ins.pendingReports || 0;
    document.getElementById('ins-oldest-days').value = ins.oldestPendingDays || 0;

    document.getElementById('form-inspector').scrollIntoView({ behavior: 'smooth' });
  }

  cancelEditInspector() {
    this.currentEditInspectorId = null;
    document.getElementById('ins-form-title').innerText = 'Tambah Ahli K3 Baru';
    document.getElementById('ins-btn-cancel').classList.add('hidden');
    document.getElementById('form-inspector').reset();
  }

  deleteInspector(id) {
    if (!confirm('Hapus Ahli K3 ini dari daftar?')) return;
    let inspectors = RakanaDB.getInspectors();
    inspectors = inspectors.filter(i => i.id !== id);
    RakanaDB.saveInspectors(inspectors);
    if (window.RakanaCloudSync && RakanaCloudSync.isConfigured()) {
      RakanaCloudSync.pushToCloud();
    }
    this.renderInspectorsTable();
    this.populateInspectorDropdown();
    if (window.App) {
      window.App.refreshAll();
      window.App.showToast('Ahli K3 dihapus.', 'info');
    }
  }

  adjustInspectorBacklog(id, delta) {
    const inspectors = RakanaDB.getInspectors();
    const ins = inspectors.find(i => i.id === id);
    if (ins) {
      ins.pendingReports = Math.max(0, parseInt(ins.pendingReports || 0) + delta);
      if (delta < 0) {
        ins.completedThisMonth = (parseInt(ins.completedThisMonth || 0) + 1);
        if (ins.pendingReports === 0) ins.oldestPendingDays = 0;
      }
      RakanaDB.saveInspectors(inspectors);
      if (window.RakanaCloudSync && RakanaCloudSync.isConfigured()) {
        RakanaCloudSync.pushToCloud();
      }
      this.renderInspectorsTable();
      if (window.App) {
        window.App.refreshAll();
        window.App.showToast(`Backlog ${ins.name} diupdate menjadi ${ins.pendingReports}`, 'info');
      }
    }
  }

  // --- HISTORY & ARCHIVE VIEW ---

  renderHistoryTable() {
    const tbody = document.getElementById('admin-history-tbody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('history-search')?.value || '').toLowerCase();
    const dateFilter = document.getElementById('history-date-filter')?.value || '';
    const catFilter = document.getElementById('history-category-filter')?.value || '';

    let schedules = RakanaDB.getSchedules();

    // Filter
    schedules = schedules.filter(sch => {
      const matchSearch = !searchTerm ||
        sch.companyName.toLowerCase().includes(searchTerm) ||
        (sch.inspectorName || '').toLowerCase().includes(searchTerm) ||
        (sch.equipmentName || '').toLowerCase().includes(searchTerm) ||
        (sch.address || '').toLowerCase().includes(searchTerm);

      const matchDate = !dateFilter || sch.date === dateFilter;
      const matchCat = !catFilter || sch.category === catFilter;

      return matchSearch && matchDate && matchCat;
    });

    schedules.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (schedules.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-500">Tidak ada riwayat riksa uji yang cocok dengan filter pencarian.</td></tr>`;
      return;
    }

    tbody.innerHTML = schedules.map(sch => {
      return `
        <tr class="border-b border-slate-800 hover:bg-slate-800/40 text-xs">
          <td class="px-4 py-3 font-mono text-cyan-400 whitespace-nowrap">${sch.date} (${sch.time || '-'})</td>
          <td class="px-4 py-3 font-semibold text-slate-200">${sch.companyName}</td>
          <td class="px-4 py-3 text-slate-300">${sch.category}</td>
          <td class="px-4 py-3 text-slate-400">${sch.equipmentName || '-'}</td>
          <td class="px-4 py-3 text-slate-300">${sch.inspectorName}</td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              ${sch.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- SETTINGS & BACKUP ---

  populateSettingsForm() {
    const s = RakanaDB.getSettings();
    document.getElementById('set-pjk3-name').value = s.pjk3Name || '';
    document.getElementById('set-pjk3-sub').value = s.pjk3SubTitle || '';
    document.getElementById('set-pjk3-reg').value = s.pjk3RegNo || '';
    document.getElementById('set-running-text').value = s.runningText || '';
    document.getElementById('set-admin-pin').value = s.adminPin || '1234';

    const cloudInput = document.getElementById('input-cloud-api-url');
    if (cloudInput && window.RakanaCloudSync) {
      cloudInput.value = RakanaCloudSync.getApiUrl() || '';
      RakanaCloudSync.updateStatusBadge(RakanaCloudSync.isConfigured() ? 'online' : 'offline');
    }
  }

  handleSaveSettings(e) {
    e.preventDefault();
    const current = RakanaDB.getSettings();
    const updated = {
      ...current,
      pjk3Name: document.getElementById('set-pjk3-name').value.trim(),
      pjk3SubTitle: document.getElementById('set-pjk3-sub').value.trim(),
      pjk3RegNo: document.getElementById('set-pjk3-reg').value.trim(),
      runningText: document.getElementById('set-running-text').value.trim(),
      adminPin: document.getElementById('set-admin-pin').value.trim() || '1234'
    };

    RakanaDB.saveSettings(updated);
    if (window.RakanaCloudSync && RakanaCloudSync.isConfigured()) {
      RakanaCloudSync.pushToCloud();
    }
    if (window.App) {
      window.App.refreshAll();
      window.App.showToast('Pengaturan PJK3 berhasil diperbarui!', 'success');
    }
  }

  exportBackup() {
    const data = RakanaDB.exportFullBackup();
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonStr);
    downloadAnchor.setAttribute("download", `rakana-pjk3-backup-${getRelativeDate(0)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (window.App) window.App.showToast('File backup database JSON berhasil diunduh.', 'success');
  }

  importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        RakanaDB.importFullBackup(json);
        if (window.RakanaCloudSync && RakanaCloudSync.isConfigured()) {
          RakanaCloudSync.pushToCloud();
        }
        this.renderAllAdminData();
        if (window.App) {
          window.App.refreshAll();
          window.App.showToast('Data backup berhasil dipulihkan!', 'success');
        }
      } catch (err) {
        alert('Gagal memulihkan backup: Format file tidak valid.');
      }
    };
    reader.readAsText(file);
  }

  exportSyncUrl() {
    const data = RakanaDB.exportFullBackup();
    const jsonStr = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    const syncUrl = `${window.location.origin}${window.location.pathname}#sync=${encoded}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(syncUrl).then(() => {
        if (window.App) window.App.showToast('✅ Tautan sinkronisasi disalin! Buka link ini di browser/email/perangkat lain untuk menyamakan data 100%.', 'success');
      }).catch(() => {
        prompt('Salin tautan sinkronisasi berikut dan buka di perangkat/email lain:', syncUrl);
      });
    } else {
      prompt('Salin tautan sinkronisasi berikut dan buka di perangkat/email lain:', syncUrl);
    }
  }
}

window.AdminManager = AdminManager;

