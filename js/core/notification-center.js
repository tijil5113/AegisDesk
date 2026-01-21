// Unified Notification Center - OS-Level Notifications
class NotificationCenter {
    constructor() {
        this.notifications = [];
        this.history = [];
        this.maxHistory = 100;
        this.silentMode = false;
        this.focusMode = false;
        this.panel = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        // Load settings
        this.silentMode = storage.get('notification_silent_mode', false);
        this.focusMode = storage.get('notification_focus_mode', false);
        
        // Load history
        this.history = storage.get('notification_history', []);
        
        // Create UI
        this.createUI();
        
        this.initialized = true;
        console.log('[NotificationCenter] Initialized');
    }

    createUI() {
        // Create notification center panel
        const panel = document.createElement('div');
        panel.id = 'notification-center-panel';
        panel.className = 'notification-center-panel';
        panel.setAttribute('aria-hidden', 'true');
        
        panel.innerHTML = `
            <div class="notification-center-header">
                <h3>Notifications</h3>
                <div class="notification-center-controls">
                    <button class="notification-center-clear" id="notification-center-clear" title="Clear all">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                    <button class="notification-center-close" id="notification-center-close" title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="notification-center-tabs">
                <button class="notification-tab active" data-tab="active">Active</button>
                <button class="notification-tab" data-tab="history">History</button>
            </div>
            <div class="notification-center-content">
                <div class="notification-center-active" id="notification-center-active">
                    <div class="notification-center-empty">No active notifications</div>
                </div>
                <div class="notification-center-history" id="notification-center-history" style="display: none;">
                    <div class="notification-center-empty">No notification history</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
        
        // Setup event listeners
        document.getElementById('notification-center-close').addEventListener('click', () => {
            this.hide();
        });
        
        document.getElementById('notification-center-clear').addEventListener('click', () => {
            this.clearAll();
        });
        
        // Tab switching
        panel.querySelectorAll('.notification-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                panel.querySelectorAll('.notification-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.getElementById('notification-center-active').style.display = 
                    tabName === 'active' ? 'block' : 'none';
                document.getElementById('notification-center-history').style.display = 
                    tabName === 'history' ? 'block' : 'none';
            });
        });
        
        // Click outside to close
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                this.hide();
            }
        });
    }

    // Show notification
    show(title, message, options = {}) {
        const notification = {
            id: Date.now() + Math.random(),
            title,
            message,
            type: options.type || 'info', // info, success, warning, error, critical
            priority: options.priority || 'normal', // low, normal, important, critical
            source: options.source || 'system',
            timestamp: new Date().toISOString(),
            actions: options.actions || [],
            persistent: options.persistent || false,
            read: false
        };
        
        // Check if should show (silent/focus mode)
        if (this.silentMode && notification.priority !== 'critical') {
            // Add to history but don't show
            this.addToHistory(notification);
            return notification.id;
        }
        
        if (this.focusMode && notification.priority === 'low') {
            this.addToHistory(notification);
            return notification.id;
        }
        
        // Add to active notifications
        this.notifications.push(notification);
        this.addToHistory(notification);
        
        // Update UI
        this.updateUI();
        
        // Show toast notification (unless silent)
        if (!this.silentMode) {
            this.showToast(notification);
        }
        
        // Record in user profile
        if (typeof userProfile !== 'undefined') {
            userProfile.recordEvent('notification_received', {
                type: notification.type,
                priority: notification.priority,
                source: notification.source
            });
        }
        
        return notification.id;
    }

    // Show toast notification
    showToast(notification) {
        // Use existing notification system if available
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.show(notification.title, notification.message, {
                type: notification.type,
                duration: notification.priority === 'critical' ? 0 : 5000
            });
        }
    }

    // Dismiss notification
    dismiss(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notifications[index].read = true;
            this.notifications.splice(index, 1);
            this.updateUI();
        }
    }

    // Mark as read
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.updateUI();
        }
        
        // Also update in history
        const historyItem = this.history.find(n => n.id === id);
        if (historyItem) {
            historyItem.read = true;
            this.saveHistory();
        }
    }

    // Clear all notifications
    clearAll() {
        this.notifications.forEach(n => n.read = true);
        this.notifications = [];
        this.updateUI();
    }

    // Add to history
    addToHistory(notification) {
        this.history.unshift(notification);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
        this.saveHistory();
    }

    // Save history
    saveHistory() {
        storage.set('notification_history', this.history);
    }

    // Update UI
    updateUI() {
        if (!this.panel) return;
        
        const activeContainer = document.getElementById('notification-center-active');
        const historyContainer = document.getElementById('notification-center-history');
        
        if (!activeContainer || !historyContainer) return;
        
        // Active notifications
        if (this.notifications.length === 0) {
            activeContainer.innerHTML = '<div class="notification-center-empty">No active notifications</div>';
        } else {
            activeContainer.innerHTML = this.notifications.map(n => this.renderNotification(n, true)).join('');
        }
        
        // History
        if (this.history.length === 0) {
            historyContainer.innerHTML = '<div class="notification-center-empty">No notification history</div>';
        } else {
            historyContainer.innerHTML = this.history.slice(0, 50).map(n => this.renderNotification(n, false)).join('');
        }
        
        // Setup event listeners for new notifications
        activeContainer.querySelectorAll('.notification-item').forEach(item => {
            const id = parseFloat(item.dataset.id);
            const dismissBtn = item.querySelector('.notification-dismiss');
            const readBtn = item.querySelector('.notification-mark-read');
            
            if (dismissBtn) {
                dismissBtn.addEventListener('click', () => this.dismiss(id));
            }
            if (readBtn) {
                readBtn.addEventListener('click', () => this.markAsRead(id));
            }
        });
    }

    // Render notification
    renderNotification(notification, isActive) {
        const priorityClass = `priority-${notification.priority}`;
        const typeIcon = this.getTypeIcon(notification.type);
        const timeAgo = this.getTimeAgo(notification.timestamp);
        
        return `
            <div class="notification-item ${priorityClass} ${notification.read ? 'read' : ''}" data-id="${notification.id}">
                <div class="notification-icon">${typeIcon}</div>
                <div class="notification-content">
                    <div class="notification-title">${this.escapeHtml(notification.title)}</div>
                    <div class="notification-message">${this.escapeHtml(notification.message)}</div>
                    <div class="notification-meta">
                        <span class="notification-source">${this.escapeHtml(notification.source)}</span>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                </div>
                <div class="notification-actions">
                    ${!notification.read ? `<button class="notification-mark-read" title="Mark as read">✓</button>` : ''}
                    <button class="notification-dismiss" title="Dismiss">×</button>
                </div>
            </div>
        `;
    }

    // Get type icon
    getTypeIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✓',
            warning: '⚠️',
            error: '✕',
            critical: '🚨'
        };
        return icons[type] || icons.info;
    }

    // Get time ago
    getTimeAgo(timestamp) {
        const now = Date.now();
        const time = new Date(timestamp).getTime();
        const diff = now - time;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Show panel
    show() {
        if (!this.panel) return;
        this.panel.setAttribute('aria-hidden', 'false');
        this.panel.classList.add('visible');
        this.updateUI();
    }

    // Hide panel
    hide() {
        if (!this.panel) return;
        this.panel.setAttribute('aria-hidden', 'true');
        this.panel.classList.remove('visible');
    }

    // Toggle panel
    toggle() {
        if (this.panel?.classList.contains('visible')) {
            this.hide();
        } else {
            this.show();
        }
    }

    // Set silent mode
    setSilentMode(enabled) {
        this.silentMode = enabled;
        storage.set('notification_silent_mode', enabled);
    }

    // Set focus mode
    setFocusMode(enabled) {
        this.focusMode = enabled;
        storage.set('notification_focus_mode', enabled);
    }

    // Get notification count
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Get notifications by priority
    getNotificationsByPriority(priority) {
        return this.notifications.filter(n => n.priority === priority);
    }
}

// Create singleton instance
const notificationCenter = new NotificationCenter();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => notificationCenter.init());
} else {
    notificationCenter.init();
}

// Make globally accessible
window.notificationCenter = notificationCenter;
