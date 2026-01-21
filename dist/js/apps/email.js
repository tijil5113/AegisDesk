// Advanced Email App
class EmailApp {
    constructor() {
        this.emails = [];
        this.currentEmail = null;
        this.init();
    }

    init() {
        // Load emails from storage
        this.loadEmails();
    }

    loadEmails() {
        const saved = storage.get('emails', []);
        this.emails = saved;
    }

    saveEmails() {
        storage.set('emails', this.emails);
    }

    createWindow() {
        const content = `
            <div class="email-app">
                <div class="email-sidebar">
                    <button class="email-compose-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                            <path d="M2 2l7.586 7.586"></path>
                            <circle cx="11" cy="11" r="2"></circle>
                        </svg>
                        Compose
                    </button>
                    <div class="email-folders">
                        <div class="email-folder active" data-folder="inbox">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            Inbox <span class="email-count">${this.getUnreadCount()}</span>
                        </div>
                        <div class="email-folder" data-folder="sent">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                            Sent
                        </div>
                        <div class="email-folder" data-folder="drafts">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            Drafts
                        </div>
                        <div class="email-folder" data-folder="trash">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Trash
                        </div>
                    </div>
                </div>
                <div class="email-list">
                    <div class="email-list-header">
                        <input type="text" placeholder="Search emails..." class="email-search" id="email-search">
                    </div>
                    <div class="email-list-content" id="email-list">
                        ${this.renderEmailList()}
                    </div>
                </div>
                <div class="email-viewer" id="email-viewer">
                    <div class="email-viewer-placeholder">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        <p>Select an email to read</p>
                    </div>
                </div>
            </div>
        `;

        const window = windowManager.createWindow('email', {
            title: 'Email',
            width: 1000,
            height: 700,
            content,
            class: 'email-window'
        });

        this.setupEventListeners(window);
        return window;
    }

    renderEmailList() {
        if (this.emails.length === 0) {
            return `
                <div class="email-empty">
                    <p>No emails yet</p>
                    <button class="email-compose-first">Compose your first email</button>
                </div>
            `;
        }

        return this.emails.map((email, index) => `
            <div class="email-item ${email.unread ? 'unread' : ''}" data-index="${index}">
                <div class="email-item-checkbox">
                    <input type="checkbox">
                </div>
                <div class="email-item-content">
                    <div class="email-item-header">
                        <span class="email-item-from">${this.escapeHtml(email.from)}</span>
                        <span class="email-item-time">${this.formatTime(email.date)}</span>
                    </div>
                    <div class="email-item-subject">${this.escapeHtml(email.subject)}</div>
                    <div class="email-item-preview">${this.escapeHtml(email.preview)}</div>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners(window) {
        const composeBtn = window.querySelector('.email-compose-btn');
        composeBtn?.addEventListener('click', () => this.showCompose(window));

        const emailItems = window.querySelectorAll('.email-item');
        emailItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.email-item-checkbox')) {
                    const index = parseInt(item.dataset.index);
                    this.openEmail(window, index);
                }
            });
        });

        const folders = window.querySelectorAll('.email-folder');
        folders.forEach(folder => {
            folder.addEventListener('click', () => {
                folders.forEach(f => f.classList.remove('active'));
                folder.classList.add('active');
                // Filter emails by folder
            });
        });
    }

    showCompose(window) {
        const viewer = window.querySelector('#email-viewer');
        viewer.innerHTML = `
            <div class="email-compose">
                <div class="email-compose-header">
                    <h3>New Message</h3>
                    <button class="email-close-compose">&times;</button>
                </div>
                <div class="email-compose-form">
                    <div class="email-field">
                        <label>To:</label>
                        <input type="email" id="compose-to" placeholder="recipient@example.com">
                    </div>
                    <div class="email-field">
                        <label>Subject:</label>
                        <input type="text" id="compose-subject" placeholder="Subject">
                    </div>
                    <div class="email-field">
                        <label>Message:</label>
                        <textarea id="compose-message" rows="15" placeholder="Write your message..."></textarea>
                    </div>
                    <div class="email-compose-actions">
                        <button class="email-send-btn">Send</button>
                        <button class="email-save-draft-btn">Save Draft</button>
                        <button class="email-cancel-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        const sendBtn = viewer.querySelector('.email-send-btn');
        sendBtn?.addEventListener('click', () => this.sendEmail(window));

        const closeBtn = viewer.querySelector('.email-close-compose');
        closeBtn?.addEventListener('click', () => {
            viewer.innerHTML = '<div class="email-viewer-placeholder"><p>Select an email to read</p></div>';
        });
    }

    sendEmail(window) {
        const to = window.querySelector('#compose-to').value;
        const subject = window.querySelector('#compose-subject').value;
        const message = window.querySelector('#compose-message').value;

        if (!to || !subject || !message) {
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.warning('Email', 'Please fill in all fields');
            }
            return;
        }

        const email = {
            id: Date.now(),
            from: 'you@aegisdesk.com',
            to,
            subject,
            body: message,
            date: new Date(),
            unread: false,
            folder: 'sent',
            preview: message.substring(0, 100)
        };

        this.emails.unshift(email);
        this.saveEmails();
        
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.success('Email', `Email sent to ${to}`);
        }

        // Refresh list
        const list = window.querySelector('#email-list');
        list.innerHTML = this.renderEmailList();
        this.setupEventListeners(window);
    }

    openEmail(window, index) {
        const email = this.emails[index];
        if (!email) return;

        email.unread = false;
        this.saveEmails();

        const viewer = window.querySelector('#email-viewer');
        viewer.innerHTML = `
            <div class="email-view">
                <div class="email-view-header">
                    <h2>${this.escapeHtml(email.subject)}</h2>
                    <div class="email-view-meta">
                        <div><strong>From:</strong> ${this.escapeHtml(email.from)}</div>
                        <div><strong>To:</strong> ${this.escapeHtml(email.to)}</div>
                        <div><strong>Date:</strong> ${this.formatDate(email.date)}</div>
                    </div>
                </div>
                <div class="email-view-body">
                    ${this.escapeHtml(email.body).replace(/\n/g, '<br>')}
                </div>
                <div class="email-view-actions">
                    <button class="email-reply-btn">Reply</button>
                    <button class="email-forward-btn">Forward</button>
                    <button class="email-delete-btn">Delete</button>
                </div>
            </div>
        `;
    }

    getUnreadCount() {
        return this.emails.filter(e => e.unread && e.folder === 'inbox').length;
    }

    formatTime(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
        return d.toLocaleDateString();
    }

    formatDate(date) {
        return new Date(date).toLocaleString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
const emailApp = new EmailApp();
