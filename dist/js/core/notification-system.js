// Advanced Notification System
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.maxNotifications = 5;
        this.init();
    }

    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this.container);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    show(title, message, options = {}) {
        const notification = {
            id: Date.now() + Math.random(),
            title,
            message,
            type: options.type || 'info',
            duration: options.duration || 5000,
            icon: options.icon || this.getDefaultIcon(options.type),
            action: options.action || null,
            persistent: options.persistent || false
        };

        this.notifications.push(notification);
        this.renderNotification(notification);
        this.updateContainer();

        // Browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: options.icon || '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id.toString()
            });
        }

        // Auto-remove if not persistent
        if (!notification.persistent) {
            setTimeout(() => {
                this.remove(notification.id);
            }, notification.duration);
        }

        return notification.id;
    }

    renderNotification(notification) {
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.dataset.notificationId = notification.id;
        element.setAttribute('role', 'alert');

        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${notification.icon}</div>
                <div class="notification-text">
                    <div class="notification-title">${this.escapeHtml(notification.title)}</div>
                    <div class="notification-message">${this.escapeHtml(notification.message)}</div>
                </div>
                ${notification.action ? `<button class="notification-action">${notification.action.label}</button>` : ''}
                <button class="notification-close" aria-label="Close notification">&times;</button>
            </div>
            <div class="notification-progress"></div>
        `;

        // Add click handlers
        const closeBtn = element.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.remove(notification.id));

        if (notification.action) {
            const actionBtn = element.querySelector('.notification-action');
            actionBtn.addEventListener('click', () => {
                notification.action.callback();
                this.remove(notification.id);
            });
        }

        // Progress bar animation
        if (!notification.persistent) {
            const progress = element.querySelector('.notification-progress');
            progress.style.animationDuration = `${notification.duration}ms`;
        }

        this.container.appendChild(element);

        // Animate in
        requestAnimationFrame(() => {
            element.classList.add('notification-visible');
        });
    }

    remove(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index === -1) return;

        const notification = this.notifications[index];
        const element = this.container.querySelector(`[data-notification-id="${id}"]`);
        
        if (element) {
            element.classList.remove('notification-visible');
            setTimeout(() => {
                element.remove();
                this.notifications.splice(index, 1);
                this.updateContainer();
            }, 300);
        }
    }

    updateContainer() {
        // Limit visible notifications
        const visible = this.container.querySelectorAll('.notification').length;
        if (visible > this.maxNotifications) {
            const oldest = this.container.querySelector('.notification');
            if (oldest) {
                const id = oldest.dataset.notificationId;
                this.remove(parseFloat(id));
            }
        }
    }

    getDefaultIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convenience methods
    success(title, message, options = {}) {
        return this.show(title, message, { ...options, type: 'success' });
    }

    error(title, message, options = {}) {
        return this.show(title, message, { ...options, type: 'error' });
    }

    warning(title, message, options = {}) {
        return this.show(title, message, { ...options, type: 'warning' });
    }

    info(title, message, options = {}) {
        return this.show(title, message, { ...options, type: 'info' });
    }
}

// Initialize globally
const notificationSystem = new NotificationSystem();
