class AutoSync {
    constructor() {
        this.syncInterval = 30000; // 30 seconds
        this.statusEl = document.getElementById('sync-status-badge');
        this.isSyncing = false;
        this.timer = null;
        this.lastState = 'online';
        
        this.init();
    }

    init() {
        if (!this.statusEl) return;
        
        window.addEventListener('online', () => this.updateStatus('online'));
        window.addEventListener('offline', () => this.updateStatus('offline'));
        
        this.updateStatus(navigator.onLine ? 'online' : 'offline');
        
        this.timer = setInterval(() => this.triggerSync(), this.syncInterval);
        // Initial sync 3 seconds after load
        setTimeout(() => this.triggerSync(), 3000);
    }

    updateStatus(state) {
        if (!this.statusEl) return;
        this.lastState = state;
        
        switch (state) {
            case 'disabled':
                this.statusEl.innerHTML = '<span class="badge bg-secondary" title="عدّل api/sync_to_cloud.php لتفعيل المزامنة"><i class="fas fa-cloud"></i> المزامنة السحابية غير مفعّلة</span>';
                break;
            case 'online':
                this.statusEl.innerHTML = '<span class="badge bg-success"><i class="fas fa-check-circle"></i> متصل - مزامن</span>';
                break;
            case 'offline':
                this.statusEl.innerHTML = '<span class="badge bg-danger"><i class="fas fa-times-circle"></i> غير متصل - حفظ محلي</span>';
                break;
            case 'syncing':
                this.statusEl.innerHTML = '<span class="badge bg-warning text-dark"><i class="fas fa-sync fa-spin"></i> جاري المزامنة...</span>';
                break;
            case 'error':
                this.statusEl.innerHTML = '<span class="badge bg-danger"><i class="fas fa-exclamation-triangle"></i> خطأ في المزامنة</span>';
                break;
        }
    }

    async triggerSync() {
        if (!navigator.onLine || this.isSyncing) return;
        
        this.isSyncing = true;
        this.updateStatus('syncing');
        
        try {
            const res = await fetch('api/sync_to_cloud.php');
            const data = await res.json();
            
            if (data.success) {
                this.updateStatus('online');
            } else if (data.configured === false) {
                // Cloud endpoint not set up yet: show a neutral badge and stop polling
                clearInterval(this.timer);
                this.updateStatus('disabled');
            } else {
                console.error("Sync error:", data.error);
                this.updateStatus('error'); // stays visible until the next successful sync
            }
        } catch (e) {
            console.error("Sync network error:", e);
            this.updateStatus('error');
        } finally {
            this.isSyncing = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.autoSync = new AutoSync();
});
