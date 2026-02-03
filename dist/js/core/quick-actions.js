// Quick Actions Panel - World-Class Feature
class QuickActions {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.init();
    }

    init() {
        this.createPanel();
        this.setupKeyboardShortcut();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'quick-actions-panel';
        this.panel.innerHTML = `
            <div class="quick-actions-header">
                <h3>Quick Actions</h3>
                <button class="quick-actions-close">&times;</button>
            </div>
            <div class="quick-actions-grid">
                <div class="quick-action-item" data-action="new-note">
                    <div class="quick-action-icon">📝</div>
                    <div class="quick-action-label">New Note</div>
                </div>
                <div class="quick-action-item" data-action="new-task">
                    <div class="quick-action-icon">✅</div>
                    <div class="quick-action-label">New Task</div>
                </div>
                <div class="quick-action-item" data-action="screenshot">
                    <div class="quick-action-icon">📸</div>
                    <div class="quick-action-label">Screenshot</div>
                </div>
                <div class="quick-action-item" data-action="clipboard">
                    <div class="quick-action-icon">📋</div>
                    <div class="quick-action-label">Clipboard</div>
                </div>
                <div class="quick-action-item" data-action="desktop-switcher">
                    <div class="quick-action-icon">🖥️</div>
                    <div class="quick-action-label">Desktops</div>
                </div>
                <div class="quick-action-item" data-action="settings">
                    <div class="quick-action-icon">⚙️</div>
                    <div class="quick-action-label">Settings</div>
                </div>
                <div class="quick-action-item" data-action="help">
                    <div class="quick-action-icon">❓</div>
                    <div class="quick-action-label">Help</div>
                </div>
                <div class="quick-action-item" data-action="theme">
                    <div class="quick-action-icon">🎨</div>
                    <div class="quick-action-label">Theme</div>
                </div>
            </div>
        `;
        document.body.appendChild(this.panel);

        // Close button
        this.panel.querySelector('.quick-actions-close').addEventListener('click', () => {
            this.hide();
        });

        // Action items
        this.panel.querySelectorAll('.quick-action-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleAction(action);
                this.hide();
            });
        });

        // Close on outside click
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) {
                this.hide();
            }
        });
    }

    handleAction(action) {
        switch(action) {
            case 'new-note':
                if (typeof notesApp !== 'undefined') {
                    notesApp.open();
                    setTimeout(() => {
                        const noteWindow = document.querySelector('[data-window-id="notes"]');
                        if (noteWindow) {
                            const newBtn = noteWindow.querySelector('.notes-new-btn, [data-action="new-note"]');
                            if (newBtn) newBtn.click();
                        }
                    }, 300);
                }
                break;
            case 'new-task':
                if (typeof tasksApp !== 'undefined') {
                    tasksApp.open();
                }
                break;
            case 'screenshot':
                this.takeScreenshot();
                break;
            case 'clipboard':
                if (typeof clipboardManager !== 'undefined') {
                    clipboardManager.showHistory();
                }
                break;
            case 'desktop-switcher':
                if (typeof virtualDesktops !== 'undefined') {
                    virtualDesktops.showDesktopSwitcher();
                }
                break;
            case 'settings':
                if (typeof settingsApp !== 'undefined') {
                    settingsApp.open();
                }
                break;
            case 'help':
                if (typeof helpApp !== 'undefined') {
                    helpApp.open();
                }
                break;
            case 'theme':
                if (typeof themeSystem !== 'undefined') {
                    themeSystem.cycleTheme();
                    if (typeof notificationSystem !== 'undefined') {
                        notificationSystem.info('Theme', `Switched to ${themeSystem.themes[themeSystem.getTheme()].name}`);
                    }
                }
                break;
        }
    }

    takeScreenshot() {
        // Use html2canvas if available, or show notification
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.info('Screenshot', 'Screenshot feature - Use browser\'s built-in screenshot (F12 → Console → Screenshot)');
        }
    }

    show() {
        if (this.panel) {
            this.panel.classList.add('visible');
            this.isVisible = true;
        }
    }

    hide() {
        if (this.panel) {
            this.panel.classList.remove('visible');
            this.isVisible = false;
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+A for quick actions
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
}

// Initialize globally
const quickActions = new QuickActions();
