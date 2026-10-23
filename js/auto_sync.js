class AutoSync {
    constructor() {
        this.syncInterval  = 30000; // 30 seconds
        this.statusEl      = document.getElementById('sync-status-badge');
        this.isSyncing     = false;
        this.timer         = null;
        this.lastState     = 'online';

        // ── Diagnostic state ──────────────────────────────────────────────
        this.lastSuccess   = null;  // Date object of last successful sync
        this.lastError     = null;  // Error string from last failed sync
        this.lastEndpoint  = null;  // Cloud endpoint URL (returned by API)

        this.init();
    }

    init() {
        if (!this.statusEl) return;

        window.addEventListener('online',  () => this.updateStatus('online'));
        window.addEventListener('offline', () => this.updateStatus('offline'));

        this.updateStatus(navigator.onLine ? 'online' : 'offline');

        this.timer = setInterval(() => this.triggerSync(), this.syncInterval);
        // Initial sync 3 seconds after load
        setTimeout(() => this.triggerSync(), 3000);

        // Populate diagnostic modal whenever it is shown
        const modalEl = document.getElementById('syncDiagnosticModal');
        if (modalEl) {
            modalEl.addEventListener('show.bs.modal', () => this._populateDiagModal());
        }
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
                this.statusEl.innerHTML = '<span class="badge bg-danger"><i class="fas fa-exclamation-triangle"></i> خطأ في المزامنة — انقر للتفاصيل</span>';
                break;
        }
    }

    async triggerSync() {
        if (!navigator.onLine || this.isSyncing) return;

        this.isSyncing = true;
        this.updateStatus('syncing');

        try {
            const res  = await fetch('api/sync_to_cloud.php');
            const data = await res.json();

            if (data.success) {
                this.lastSuccess  = new Date();
                this.lastError    = null;
                this.lastEndpoint = data.endpoint ?? this.lastEndpoint;
                this.updateStatus('online');
            } else if (data.configured === false) {
                // Cloud endpoint not set up — show neutral badge and stop polling
                clearInterval(this.timer);
                this.updateStatus('disabled');
            } else {
                // Store exact error message + endpoint for the diagnostic modal
                this.lastError    = data.error ?? 'Unknown error';
                this.lastEndpoint = data.endpoint ?? this.lastEndpoint;
                console.error('[AutoSync] Sync error:', this.lastError);
                this.updateStatus('error');
            }
        } catch (e) {
            // Network-level failure (e.g. Apache down, CORS, DNS)
            this.lastError = `fetch() فشل: ${e.message}`;
            console.error('[AutoSync] Fetch error:', e);
            this.updateStatus('error');
        } finally {
            this.isSyncing = false;
            // If modal is open, refresh it live
            const modalEl = document.getElementById('syncDiagnosticModal');
            if (modalEl && modalEl.classList.contains('show')) {
                this._populateDiagModal();
            }
        }
    }

    // Called by the "فحص الاتصال الآن" button inside the modal
    async triggerManualFromModal() {
        const btn = document.getElementById('diag-test-btn');
        if (btn) {
            btn.disabled    = true;
            btn.innerHTML   = '<i class="fas fa-sync fa-spin me-1"></i>جاري الفحص...';
        }

        // Force a sync even if we think we're already syncing
        this.isSyncing = false;
        await this.triggerSync();

        if (btn) {
            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-bolt me-1"></i>فحص الاتصال الآن';
        }
    }

    // Injects current diagnostic state into the modal DOM
    _populateDiagModal() {
        // Network status
        const networkText = document.getElementById('diag-network-text');
        const networkIcon = document.getElementById('diag-network-icon');
        const networkRow  = document.getElementById('diag-network-row');
        if (networkText) {
            const online = navigator.onLine;
            networkText.textContent    = online ? 'متصل بالشبكة ✓' : 'غير متصل ✗';
            networkText.className      = 'fw-bold ' + (online ? 'text-success' : 'text-danger');
            if (networkIcon) networkIcon.className = 'fas fs-4 me-3 ' + (online ? 'fa-wifi text-success' : 'fa-wifi-slash text-danger');
            if (networkRow)  networkRow.style.borderRight = `4px solid ${online ? '#198754' : '#dc3545'}`;
        }

        // Last successful sync
        const lastSuccessEl = document.getElementById('diag-last-success');
        if (lastSuccessEl) {
            lastSuccessEl.textContent = this.lastSuccess
                ? this.lastSuccess.toLocaleString('ar-YE')
                : 'لا توجد مزامنة ناجحة في هذه الجلسة';
            lastSuccessEl.className = 'fw-bold ' + (this.lastSuccess ? 'text-success' : 'text-muted');
        }

        // Last error details
        const lastErrorEl = document.getElementById('diag-last-error');
        if (lastErrorEl) {
            if (this.lastError) {
                lastErrorEl.textContent = this.lastError;
                lastErrorEl.className   = 'bg-dark text-danger p-3 rounded small mb-0';
            } else if (this.lastSuccess) {
                lastErrorEl.textContent = '✓ لا توجد أخطاء — آخر مزامنة ناجحة';
                lastErrorEl.className   = 'bg-dark text-success p-3 rounded small mb-0';
            } else {
                lastErrorEl.textContent = 'لا توجد أخطاء مسجّلة في هذه الجلسة';
                lastErrorEl.className   = 'bg-dark text-secondary p-3 rounded small mb-0';
            }
        }

        // Cloud endpoint
        const endpointEl = document.getElementById('diag-endpoint');
        if (endpointEl) {
            endpointEl.textContent = this.lastEndpoint ?? 'غير معروف بعد (لم تُجرَ مزامنة بعد)';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.autoSync = new AutoSync();
});

// Trigger automatic backup check on load (after 10 seconds) and every 30 minutes when online
setTimeout(() => {
    if (navigator.onLine) fetch('api/auto_backup.php').catch(() => {});
}, 10000);

setInterval(() => {
    if (navigator.onLine) fetch('api/auto_backup.php').catch(() => {});
}, 30 * 60 * 1000);
