// Advanced Email App
class EmailApp {
    constructor() {
        this.emails = [];
        this.currentEmail = null;
        this.currentFolder = 'inbox';
        this.sending = false;
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
        const emails = this.emails.filter((email) => (email.folder || 'inbox') === this.currentFolder);
        if (emails.length === 0) {
            const emptyLabel = this.currentFolder === 'sent'
                ? 'No local send history yet'
                : 'No emails yet';
            return `
                <div class="email-empty">
                    <p>${emptyLabel}</p>
                    <button type="button" class="email-compose-first">Compose</button>
                </div>
            `;
        }

        return emails.map((email, index) => `
            <div class="email-item ${email.unread ? 'unread' : ''}" data-index="${this.emails.indexOf(email)}">
                <div class="email-item-checkbox">
                    <input type="checkbox">
                </div>
                <div class="email-item-content">
                    <div class="email-item-header">
                        <span class="email-item-from">${this.escapeHtml(this.currentFolder === 'sent' ? email.to : email.from)}</span>
                        <span class="email-item-time">${this.formatTime(email.date)}</span>
                    </div>
                    <div class="email-item-subject">${this.escapeHtml(email.subject)}</div>
                    <div class="email-item-preview">${this.escapeHtml(email.preview || '')}${email.localHistory && this.currentFolder === 'sent' ? ' · Local send history' : ''}</div>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners(window) {
        const composeBtn = window.querySelector('.email-compose-btn');
        composeBtn?.addEventListener('click', () => this.showCompose(window));
        const composeFirst = window.querySelector('.email-compose-first');
        composeFirst?.addEventListener('click', () => this.showCompose(window));

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
                this.currentFolder = folder.dataset.folder || 'inbox';
                const list = window.querySelector('#email-list');
                if (list) list.innerHTML = this.renderEmailList();
                window.querySelectorAll('.email-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        if (!e.target.closest('.email-item-checkbox')) {
                            const index = parseInt(item.dataset.index, 10);
                            this.openEmail(window, index);
                        }
                    });
                });
                window.querySelector('.email-compose-first')?.addEventListener('click', () => this.showCompose(window));
            });
        });
    }

    showCompose(window) {
        const viewer = window.querySelector('#email-viewer');
        viewer.innerHTML = `
            <div class="email-compose">
                <div class="email-compose-header">
                    <div>
                        <h3>New Message</h3>
                        <p class="email-compose-status" id="compose-status" role="status">Ready</p>
                    </div>
                    <button type="button" class="email-close-compose" aria-label="Close compose">&times;</button>
                </div>
                <form class="email-compose-form" id="email-compose-form">
                    <p class="email-compose-hint">From AegisDesk. Sender identity is set on the server. Sent means the provider accepted the message, not that it was delivered.</p>
                    <div class="email-field">
                        <label for="compose-to">To</label>
                        <input type="text" id="compose-to" name="to" autocomplete="email" placeholder="recipient@example.com" required>
                    </div>
                    <div class="email-compose-extra-toggle">
                        <button type="button" class="email-cc-toggle" data-target="compose-cc-wrap">Cc</button>
                        <button type="button" class="email-cc-toggle" data-target="compose-bcc-wrap">Bcc</button>
                    </div>
                    <div class="email-field email-field-hidden" id="compose-cc-wrap">
                        <label for="compose-cc">Cc</label>
                        <input type="text" id="compose-cc" name="cc" autocomplete="email" placeholder="cc@example.com">
                    </div>
                    <div class="email-field email-field-hidden" id="compose-bcc-wrap">
                        <label for="compose-bcc">Bcc</label>
                        <input type="text" id="compose-bcc" name="bcc" autocomplete="email" placeholder="bcc@example.com">
                    </div>
                    <div class="email-field">
                        <label for="compose-subject">Subject</label>
                        <input type="text" id="compose-subject" name="subject" placeholder="Subject" required>
                    </div>
                    <div class="email-field">
                        <label for="compose-message">Message</label>
                        <textarea id="compose-message" name="message" rows="12" placeholder="Write your message..." required></textarea>
                    </div>
                    <p class="email-compose-error" id="compose-error" hidden></p>
                    <div class="email-compose-actions">
                        <button type="submit" class="email-send-btn" id="email-send-btn">Send</button>
                        <button type="button" class="email-save-draft-btn">Save Draft</button>
                        <button type="button" class="email-cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        const form = viewer.querySelector('#email-compose-form');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendEmail(window);
        });

        viewer.querySelectorAll('.email-cc-toggle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const wrap = viewer.querySelector(`#${btn.dataset.target}`);
                if (wrap) wrap.classList.toggle('email-field-hidden');
            });
        });

        const closeBtn = viewer.querySelector('.email-close-compose');
        closeBtn?.addEventListener('click', () => {
            viewer.innerHTML = '<div class="email-viewer-placeholder"><p>Select an email to read</p></div>';
        });
        viewer.querySelector('.email-cancel-btn')?.addEventListener('click', () => {
            viewer.innerHTML = '<div class="email-viewer-placeholder"><p>Select an email to read</p></div>';
        });
        viewer.querySelector('.email-save-draft-btn')?.addEventListener('click', () => {
            const to = window.querySelector('#compose-to')?.value.trim() || '';
            const subject = window.querySelector('#compose-subject')?.value.trim() || '';
            const message = window.querySelector('#compose-message')?.value.trim() || '';
            const draft = {
                id: Date.now(),
                from: 'AegisDesk',
                to,
                subject: subject || '(no subject)',
                body: message,
                date: new Date(),
                unread: false,
                folder: 'drafts',
                preview: message.substring(0, 100),
                localHistory: true
            };
            this.emails.unshift(draft);
            this.saveEmails();
            this.refreshList(window);
        });

        window.querySelector('#compose-to')?.focus();
    }

    setComposeState(window, state, message) {
        const status = window.querySelector('#compose-status');
        const error = window.querySelector('#compose-error');
        const sendBtn = window.querySelector('#email-send-btn');
        if (status) status.textContent = message || state;
        if (error) {
            error.hidden = state !== 'Failed';
            error.textContent = state === 'Failed' ? (message || 'Failed to send email.') : '';
        }
        if (sendBtn) {
            sendBtn.disabled = state === 'Sending';
            sendBtn.textContent = state === 'Sending' ? 'Sending…' : 'Send';
        }
    }

    refreshList(window) {
        const list = window.querySelector('#email-list');
        if (list) list.innerHTML = this.renderEmailList();
        this.setupEventListeners(window);
    }

    async sendEmail(window) {
        if (this.sending) return;

        const to = window.querySelector('#compose-to')?.value.trim() || '';
        const cc = window.querySelector('#compose-cc')?.value.trim() || '';
        const bcc = window.querySelector('#compose-bcc')?.value.trim() || '';
        const subject = window.querySelector('#compose-subject')?.value.trim() || '';
        const message = window.querySelector('#compose-message')?.value.trim() || '';

        if (!to || !subject || !message) {
            this.setComposeState(window, 'Failed', 'To, subject, and message are required.');
            return;
        }

        this.sending = true;
        this.setComposeState(window, 'Sending', 'Sending');
        const idempotencyKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `compose-${Date.now()}`;

        try {
            const response = await fetch('/api/mail/send', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotency-Key': idempotencyKey
                },
                body: JSON.stringify({ to, cc, bcc, subject, text: message })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data.ok === false) {
                throw new Error(data.error || 'Failed to send email');
            }

            const email = {
                id: data.id || Date.now(),
                from: 'AegisDesk',
                to,
                cc,
                subject,
                body: message,
                date: new Date(),
                unread: false,
                folder: 'sent',
                preview: message.substring(0, 100),
                deliveryStatus: 'sent',
                localHistory: true
            };
            this.emails.unshift(email);
            this.saveEmails();
            this.setComposeState(window, 'Sent', 'Email sent successfully');
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.success('Email', 'Email sent successfully');
            }
            this.refreshList(window);
            setTimeout(() => {
                const viewer = window.querySelector('#email-viewer');
                if (viewer) {
                    viewer.innerHTML = '<div class="email-viewer-placeholder"><p>Email sent successfully. This is local send history, not delivery confirmation.</p></div>';
                }
                this.sending = false;
            }, 700);
        } catch (error) {
            this.sending = false;
            this.setComposeState(window, 'Failed', error.message || 'Failed to send email.');
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.error('Email', error.message || 'Failed to send email');
            }
        }
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
