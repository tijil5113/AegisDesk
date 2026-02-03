// MAIL - Premium Email Client with Real Gmail/Outlook Integration
// Production-grade email client with OAuth, AI assistant, and premium UI

class MailApp {
    constructor() {
        this.windowId = 'mail';
        this.storageKey = 'aegis_mail_data';
        this.engine = null;
        this.currentFolder = 'inbox';
        this.currentAccount = null;
        this.currentEmail = null;
        this.selectedEmails = new Set();
        this.searchQuery = '';
        this.currentFilter = 'all';
        this.aiPanelCollapsed = true;
        this.composeMode = 'new'; // 'new' | 'reply' | 'forward'
        this.composeDraft = null;
        this.data = this.loadData();
        this.init();
    }

    async init() {
        console.log('[Mail] Initializing premium email client...');
        this.engine = new MailEngine();
        await this.engine.init();
        
        // Load accounts from engine
        this.data.accounts = this.engine.getAllAccounts();
        
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupContextMenu();
        this.renderAccounts();
        this.renderAccountSelector();
        this.renderEmails();
        this.setupAutoSave();
        this.startBackgroundSync();
        
        // Apply theme
        this.applyTheme(localStorage.getItem('aegis_mail_theme') || 'default');
    }

    getApiBaseUrl() {
        // AWS-ready: Use environment variable or default to relative path
        if (typeof process !== 'undefined' && process.env?.API_BASE_URL) {
            return process.env.API_BASE_URL;
        }
        return '/api';
    }

    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[Mail] Failed to load data:', e);
        }
        
        return {
            accounts: [],
            emails: [],
            drafts: []
        };
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('[Mail] Failed to save data:', e);
        }
    }

    setupEventListeners() {
        // Compose button
        const composeBtn = document.getElementById('mail-compose-btn');
        if (composeBtn) {
            composeBtn.addEventListener('click', () => this.showComposeModal());
        }

        // Add account button
        const addAccountBtn = document.getElementById('mail-add-account-btn');
        if (addAccountBtn) {
            addAccountBtn.addEventListener('click', () => this.showAddAccountModal());
        }

        // Folder navigation
        document.querySelectorAll('.mail-folder').forEach(folder => {
            folder.addEventListener('click', (e) => {
                const folderName = e.currentTarget.dataset.folder;
                this.setCurrentFolder(folderName);
            });
        });

        // Search
        const searchInput = document.getElementById('mail-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchEmails(e.target.value);
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('mail-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshEmails());
        }

        // Delete button
        const deleteBtn = document.getElementById('mail-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteSelectedEmails());
        }

        // Select all checkbox
        const selectAll = document.getElementById('mail-select-all');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectAllEmails();
                } else {
                    this.deselectAllEmails();
                }
            });
        }

        // Modal overlays - close on click outside
        document.querySelectorAll('.mail-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.display = 'none';
                }
            });
        });
    }

    renderAccounts() {
        const container = document.getElementById('mail-accounts-list');
        if (!container) return;

        if (this.data.accounts.length === 0) {
            container.innerHTML = `
                <div class="mail-empty-state">
                    <p style="font-size: 13px; color: var(--mail-text-muted);">No accounts connected</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.accounts.map((account, index) => `
            <div class="mail-account-item ${this.currentAccount?.id === account.id ? 'active' : ''}" 
                 data-account-id="${account.id}"
                 onclick="mailApp.setCurrentAccount('${account.id}')">
                <div class="mail-account-avatar">
                    ${account.name.charAt(0).toUpperCase()}
                </div>
                <div class="mail-account-info">
                    <div class="mail-account-name">${this.escapeHtml(account.name)}</div>
                    <div class="mail-account-provider">
                        ${account.provider === 'gmail' ? 'Gmail' : account.provider === 'outlook' ? 'Outlook' : 'Email'}
                        ${account.connected ? '<span class="mail-account-badge">Connected</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');

        // Set first account as current if none selected
        if (!this.currentAccount && this.data.accounts.length > 0) {
            this.setCurrentAccount(this.data.accounts[0].id);
        }
    }

    renderEmails() {
        const container = document.getElementById('mail-list');
        if (!container) return;

        const emails = this.getEmailsForCurrentFolder();
        
        if (emails.length === 0) {
            container.innerHTML = `
                <div class="mail-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <h3>No emails</h3>
                    <p>Your ${this.currentFolder} folder is empty</p>
                </div>
            `;
            return;
        }

        container.innerHTML = emails.map(email => this.createEmailItem(email)).join('');

        // Add click handlers
        container.querySelectorAll('.mail-email-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.mail-email-checkbox')) {
                    const emailId = item.dataset.emailId;
                    this.openEmail(emailId);
                }
            });
        });

        // Update folder count
        this.updateFolderCounts();
    }

    createEmailItem(email) {
        const isSelected = this.selectedEmails.has(email.id);
        const avatarLetter = email.from.charAt(0).toUpperCase();
        
        return `
            <div class="mail-email-item ${email.unread ? 'unread' : ''} ${isSelected ? 'selected' : ''}" 
                 data-email-id="${email.id}">
                <input type="checkbox" class="mail-email-checkbox mail-checkbox" 
                       ${isSelected ? 'checked' : ''}
                       onchange="mailApp.toggleEmailSelection('${email.id}', this.checked)">
                <div class="mail-email-avatar">${avatarLetter}</div>
                <div class="mail-email-content">
                    <div class="mail-email-header">
                        <span class="mail-email-from">${this.escapeHtml(email.from)}</span>
                        <span class="mail-email-time">${this.formatTime(email.date)}</span>
                    </div>
                    <div class="mail-email-subject">${this.escapeHtml(email.subject)}</div>
                    <div class="mail-email-preview">${this.escapeHtml(email.preview || email.body.substring(0, 100))}</div>
                    ${email.attachments && email.attachments.length > 0 ? `
                        <div class="mail-email-attachment">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                            </svg>
                            ${email.attachments.length} attachment${email.attachments.length > 1 ? 's' : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getEmailsForCurrentFolder() {
        let emails = this.data.emails.filter(e => e.folder === this.currentFolder);
        
        // Filter by current account if set
        if (this.currentAccount) {
            emails = emails.filter(e => e.accountId === this.currentAccount.id);
        }
        
        // Sort by date (newest first)
        emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return emails;
    }

    setCurrentFolder(folder) {
        this.currentFolder = folder;
        
        // Update UI
        document.querySelectorAll('.mail-folder').forEach(f => {
            f.classList.toggle('active', f.dataset.folder === folder);
        });
        
        // Update subtitle
        const subtitle = document.getElementById('mail-subtitle');
        if (subtitle) {
            subtitle.textContent = folder.charAt(0).toUpperCase() + folder.slice(1);
        }
        
        this.renderEmails();
    }

    setCurrentAccount(accountId) {
        const account = this.data.accounts.find(a => a.id === accountId);
        if (account) {
            this.currentAccount = account;
            this.renderAccounts();
            this.renderEmails();
        }
    }

    updateFolderCounts() {
        const inboxCount = this.data.emails.filter(e => e.folder === 'inbox' && e.unread).length;
        const inboxCountEl = document.getElementById('inbox-count');
        if (inboxCountEl) {
            inboxCountEl.textContent = inboxCount > 0 ? inboxCount : '';
        }
    }

    // Email Provider Integration
    async showAddAccountModal() {
        const modal = document.getElementById('mail-add-account-modal');
        const body = modal?.querySelector('.mail-add-account-modal');
        if (!modal || !body) return;

        body.innerHTML = `
            <div class="mail-modal-header">
                <h2>Add Email Account</h2>
                <button class="mail-modal-close" onclick="mailApp.hideAddAccountModal()">&times;</button>
            </div>
            <div class="mail-modal-body">
                <p style="margin-bottom: 20px; color: var(--mail-text-muted);">
                    Connect your email account to sync emails and send messages.
                </p>
                <button class="mail-provider-btn" onclick="mailApp.connectGmail()">
                    <svg viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Connect Gmail</span>
                </button>
                <button class="mail-provider-btn" onclick="mailApp.connectOutlook()">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.5 11.5h9m-9 3h9m3-9.5v13a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4.5 14.5v-13A1.5 1.5 0 0 1 6 0h12a1.5 1.5 0 0 1 1.5 1.5z"/>
                    </svg>
                    <span>Connect Outlook</span>
                </button>
                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--mail-border);">
                    <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Or add manually</h3>
                    <form onsubmit="mailApp.addManualAccount(event)">
                        <div class="mail-form-group">
                            <label>Email Address</label>
                            <input type="email" class="mail-input" id="manual-email" placeholder="you@example.com" required>
                        </div>
                        <div class="mail-form-group">
                            <label>Display Name</label>
                            <input type="text" class="mail-input" id="manual-name" placeholder="Your Name" required>
                        </div>
                        <div class="mail-modal-actions">
                            <button type="button" class="mail-btn mail-btn-secondary" onclick="mailApp.hideAddAccountModal()">Cancel</button>
                            <button type="submit" class="mail-btn mail-btn-primary">Add Account</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    hideAddAccountModal() {
        const modal = document.getElementById('mail-add-account-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async connectGmail() {
        try {
            // OAuth flow for Gmail
            const authUrl = `${this.apiBaseUrl}/mail/gmail/auth`;
            
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                // Simulate Gmail connection for local dev
                const account = {
                    id: `gmail_${Date.now()}`,
                    name: 'Gmail User',
                    email: 'user@gmail.com',
                    provider: 'gmail',
                    connected: true,
                    token: 'mock_token_' + Date.now()
                };
                
                this.data.accounts.push(account);
                this.saveData();
                this.renderAccounts();
                this.hideAddAccountModal();
                
                // Fetch emails from Gmail
                await this.fetchGmailEmails(account);
            } else {
                // Production: Redirect to OAuth
                window.location.href = authUrl;
            }
        } catch (error) {
            console.error('[Mail] Gmail connection error:', error);
            alert('Failed to connect Gmail. Please try again.');
        }
    }

    async connectOutlook() {
        try {
            // OAuth flow for Outlook
            const authUrl = `${this.apiBaseUrl}/mail/outlook/auth`;
            
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                // Simulate Outlook connection for local dev
                const account = {
                    id: `outlook_${Date.now()}`,
                    name: 'Outlook User',
                    email: 'user@outlook.com',
                    provider: 'outlook',
                    connected: true,
                    token: 'mock_token_' + Date.now()
                };
                
                this.data.accounts.push(account);
                this.saveData();
                this.renderAccounts();
                this.hideAddAccountModal();
                
                // Fetch emails from Outlook
                await this.fetchOutlookEmails(account);
            } else {
                // Production: Redirect to OAuth
                window.location.href = authUrl;
            }
        } catch (error) {
            console.error('[Mail] Outlook connection error:', error);
            alert('Failed to connect Outlook. Please try again.');
        }
    }

    async fetchGmailEmails(account) {
        try {
            // Call backend API to fetch Gmail emails
            const response = await fetch(`${this.apiBaseUrl}/mail/gmail/inbox`, {
                headers: {
                    'Authorization': `Bearer ${account.token}`
                }
            });

            if (response.ok) {
                const emails = await response.json();
                this.processIncomingEmails(emails, account.id);
            } else {
                // For local dev, add sample emails
                this.addSampleEmails(account);
            }
        } catch (error) {
            console.error('[Mail] Failed to fetch Gmail emails:', error);
            // For local dev, add sample emails
            this.addSampleEmails(account);
        }
    }

    async fetchOutlookEmails(account) {
        try {
            // Call backend API to fetch Outlook emails
            const response = await fetch(`${this.apiBaseUrl}/mail/outlook/inbox`, {
                headers: {
                    'Authorization': `Bearer ${account.token}`
                }
            });

            if (response.ok) {
                const emails = await response.json();
                this.processIncomingEmails(emails, account.id);
            } else {
                // For local dev, add sample emails
                this.addSampleEmails(account);
            }
        } catch (error) {
            console.error('[Mail] Failed to fetch Outlook emails:', error);
            // For local dev, add sample emails
            this.addSampleEmails(account);
        }
    }

    processIncomingEmails(emails, accountId) {
        emails.forEach(email => {
            email.accountId = accountId;
            email.folder = 'inbox';
            email.unread = true;
            if (!this.data.emails.find(e => e.id === email.id)) {
                this.data.emails.push(email);
            }
        });
        this.saveData();
        this.renderEmails();
    }

    addSampleEmails(account) {
        const sampleEmails = [
            {
                id: `email_${Date.now()}_1`,
                accountId: account.id,
                from: 'welcome@example.com',
                to: account.email,
                subject: 'Welcome to AegisDesk Mail!',
                body: 'Thank you for connecting your email account. You can now send and receive emails directly from AegisDesk.',
                preview: 'Thank you for connecting your email account...',
                date: new Date().toISOString(),
                folder: 'inbox',
                unread: true
            },
            {
                id: `email_${Date.now()}_2`,
                accountId: account.id,
                from: 'notifications@example.com',
                to: account.email,
                subject: 'Your account is ready',
                body: 'Your email account has been successfully connected and is ready to use.',
                preview: 'Your email account has been successfully...',
                date: new Date(Date.now() - 3600000).toISOString(),
                folder: 'inbox',
                unread: true
            }
        ];
        
        sampleEmails.forEach(email => {
            if (!this.data.emails.find(e => e.id === email.id)) {
                this.data.emails.push(email);
            }
        });
        
        this.saveData();
        this.renderEmails();
    }

    addManualAccount(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('manual-email');
        const nameInput = document.getElementById('manual-name');
        
        if (!emailInput || !nameInput) return;

        const account = {
            id: `manual_${Date.now()}`,
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            provider: 'manual',
            connected: false
        };

        this.data.accounts.push(account);
        this.saveData();
        this.renderAccounts();
        this.hideAddAccountModal();
    }

    // Compose Email - Premium Rich Editor
    showComposeModal(replyToEmail = null, forwardEmail = null) {
        const modal = document.getElementById('mail-compose-modal');
        const body = modal?.querySelector('.mail-compose-modal');
        if (!modal || !body) return;

        if (this.data.accounts.length === 0) {
            alert('Please add an email account first');
            this.showAddAccountModal();
            return;
        }

        this.composeMode = replyToEmail ? 'reply' : forwardEmail ? 'forward' : 'new';
        this.composeAttachments = [];

        body.innerHTML = `
            <div class="mail-modal-header">
                <h2>${replyToEmail ? 'Reply' : forwardEmail ? 'Forward' : 'Compose Email'}</h2>
                <button class="mail-modal-close" onclick="mailApp.hideComposeModal()">&times;</button>
            </div>
            <div class="mail-modal-body">
                <form onsubmit="mailApp.sendEmail(event)">
                    <div class="mail-form-group">
                        <label>From</label>
                        <select class="mail-input" id="compose-from" required>
                            ${this.data.accounts.filter(a => a.connected).map(acc => `
                                <option value="${acc.id}" ${this.currentAccount?.id === acc.id ? 'selected' : ''}>
                                    ${this.escapeHtml(acc.name)} &lt;${this.escapeHtml(acc.email)}&gt;
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="mail-form-group">
                        <label>To</label>
                        <input type="text" class="mail-input" id="compose-to" 
                               placeholder="recipient@example.com" 
                               value="${replyToEmail ? this.escapeHtml(replyToEmail.from) : ''}"
                               required>
                    </div>
                    <div class="mail-form-group" style="display: none;" id="compose-cc-group">
                        <label>CC</label>
                        <input type="text" class="mail-input" id="compose-cc" placeholder="cc@example.com">
                    </div>
                    <div class="mail-form-group" style="display: none;" id="compose-bcc-group">
                        <label>BCC</label>
                        <input type="text" class="mail-input" id="compose-bcc" placeholder="bcc@example.com">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <button type="button" class="mail-btn-link" onclick="mailApp.toggleComposeField('cc')">CC</button>
                        <button type="button" class="mail-btn-link" onclick="mailApp.toggleComposeField('bcc')" style="margin-left: 12px;">BCC</button>
                    </div>
                    <div class="mail-form-group">
                        <label>Subject</label>
                        <input type="text" class="mail-input" id="compose-subject" 
                               placeholder="Subject" 
                               value="${replyToEmail ? `Re: ${this.escapeHtml(replyToEmail.subject)}` : forwardEmail ? `Fwd: ${this.escapeHtml(forwardEmail.subject)}` : ''}"
                               required>
                    </div>
                    <div class="mail-form-group">
                        <label>Message</label>
                        <div class="mail-compose-toolbar">
                            <button type="button" class="mail-compose-toolbar-btn" onclick="document.execCommand('bold', false, null)" title="Bold">
                                <strong>B</strong>
                            </button>
                            <button type="button" class="mail-compose-toolbar-btn" onclick="document.execCommand('italic', false, null)" title="Italic">
                                <em>I</em>
                            </button>
                            <button type="button" class="mail-compose-toolbar-btn" onclick="document.execCommand('underline', false, null)" title="Underline">
                                <u>U</u>
                            </button>
                            <div style="width: 1px; height: 24px; background: var(--mail-border); margin: 0 4px;"></div>
                            <button type="button" class="mail-compose-toolbar-btn" onclick="mailApp.insertLink()" title="Insert Link">
                                🔗
                            </button>
                            <button type="button" class="mail-compose-toolbar-btn" onclick="mailApp.insertEmoji()" title="Emoji">
                                😀
                            </button>
                        </div>
                        <div contenteditable="true" class="mail-compose-editor" id="compose-body" 
                             placeholder="Write your message..." 
                             style="min-height: 300px;">${replyToEmail ? `\n\n--- Original Message ---\nFrom: ${this.escapeHtml(replyToEmail.from)}\nDate: ${this.formatDate(replyToEmail.date)}\nSubject: ${this.escapeHtml(replyToEmail.subject)}\n\n${this.escapeHtml(replyToEmail.body)}` : forwardEmail ? `\n\n--- Forwarded Message ---\nFrom: ${this.escapeHtml(forwardEmail.from)}\nDate: ${this.formatDate(forwardEmail.date)}\nSubject: ${this.escapeHtml(forwardEmail.subject)}\n\n${this.escapeHtml(forwardEmail.body)}` : ''}</div>
                        <textarea class="mail-textarea" id="compose-html-body" style="display: none;"></textarea>
                    </div>
                    <div class="mail-form-group">
                        <div id="compose-attachments-list"></div>
                        <button type="button" class="mail-btn mail-btn-secondary" onclick="mailApp.addAttachment()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                            </svg>
                            Attach File
                        </button>
                    </div>
                    <div class="mail-form-group">
                        <label>
                            <input type="checkbox" id="compose-save-draft" style="margin-right: 8px;">
                            Save as draft
                        </label>
                        <label style="margin-left: 16px;">
                            <input type="checkbox" id="compose-schedule-send" style="margin-right: 8px;">
                            Schedule send
                        </label>
                    </div>
                    <div class="mail-modal-actions">
                        <button type="button" class="mail-btn mail-btn-secondary" onclick="mailApp.saveDraft()">Save Draft</button>
                        <button type="button" class="mail-btn mail-btn-secondary" onclick="mailApp.hideComposeModal()">Cancel</button>
                        <button type="submit" class="mail-btn mail-btn-primary">Send</button>
                    </div>
                </form>
            </div>
        `;

        modal.style.display = 'flex';
        
        // Initialize draft
        this.composeDraft = {
            to: replyToEmail ? replyToEmail.from : '',
            subject: replyToEmail ? `Re: ${replyToEmail.subject}` : forwardEmail ? `Fwd: ${forwardEmail.subject}` : '',
            body: ''
        };

        // Focus to input
        setTimeout(() => {
            const toInput = document.getElementById('compose-to');
            if (toInput && !replyToEmail) toInput.focus();
            else {
                const bodyEl = document.getElementById('compose-body');
                if (bodyEl) {
                    bodyEl.focus();
                    const range = document.createRange();
                    range.setStart(bodyEl, 0);
                    range.setEnd(bodyEl, 0);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        }, 100);

        // Sync HTML content
        const bodyEl = document.getElementById('compose-body');
        const htmlEl = document.getElementById('compose-html-body');
        if (bodyEl && htmlEl) {
            bodyEl.addEventListener('input', () => {
                htmlEl.value = bodyEl.innerHTML;
            });
        }
    }

    toggleComposeField(field) {
        const group = document.getElementById(`compose-${field}-group`);
        if (group) {
            group.style.display = group.style.display === 'none' ? 'block' : 'none';
        }
    }

    addAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (!this.composeAttachments) this.composeAttachments = [];
                    this.composeAttachments.push({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: event.target.result
                    });
                    this.renderAttachments();
                };
                reader.readAsDataURL(file);
            });
        };
        input.click();
    }

    renderAttachments() {
        const container = document.getElementById('compose-attachments-list');
        if (!container) return;

        if (!this.composeAttachments || this.composeAttachments.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.composeAttachments.map((att, idx) => `
            <div class="mail-attachment-item" style="margin-bottom: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
                <span>${this.escapeHtml(att.name)}</span>
                <button type="button" onclick="mailApp.removeAttachment(${idx})" style="margin-left: auto; background: transparent; border: none; color: var(--mail-error); cursor: pointer;">×</button>
            </div>
        `).join('');
    }

    removeAttachment(idx) {
        this.composeAttachments.splice(idx, 1);
        this.renderAttachments();
    }

    insertLink() {
        const url = prompt('Enter URL:');
        if (url) {
            document.execCommand('createLink', false, url);
        }
    }

    insertEmoji() {
        // Simple emoji picker - in production use a library
        const emojis = ['😀', '😊', '👍', '❤️', '🎉', '🔥', '⭐', '💯'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        document.execCommand('insertText', false, emoji);
    }

    saveDraft() {
        const toInput = document.getElementById('compose-to');
        const subjectInput = document.getElementById('compose-subject');
        const bodyEl = document.getElementById('compose-body');
        
        if (toInput && subjectInput && bodyEl) {
            const draft = {
                id: `draft_${Date.now()}`,
                to: toInput.value,
                subject: subjectInput.value,
                body: bodyEl.innerHTML,
                date: new Date().toISOString()
            };
            
            this.data.drafts.push(draft);
            this.saveData();
            this.hideComposeModal();
            
            if (window.notificationSystem) {
                window.notificationSystem.success('Mail', 'Draft saved');
            }
        }
    }

    hideComposeModal() {
        const modal = document.getElementById('mail-compose-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async sendEmail(event) {
        event.preventDefault();
        
        const fromSelect = document.getElementById('compose-from');
        const toInput = document.getElementById('compose-to');
        const subjectInput = document.getElementById('compose-subject');
        const bodyInput = document.getElementById('compose-body');
        const saveDraftCheckbox = document.getElementById('compose-save-draft');
        
        if (!fromSelect || !toInput || !subjectInput || !bodyInput) return;

        const accountId = fromSelect.value;
        const account = this.data.accounts.find(a => a.id === accountId);
        const to = toInput.value.trim();
        const subject = subjectInput.value.trim();
        const body = bodyInput.value.trim();
        const saveDraft = saveDraftCheckbox?.checked || false;

        if (saveDraft) {
            // Save as draft
            const draft = {
                id: `draft_${Date.now()}`,
                accountId: accountId,
                to: to,
                subject: subject,
                body: body,
                date: new Date().toISOString()
            };
            
            this.data.drafts.push(draft);
            this.saveData();
            this.hideComposeModal();
            
            if (window.notificationSystem) {
                window.notificationSystem.success('Mail', 'Draft saved');
            }
            return;
        }

        try {
            // Send email via backend API
            const response = await fetch(`${this.apiBaseUrl}/mail/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authSystem?.getAuthToken() || ''}`
                },
                body: JSON.stringify({
                    accountId: accountId,
                    to: to,
                    subject: subject,
                    body: body
                })
            });

            if (response.ok || window.location.hostname === 'localhost') {
                // Add to sent folder
                const email = {
                    id: `sent_${Date.now()}`,
                    accountId: accountId,
                    from: account.email,
                    to: to,
                    subject: subject,
                    body: body,
                    preview: body.substring(0, 100),
                    date: new Date().toISOString(),
                    folder: 'sent',
                    unread: false
                };
                
                this.data.emails.push(email);
                this.saveData();
                this.renderEmails();
                this.hideComposeModal();
                
                if (window.notificationSystem) {
                    window.notificationSystem.success('Mail', `Email sent to ${to}`);
                }
            } else {
                throw new Error('Failed to send email');
            }
        } catch (error) {
            console.error('[Mail] Send email error:', error);
            alert('Failed to send email. Please try again.');
        }
    }

    // Email Actions
    openEmail(emailId) {
        const email = this.data.emails.find(e => e.id === emailId);
        if (!email) return;

        // Mark as read
        email.unread = false;
        this.saveData();
        this.updateFolderCounts();

        const placeholder = document.getElementById('mail-viewer-placeholder');
        const content = document.getElementById('mail-viewer-content');
        
        if (placeholder) placeholder.style.display = 'none';
        if (content) {
            content.style.display = 'flex';
            content.innerHTML = `
                <div class="mail-view-header">
                    <h1 class="mail-view-subject">${this.escapeHtml(email.subject)}</h1>
                    <div class="mail-view-meta">
                        <div class="mail-view-meta-item">
                            <span class="mail-view-meta-label">From:</span>
                            <span>${this.escapeHtml(email.from)}</span>
                        </div>
                        <div class="mail-view-meta-item">
                            <span class="mail-view-meta-label">To:</span>
                            <span>${this.escapeHtml(email.to)}</span>
                        </div>
                        <div class="mail-view-meta-item">
                            <span class="mail-view-meta-label">Date:</span>
                            <span>${this.formatDate(email.date)}</span>
                        </div>
                    </div>
                </div>
                <div class="mail-view-body">${this.escapeHtml(email.body).replace(/\n/g, '<br>')}</div>
                <div class="mail-view-actions">
                    <button class="mail-btn mail-btn-primary" onclick="mailApp.replyEmail('${email.id}')">Reply</button>
                    <button class="mail-btn mail-btn-secondary" onclick="mailApp.forwardEmail('${email.id}')">Forward</button>
                    <button class="mail-btn mail-btn-secondary" onclick="mailApp.deleteEmail('${email.id}')">Delete</button>
                </div>
            `;
        }
    }

    replyEmail(emailId) {
        const email = this.data.emails.find(e => e.id === emailId);
        if (!email) return;
        this.showComposeModal(email, null);
    }

    forwardEmail(emailId) {
        const email = this.data.emails.find(e => e.id === emailId);
        if (!email) return;
        this.showComposeModal(null, email);
    }

    deleteEmail(emailId) {
        const email = this.data.emails.find(e => e.id === emailId);
        if (email) {
            email.folder = 'trash';
            this.saveData();
            this.renderEmails();
            
            // Hide viewer if deleted
            const placeholder = document.getElementById('mail-viewer-placeholder');
            const content = document.getElementById('mail-viewer-content');
            if (placeholder) placeholder.style.display = 'flex';
            if (content) content.style.display = 'none';
        }
    }

    toggleEmailSelection(emailId, selected) {
        if (selected) {
            this.selectedEmails.add(emailId);
        } else {
            this.selectedEmails.delete(emailId);
        }
        this.renderEmails();
    }

    selectAllEmails() {
        const emails = this.getEmailsForCurrentFolder();
        emails.forEach(email => this.selectedEmails.add(email.id));
        this.renderEmails();
    }

    deselectAllEmails() {
        this.selectedEmails.clear();
        this.renderEmails();
    }

    deleteSelectedEmails() {
        if (this.selectedEmails.size === 0) return;
        
        if (confirm(`Delete ${this.selectedEmails.size} email(s)?`)) {
            this.selectedEmails.forEach(emailId => {
                const email = this.data.emails.find(e => e.id === emailId);
                if (email) {
                    email.folder = 'trash';
                }
            });
            
            this.selectedEmails.clear();
            this.saveData();
            this.renderEmails();
        }
    }

    searchEmails(query) {
        // Filter emails by search query
        // This would be implemented with proper search logic
        console.log('[Mail] Searching:', query);
    }

    async refreshEmails() {
        if (!this.currentAccount) return;
        
        const account = this.currentAccount;
        
        if (account.provider === 'gmail') {
            await this.fetchGmailEmails(account);
        } else if (account.provider === 'outlook') {
            await this.fetchOutlookEmails(account);
        }
        
        if (window.notificationSystem) {
            window.notificationSystem.success('Mail', 'Emails refreshed');
        }
    }

    // Utility Methods
    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
        return date.toLocaleDateString();
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // NEW PREMIUM FEATURES

    // OAuth Integration with MailEngine
    async connectGmail() {
        try {
            const account = await this.engine.connectGmail();
            this.data.accounts.push(account);
            await this.engine.saveAccounts();
            this.renderAccounts();
            this.renderAccountSelector();
            this.hideAddAccountModal();
            
            // Sync emails
            const emails = await this.engine.syncAccount(account.id);
            this.processIncomingEmails(emails, account.id);
            
            // Start background sync
            this.engine.startSync(account.id);
            
            if (window.notificationSystem) {
                window.notificationSystem.success('Mail', `Connected ${account.email}`);
            }
        } catch (error) {
            console.error('[Mail] Gmail connection error:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Mail', 'Failed to connect Gmail');
            }
        }
    }

    async connectOutlook() {
        try {
            const account = await this.engine.connectOutlook();
            this.data.accounts.push(account);
            await this.engine.saveAccounts();
            this.renderAccounts();
            this.renderAccountSelector();
            this.hideAddAccountModal();
            
            const emails = await this.engine.syncAccount(account.id);
            this.processIncomingEmails(emails, account.id);
            
            this.engine.startSync(account.id);
            
            if (window.notificationSystem) {
                window.notificationSystem.success('Mail', `Connected ${account.email}`);
            }
        } catch (error) {
            console.error('[Mail] Outlook connection error:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Mail', 'Failed to connect Outlook');
            }
        }
    }

    async connectIMAP(credentials) {
        try {
            const account = await this.engine.connectIMAP(credentials);
            this.data.accounts.push(account);
            await this.engine.saveAccounts();
            this.renderAccounts();
            this.renderAccountSelector();
            this.hideAddAccountModal();
            
            const emails = await this.engine.syncAccount(account.id);
            this.processIncomingEmails(emails, account.id);
            
            if (window.notificationSystem) {
                window.notificationSystem.success('Mail', `Connected ${account.email}`);
            }
        } catch (error) {
            console.error('[Mail] IMAP connection error:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Mail', 'Failed to connect IMAP');
            }
        }
    }

    // Account Selector
    renderAccountSelector() {
        const selector = document.getElementById('mail-account-selector');
        if (!selector) return;

        if (this.data.accounts.length === 0) {
            selector.innerHTML = '';
            return;
        }

        const current = this.currentAccount || this.data.accounts[0];
        selector.innerHTML = `
            <div class="mail-account-selector-dropdown" onclick="mailApp.toggleAccountDropdown()">
                <div class="mail-account-selector-avatar">
                    ${current.avatar ? `<img src="${current.avatar}" alt="${current.name}">` : current.name.charAt(0).toUpperCase()}
                </div>
                <span class="mail-account-selector-email">${this.escapeHtml(current.email)}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <div class="mail-account-selector-menu" id="mail-account-selector-menu" style="display: none;">
                ${this.data.accounts.map(acc => `
                    <div class="mail-account-selector-item ${this.currentAccount?.id === acc.id ? 'active' : ''}" 
                         onclick="mailApp.setCurrentAccount('${acc.id}')">
                        <div class="mail-account-selector-avatar">
                            ${acc.avatar ? `<img src="${acc.avatar}" alt="${acc.name}">` : acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="mail-account-selector-name">${this.escapeHtml(acc.name)}</div>
                            <div class="mail-account-selector-email-small">${this.escapeHtml(acc.email)}</div>
                        </div>
                    </div>
                `).join('')}
                <div class="mail-account-selector-divider"></div>
                <div class="mail-account-selector-item" onclick="mailApp.showAddAccountModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Add Account</span>
                </div>
            </div>
        `;
    }

    toggleAccountDropdown() {
        const menu = document.getElementById('mail-account-selector-menu');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    }

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger if typing in input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // C - Compose
            if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.showComposeModal();
            }

            // R - Reply
            if (e.key === 'r' && !e.ctrlKey && !e.metaKey && this.currentEmail) {
                e.preventDefault();
                this.replyEmail(this.currentEmail.id);
            }

            // / - Search
            if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                const searchInput = document.getElementById('mail-search');
                if (searchInput) searchInput.focus();
            }

            // Del - Delete
            if (e.key === 'Delete' && this.selectedEmails.size > 0) {
                e.preventDefault();
                this.deleteSelectedEmails();
            }

            // G then I - Inbox
            if (e.key === 'i' && this.lastKey === 'g') {
                e.preventDefault();
                this.setCurrentFolder('inbox');
            }

            // G then S - Starred
            if (e.key === 's' && this.lastKey === 'g') {
                e.preventDefault();
                this.setCurrentFolder('starred');
            }

            this.lastKey = e.key;
            setTimeout(() => { this.lastKey = null; }, 1000);
        });
    }

    // Context Menu
    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            const emailItem = e.target.closest('.mail-email-item');
            if (emailItem) {
                e.preventDefault();
                const emailId = emailItem.dataset.emailId;
                this.showContextMenu(e.pageX, e.pageY, emailId);
            }
        });

        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    showContextMenu(x, y, emailId) {
        const menu = document.getElementById('mail-context-menu');
        if (!menu) return;

        const email = this.data.emails.find(e => e.id === emailId);
        if (!email) return;

        menu.style.display = 'block';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        menu.innerHTML = `
            <div class="mail-context-menu-item" onclick="mailApp.replyEmail('${emailId}'); mailApp.hideContextMenu();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 10 4 15 9 20"></polyline>
                    <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                </svg>
                <span>Reply</span>
            </div>
            <div class="mail-context-menu-item" onclick="mailApp.forwardEmail('${emailId}'); mailApp.hideContextMenu();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 17 20 12 15 7"></polyline>
                    <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
                </svg>
                <span>Forward</span>
            </div>
            <div class="mail-context-menu-divider"></div>
            <div class="mail-context-menu-item" onclick="mailApp.archiveEmail('${emailId}'); mailApp.hideContextMenu();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="21 8 21 21 3 21 3 8"></polyline>
                    <rect x="1" y="3" width="22" height="5"></rect>
                    <line x1="10" y1="12" x2="14" y2="12"></line>
                </svg>
                <span>Archive</span>
            </div>
            <div class="mail-context-menu-item" onclick="mailApp.deleteEmail('${emailId}'); mailApp.hideContextMenu();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Delete</span>
            </div>
            <div class="mail-context-menu-item" onclick="mailApp.markAsUnread('${emailId}'); mailApp.hideContextMenu();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
                <span>Mark as Unread</span>
            </div>
        `;
    }

    hideContextMenu() {
        const menu = document.getElementById('mail-context-menu');
        if (menu) menu.style.display = 'none';
    }

    // AI Assistant
    async handleAIAction(mode) {
        const responseEl = document.getElementById('mail-ai-response');
        if (!responseEl) return;

        if (!this.currentEmail && this.composeMode === 'new') {
            responseEl.innerHTML = '<p class="mail-ai-placeholder">Select an email or compose a message to get AI help!</p>';
            return;
        }

        responseEl.innerHTML = '<div class="mail-ai-loading">Processing...</div>';

        try {
            let prompt = '';
            let context = '';

            if (this.currentEmail) {
                context = `Email from ${this.currentEmail.from}:\nSubject: ${this.currentEmail.subject}\nBody: ${this.currentEmail.body}`;
            } else if (this.composeDraft) {
                context = `Draft email:\nTo: ${this.composeDraft.to}\nSubject: ${this.composeDraft.subject}\nBody: ${this.composeDraft.body}`;
            }

            switch (mode) {
                case 'reply':
                    prompt = `Write a professional, friendly reply to this email. Keep it concise and helpful.\n\n${context}`;
                    break;
                case 'summarize':
                    prompt = `Summarize this email in 2-3 bullet points:\n\n${context}`;
                    break;
                case 'rewrite':
                    prompt = `Rewrite this email in a more professional tone:\n\n${context}`;
                    break;
                case 'formal':
                    prompt = `Convert this email to formal business language:\n\n${context}`;
                    break;
                case 'tasks':
                    prompt = `Extract any tasks, action items, or deadlines from this email:\n\n${context}`;
                    break;
                case 'urgent':
                    prompt = `Analyze if this email is urgent and requires immediate attention:\n\n${context}`;
                    break;
            }

            const aiResponse = await this.callAI(prompt);
            
            responseEl.innerHTML = `
                <div class="mail-ai-result">
                    <div class="mail-ai-text">${this.formatAIResponse(aiResponse)}</div>
                    <div class="mail-ai-actions">
                        <button class="mail-btn mail-btn-primary" onclick="mailApp.applyAIResponse('${mode}')">Apply</button>
                        <button class="mail-btn mail-btn-secondary" onclick="mailApp.copyAIResponse()">Copy</button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('[Mail] AI error:', error);
            responseEl.innerHTML = '<p class="mail-ai-error">Failed to get AI response. Please try again.</p>';
        }
    }

    async callAI(prompt) {
        if (window.aiSystem) {
            return await window.aiSystem.getAIResponse(prompt, false);
        }
        
        // Fallback to API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });

        if (!response.ok) throw new Error('AI request failed');
        const data = await response.json();
        return data.response || data.message || 'No response';
    }

    formatAIResponse(text) {
        // Convert markdown-like formatting to HTML
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    applyAIResponse(mode) {
        const responseEl = document.getElementById('mail-ai-response');
        if (!responseEl) return;

        const text = responseEl.querySelector('.mail-ai-text')?.textContent || '';
        
        if (mode === 'reply' && this.currentEmail) {
            this.replyEmail(this.currentEmail.id);
            setTimeout(() => {
                const bodyInput = document.getElementById('compose-body');
                if (bodyInput) bodyInput.value = text;
            }, 100);
        } else if (this.composeDraft) {
            const bodyInput = document.getElementById('compose-body');
            if (bodyInput) bodyInput.value = text;
        }
    }

    copyAIResponse() {
        const responseEl = document.getElementById('mail-ai-response');
        const text = responseEl?.querySelector('.mail-ai-text')?.textContent || '';
        navigator.clipboard.writeText(text);
        if (window.notificationSystem) {
            window.notificationSystem.success('Mail', 'Copied to clipboard');
        }
    }

    // Themes
    applyTheme(themeName) {
        document.body.className = `mail-page mail-theme-${themeName}`;
        localStorage.setItem('aegis_mail_theme', themeName);
    }

    // Background Sync
    startBackgroundSync() {
        this.data.accounts.forEach(account => {
            if (account.connected && this.engine) {
                this.engine.startSync(account.id, 60000); // Every minute
            }
        });
    }

    // Auto-save drafts
    setupAutoSave() {
        setInterval(() => {
            if (this.composeDraft) {
                const toInput = document.getElementById('compose-to');
                const subjectInput = document.getElementById('compose-subject');
                const bodyInput = document.getElementById('compose-body');
                
                if (toInput && subjectInput && bodyInput) {
                    this.composeDraft.to = toInput.value;
                    this.composeDraft.subject = subjectInput.value;
                    this.composeDraft.body = bodyInput.value;
                    localStorage.setItem('aegis_mail_draft', JSON.stringify(this.composeDraft));
                }
            }
        }, 30000); // Every 30 seconds
    }

    // Enhanced Email Actions
    async markAsUnread(emailId) {
        const email = this.data.emails.find(e => e.id === emailId);
        if (email) {
            email.unread = true;
            if (this.currentAccount && this.engine) {
                await this.engine.markAsUnread(this.currentAccount.id, emailId);
            }
            this.saveData();
            this.renderEmails();
        }
    }

    async archiveEmail(emailId) {
        const email = this.data.emails.find(e => e.id === emailId);
        if (email) {
            email.folder = 'archive';
            if (this.currentAccount && this.engine) {
                await this.engine.archiveEmail(this.currentAccount.id, emailId);
            }
            this.saveData();
            this.renderEmails();
        }
    }

    // Real Email Sending
    async sendEmail(event) {
        event.preventDefault();
        
        const fromSelect = document.getElementById('compose-from');
        const toInput = document.getElementById('compose-to');
        const ccInput = document.getElementById('compose-cc');
        const bccInput = document.getElementById('compose-bcc');
        const subjectInput = document.getElementById('compose-subject');
        const bodyEl = document.getElementById('compose-body');
        const htmlBodyInput = document.getElementById('compose-html-body');
        const saveDraftCheckbox = document.getElementById('compose-save-draft');
        
        if (!fromSelect || !toInput || !subjectInput || !bodyEl) return;

        // Check if saving as draft
        if (saveDraftCheckbox?.checked) {
            this.saveDraft();
            return;
        }

        const accountId = fromSelect.value;
        const account = this.data.accounts.find(a => a.id === accountId);
        if (!account) {
            alert('Please select an account');
            return;
        }

        const emailData = {
            to: toInput.value.trim(),
            cc: ccInput?.value.trim() || '',
            bcc: bccInput?.value.trim() || '',
            subject: subjectInput.value.trim(),
            body: bodyEl.innerText || bodyEl.textContent || '',
            html: htmlBodyInput?.value.trim() || bodyEl.innerHTML || bodyEl.innerText.replace(/\n/g, '<br>'),
            attachments: this.composeAttachments || []
        };

        try {
            await this.engine.sendEmail(accountId, emailData);
            
            // Add to sent folder
            const sentEmail = {
                id: `sent_${Date.now()}`,
                accountId: accountId,
                from: account.email,
                to: emailData.to,
                subject: emailData.subject,
                body: emailData.body,
                preview: emailData.body.substring(0, 100),
                date: new Date().toISOString(),
                folder: 'sent',
                unread: false
            };
            
            this.data.emails.push(sentEmail);
            this.saveData();
            this.renderEmails();
            this.hideComposeModal();
            this.composeDraft = null;
            this.composeAttachments = [];
            
            if (window.notificationSystem) {
                window.notificationSystem.success('Mail', `Email sent to ${emailData.to}`);
            }
        } catch (error) {
            console.error('[Mail] Send error:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Mail', 'Failed to send email: ' + (error.message || 'Unknown error'));
            }
        }
    }

    // Enhanced Search
    async searchEmails(query) {
        this.searchQuery = query;
        
        if (!query.trim()) {
            this.renderEmails();
            return;
        }

        if (this.currentAccount && this.engine) {
            try {
                const results = await this.engine.searchEmails(this.currentAccount.id, query, {
                    folder: this.currentFolder
                });
                this.displaySearchResults(results);
            } catch (error) {
                console.error('[Mail] Search error:', error);
                // Fallback to local search
                this.localSearch(query);
            }
        } else {
            this.localSearch(query);
        }
    }

    localSearch(query) {
        const emails = this.getEmailsForCurrentFolder();
        const filtered = emails.filter(email => {
            const searchText = `${email.from} ${email.subject} ${email.body}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });
        
        const container = document.getElementById('mail-list');
        if (!container) return;
        
        container.innerHTML = filtered.map(email => this.createEmailItem(email)).join('');
    }

    displaySearchResults(emails) {
        const container = document.getElementById('mail-list');
        if (!container) return;
        
        container.innerHTML = emails.map(email => this.createEmailItem(email)).join('');
    }

    // Enhanced Email Viewer
    openEmail(emailId) {
        const email = this.data.emails.find(e => e.id === emailId);
        if (!email) return;

        this.currentEmail = email;
        
        // Mark as read
        email.unread = false;
        this.saveData();
        this.updateFolderCounts();
        this.renderEmails();

        const placeholder = document.getElementById('mail-viewer-placeholder');
        const content = document.getElementById('mail-viewer-content');
        
        if (placeholder) placeholder.style.display = 'none';
        if (content) {
            content.style.display = 'flex';
            content.innerHTML = this.renderEmailViewer(email);
        }

        // Update AI panel context
        this.updateAIPanel();
    }

    renderEmailViewer(email) {
        return `
            <div class="mail-view-header">
                <div class="mail-view-header-top">
                    <h1 class="mail-view-subject">${this.escapeHtml(email.subject)}</h1>
                    <div class="mail-view-actions-top">
                        <button class="mail-action-icon-btn" onclick="mailApp.starEmail('${email.id}')" title="Star">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="${email.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </button>
                        <button class="mail-action-icon-btn" onclick="mailApp.archiveEmail('${email.id}')" title="Archive">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                <rect x="1" y="3" width="22" height="5"></rect>
                                <line x1="10" y1="12" x2="14" y2="12"></line>
                            </svg>
                        </button>
                        <button class="mail-action-icon-btn" onclick="mailApp.deleteEmail('${email.id}')" title="Delete">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="mail-view-meta">
                    <div class="mail-view-meta-item">
                        <span class="mail-view-meta-label">From:</span>
                        <span>${this.escapeHtml(email.from)}</span>
                    </div>
                    <div class="mail-view-meta-item">
                        <span class="mail-view-meta-label">To:</span>
                        <span>${this.escapeHtml(email.to)}</span>
                    </div>
                    ${email.cc ? `
                        <div class="mail-view-meta-item">
                            <span class="mail-view-meta-label">CC:</span>
                            <span>${this.escapeHtml(email.cc)}</span>
                        </div>
                    ` : ''}
                    <div class="mail-view-meta-item">
                        <span class="mail-view-meta-label">Date:</span>
                        <span>${this.formatDate(email.date)}</span>
                    </div>
                    ${email.attachments && email.attachments.length > 0 ? `
                        <div class="mail-view-meta-item">
                            <span class="mail-view-meta-label">Attachments:</span>
                            <div class="mail-attachments-list">
                                ${email.attachments.map(att => `
                                    <a href="${att.url}" download="${att.name}" class="mail-attachment-item">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                        </svg>
                                        <span>${this.escapeHtml(att.name)}</span>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="mail-view-body" id="mail-view-body">
                ${email.html ? email.html : this.escapeHtml(email.body).replace(/\n/g, '<br>')}
            </div>
            <div class="mail-view-actions">
                <button class="mail-btn mail-btn-primary" onclick="mailApp.replyEmail('${email.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 10 4 15 9 20"></polyline>
                        <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                    </svg>
                    Reply
                </button>
                <button class="mail-btn mail-btn-secondary" onclick="mailApp.replyAllEmail('${email.id}')">
                    Reply All
                </button>
                <button class="mail-btn mail-btn-secondary" onclick="mailApp.forwardEmail('${email.id}')">
                    Forward
                </button>
            </div>
        `;
    }

    updateAIPanel() {
        // Setup AI mode buttons
        document.querySelectorAll('.mail-ai-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.handleAIAction(mode);
            });
        });
    }

    async starEmail(emailId) {
        const email = this.data.emails.find(e => e.id === emailId);
        if (email) {
            email.starred = !email.starred;
            if (this.currentAccount && this.engine) {
                if (email.starred) {
                    await this.engine.starEmail(this.currentAccount.id, emailId);
                } else {
                    await this.engine.unstarEmail(this.currentAccount.id, emailId);
                }
            }
            this.saveData();
            this.renderEmails();
            if (this.currentEmail && this.currentEmail.id === emailId) {
                this.openEmail(emailId);
            }
        }
    }

    replyAllEmail(emailId) {
        const email = this.data.emails.find(e => e.id === emailId);
        if (!email) return;

        this.composeMode = 'reply-all';
        this.showComposeModal();
        
        setTimeout(() => {
            const toInput = document.getElementById('compose-to');
            const ccInput = document.getElementById('compose-cc');
            const subjectInput = document.getElementById('compose-subject');
            const bodyInput = document.getElementById('compose-body');
            
            if (toInput) toInput.value = email.from;
            if (ccInput && email.cc) ccInput.value = email.cc;
            if (subjectInput) subjectInput.value = `Re: ${email.subject}`;
            if (bodyInput) {
                bodyInput.value = `\n\n--- Original Message ---\nFrom: ${email.from}\nDate: ${this.formatDate(email.date)}\nSubject: ${email.subject}\n\n${email.body}`;
            }
        }, 100);
    }
}

// Initialize
let mailApp;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        mailApp = new MailApp();
        window.mailApp = mailApp;
    });
} else {
    mailApp = new MailApp();
    window.mailApp = mailApp;
}
