/**
 * Cloud Synchronization Module for Rakana PJK3
 * Connects Frontend to Tencent Cloud Standalone Backend API
 * Enables Real-Time Cross-PC & TV Synchronization
 */

class RakanaCloudSync {
  static STORAGE_KEY = 'rakana_cloud_api_url';
  static isSyncing = false;
  static syncTimer = null;
  static lastServerTimestamp = null;

  static getApiUrl() {
    try {
      const url = localStorage.getItem(this.STORAGE_KEY) || '';
      return url.trim().replace(/\/+$/, '');
    } catch (e) {
      return '';
    }
  }

  static setApiUrl(url) {
    try {
      const cleanUrl = (url || '').trim().replace(/\/+$/, '');
      if (cleanUrl) {
        localStorage.setItem(this.STORAGE_KEY, cleanUrl);
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
      return cleanUrl;
    } catch (e) {
      return '';
    }
  }

  static isConfigured() {
    return !!this.getApiUrl();
  }

  /**
   * Test connection to Cloud API
   */
  static async testConnection(targetUrl = null) {
    const url = (targetUrl !== null ? targetUrl : this.getApiUrl()).trim().replace(/\/+$/, '');
    if (!url) {
      return { ok: false, message: 'Alamat URL server belum diisi.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { ok: false, message: `Server merespon dengan status HTTP ${res.status}` };
      }

      const json = await res.json();
      return {
        ok: true,
        message: 'Koneksi ke server Tencent Cloud berhasil!',
        data: json
      };
    } catch (err) {
      return {
        ok: false,
        message: err.name === 'AbortError'
          ? 'Koneksi waktu habis (Timeout). Pastikan port 3001 sudah dibuka di Firewall Tencent Cloud.'
          : `Gagal terhubung: ${err.message}`
      };
    }
  }

  /**
   * Pull latest data from Cloud and update local RakanaDB
   */
  static async pullFromCloud(silent = false) {
    const url = this.getApiUrl();
    if (!url || this.isSyncing) return false;

    try {
      this.isSyncing = true;
      const res = await fetch(`${url}/api/schedule/data?_t=${Date.now()}`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data || !Array.isArray(data.schedules)) {
        throw new Error('Format data dari cloud tidak valid');
      }

      // Check if data actually changed to prevent unnecessary re-renders
      if (this.lastServerTimestamp && this.lastServerTimestamp === data.lastUpdated) {
        this.isSyncing = false;
        return true;
      }

      this.lastServerTimestamp = data.lastUpdated || null;

      // Update local storage via RakanaDB
      if (data.settings) RakanaDB.saveSettings(data.settings);
      if (data.inspectors) RakanaDB.saveInspectors(data.inspectors);
      if (data.schedules) RakanaDB.saveSchedules(data.schedules);

      // Trigger UI re-render on active screens (TV slide 1, slide 2, stats)
      if (window.App && typeof window.App.refreshAll === 'function') {
        window.App.refreshAll();
      }

      if (window.adminManager && typeof window.adminManager.renderAllAdminData === 'function') {
        window.adminManager.renderAllAdminData();
      }

      this.updateStatusBadge('online');
      this.isSyncing = false;
      return true;
    } catch (err) {
      this.isSyncing = false;
      this.updateStatusBadge('error');
      if (!silent) {
        console.warn('[CloudSync Pull Failed]:', err.message);
      }
      return false;
    }
  }

  /**
   * Push local data to Cloud
   */
  static async pushToCloud() {
    const url = this.getApiUrl();
    if (!url) return false;

    try {
      const payload = {
        settings: RakanaDB.getSettings(),
        inspectors: RakanaDB.getInspectors(),
        schedules: RakanaDB.getSchedules()
      };

      const res = await fetch(`${url}/api/schedule/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();
      if (result.lastUpdated) {
        this.lastServerTimestamp = result.lastUpdated;
      }

      this.updateStatusBadge('online');
      return true;
    } catch (err) {
      console.warn('[CloudSync Push Failed]:', err.message);
      this.updateStatusBadge('error');
      return false;
    }
  }

  /**
   * Start auto-polling sync (Runs every 15s to keep TV & PCs synchronized)
   */
  static startAutoSync(intervalSec = 15) {
    if (this.syncTimer) clearInterval(this.syncTimer);

    if (!this.isConfigured()) {
      this.updateStatusBadge('offline');
      return;
    }

    // Initial pull
    this.pullFromCloud(true);

    // Periodic pull
    this.syncTimer = setInterval(() => {
      this.pullFromCloud(true);
    }, Math.max(5, intervalSec) * 1000);
  }

  /**
   * Update Status Badges in Admin UI
   */
  static updateStatusBadge(status) {
    const badge = document.getElementById('cloud-sync-status-badge');
    if (!badge) return;

    if (status === 'online') {
      badge.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center space-x-1.5';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Terhubung ke Tencent Cloud (Auto-Sync Aktif)</span>`;
    } else if (status === 'error') {
      badge.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-950 text-rose-400 border border-rose-800 flex items-center space-x-1.5';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span><span>Koneksi Server Terputus (Mode Cache Lokal)</span>`;
    } else {
      badge.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 text-slate-400 border border-slate-700 flex items-center space-x-1.5';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-500"></span><span>Mode Mandiri (Lokal Browser)</span>`;
    }
  }
}

window.RakanaCloudSync = RakanaCloudSync;
