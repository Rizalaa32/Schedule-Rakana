/**
 * Supabase Realtime Cloud Synchronization for Schedule-Rakana
 * Enables instant, sub-second cross-device & TV synchronization via WebSocket.
 */

class RakanaSupabaseSync {
  static DEFAULT_URL = 'https://zhygkryxgjdlhpqomhjo.supabase.co';
  static DEFAULT_KEY = 'sb_publishable_K5lMRKiTU0KOoTGFn_RDIw_DsFEBPzc';
  static TABLE_NAME = 'rakana_sync';
  static RECORD_ID = 'main';

  static client = null;
  static realtimeChannel = null;
  static isSyncing = false;
  static lastPushedTimestamp = null;
  static pushDebounceTimer = null;
  static pollIntervalTimer = null;

  static getUrl() {
    return localStorage.getItem('rakana_supabase_url') || this.DEFAULT_URL;
  }

  static getKey() {
    return localStorage.getItem('rakana_supabase_key') || this.DEFAULT_KEY;
  }

  static setCredentials(url, key) {
    if (url) localStorage.setItem('rakana_supabase_url', url.trim());
    else localStorage.removeItem('rakana_supabase_url');

    if (key) localStorage.setItem('rakana_supabase_key', key.trim());
    else localStorage.removeItem('rakana_supabase_key');

    this.init();
  }

  /**
   * Initialize Supabase Client and Start Realtime Listening
   */
  static init() {
    if (typeof window.supabase === 'undefined') {
      console.warn('[Supabase Sync] Supabase JS SDK not loaded yet, retrying in 1s...');
      setTimeout(() => this.init(), 1000);
      return;
    }

    const url = this.getUrl();
    const key = this.getKey();

    if (!url || !key) {
      console.warn('[Supabase Sync] Missing Supabase URL or Key');
      this.updateStatusUI('offline', 'Kredensial belum lengkap');
      return;
    }

    try {
      this.client = window.supabase.createClient(url, key, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      console.log('[Supabase Sync] Client initialized with project:', url);
      this.updateStatusUI('connecting', 'Menghubungkan ke Supabase...');

      // 1. Initial Pull
      this.pullFromCloud(true);

      // 2. Setup Realtime Subscription
      this.setupRealtimeSubscription();

      // 3. Fallback polling every 30s in case WebSocket drops on smart TVs
      if (this.pollIntervalTimer) clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = setInterval(() => {
        this.pullFromCloud(false);
      }, 30000);

    } catch (err) {
      console.error('[Supabase Sync] Init error:', err);
      this.updateStatusUI('error', 'Gagal inisialisasi: ' + err.message);
    }
  }

  /**
   * Setup Realtime WebSocket Channel
   */
  static setupRealtimeSubscription() {
    if (!this.client) return;

    if (this.realtimeChannel) {
      this.client.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = this.client
      .channel('rakana_realtime_board')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.TABLE_NAME,
          filter: `id=eq.${this.RECORD_ID}`
        },
        (payload) => {
          console.log('[Supabase Realtime] Event received:', payload);
          if (payload.new && payload.new.payload) {
            this.handleRemoteUpdate(payload.new.payload);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          this.updateStatusUI('online', 'Real-Time Aktif (Live WebSocket)');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.updateStatusUI('warning', 'WebSocket terputus (Mode polling aktif)');
        }
      });
  }

  /**
   * Pull data from Supabase and merge safely
   */
  static async pullFromCloud(isInitial = false) {
    if (!this.client || this.isSyncing) return;

    try {
      this.isSyncing = true;
      const { data, error } = await this.client
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', this.RECORD_ID)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
        console.error('[Supabase Sync] Pull error:', error.message);
        this.updateStatusUI('error', 'Gagal tarik data: ' + error.message);
        return;
      }

      if (data && data.payload) {
        this.handleRemoteUpdate(data.payload);
        this.updateStatusUI('online', 'Tersinkronisasi dengan Supabase Cloud');
      } else if (isInitial) {
        // If remote table is empty, seed it with our local default data
        console.log('[Supabase Sync] Remote table empty, pushing local initial data...');
        this.pushToCloud(true);
      }
    } catch (err) {
      console.error('[Supabase Sync] Unexpected pull error:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Handle incoming remote payload
   */
  static handleRemoteUpdate(remote) {
    if (!remote) return;

    // Avoid echo loop if we just pushed this exact update
    if (this.lastPushedTimestamp && remote.lastUpdated === this.lastPushedTimestamp) {
      return;
    }

    let changed = false;

    // 1. Sync Schedules (Safe non-destructive merge)
    if (Array.isArray(remote.schedules) && remote.schedules.length > 0) {
      const local = RakanaDB.getSchedules();
      const localMap = new Map(local.map(s => [s.id, s]));

      // Merge remote into local
      remote.schedules.forEach(r => {
        localMap.set(r.id, r);
      });

      const mergedSchedules = Array.from(localMap.values());
      RakanaDB.saveSchedules(mergedSchedules);
      changed = true;
    }

    // 2. Sync Inspectors
    if (Array.isArray(remote.inspectors) && remote.inspectors.length > 0) {
      RakanaDB.saveInspectors(remote.inspectors);
      changed = true;
    }

    // 3. Sync Settings
    if (remote.settings && typeof remote.settings === 'object') {
      RakanaDB.saveSettings(remote.settings);
      changed = true;
    }

    if (changed && window.App) {
      window.App.refreshAll();
      console.log('[Supabase Sync] UI refreshed with latest data from cloud');
    }
  }

  /**
   * Push local data to Supabase (Debounced)
   */
  static pushToCloud(immediate = false) {
    if (!this.client) return;

    if (this.pushDebounceTimer) {
      clearTimeout(this.pushDebounceTimer);
    }

    const executePush = async () => {
      try {
        const timestamp = new Date().toISOString();
        this.lastPushedTimestamp = timestamp;

        const payload = {
          schedules: RakanaDB.getSchedules(),
          inspectors: RakanaDB.getInspectors(),
          settings: RakanaDB.getSettings(),
          lastUpdated: timestamp
        };

        const { error } = await this.client
          .from(this.TABLE_NAME)
          .upsert({
            id: this.RECORD_ID,
            payload: payload,
            updated_at: timestamp
          });

        if (error) {
          console.error('[Supabase Sync] Push error:', error.message);
          this.updateStatusUI('error', 'Gagal simpan ke Cloud: ' + error.message);
        } else {
          console.log('[Supabase Sync] Pushed to cloud successfully at', timestamp);
          this.updateStatusUI('online', 'Data berhasil disimpan & disiarkan ke semua layar');
        }
      } catch (err) {
        console.error('[Supabase Sync] Unexpected push error:', err);
      }
    };

    if (immediate) {
      executePush();
    } else {
      this.pushDebounceTimer = setTimeout(executePush, 400);
    }
  }

  /**
   * Update UI Badges in Header & Admin Modal
   */
  static updateStatusUI(status, message) {
    // Admin Modal Badge
    const badge = document.getElementById('supabase-sync-badge');
    const msgEl = document.getElementById('supabase-sync-msg');

    if (badge) {
      if (status === 'online') {
        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center space-x-1';
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> <span>ONLINE (REALTIME)</span>`;
      } else if (status === 'connecting') {
        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 flex items-center space-x-1';
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> <span>MENGHUBUNGKAN...</span>`;
      } else if (status === 'warning') {
        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-950 text-yellow-400 border border-yellow-800 flex items-center space-x-1';
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> <span>POLLING MODE</span>`;
      } else {
        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 flex items-center space-x-1';
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> <span>OFFLINE</span>`;
      }
    }

    if (msgEl) {
      msgEl.innerText = message || '';
    }

    // Top Header Cloud Pill
    const headerCloudPill = document.getElementById('header-cloud-status');
    if (headerCloudPill) {
      if (status === 'online') {
        headerCloudPill.className = 'hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-[10px] text-emerald-300 font-bold';
        headerCloudPill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> <span>Cloud Live</span>`;
      } else {
        headerCloudPill.className = 'hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-slate-400';
        headerCloudPill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span> <span>Cloud Local</span>`;
      }
    }
  }
}

window.RakanaSupabaseSync = RakanaSupabaseSync;

