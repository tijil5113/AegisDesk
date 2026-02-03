// MAIL ENGINE - Gmail/Outlook API Integration
// Handles OAuth, token management, and email sync

class MailEngine {
    constructor() {
        this.apiBaseUrl = '/api/mail';
        this.storageKey = 'aegis_mail_tokens';
        this.accounts = [];
        this.syncIntervals = new Map();
        this.init();
    }

    async init() {
        await this.loadAccounts();
        this.setupTokenRefresh();
    }

    async loadAccounts() {
        try {
            const stored = localStorage.getItem('aegis_mail_accounts');
            if (stored) {
                this.accounts = JSON.parse(stored);
            }
        } catch (e) {
            console.error('[Mail Engine] Failed to load accounts:', e);
            this.accounts = [];
        }
    }

    async saveAccounts() {
        try {
            localStorage.setItem('aegis_mail_accounts', JSON.stringify(this.accounts));
        } catch (e) {
            console.error('[Mail Engine] Failed to save accounts:', e);
        }
    }

    // OAuth Flow - Gmail
    async connectGmail() {
        try {
            // Open OAuth popup
            const width = 500;
            const height = 600;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;
            
            const popup = window.open(
                `${this.apiBaseUrl}/gmail/auth`,
                'Gmail OAuth',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );

            // Listen for OAuth callback
            return new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    try {
                        if (popup.closed) {
                            clearInterval(checkInterval);
                            reject(new Error('OAuth popup closed'));
                            return;
                        }

                        // Check if popup redirected to callback
                        if (popup.location.href.includes('/gmail/callback')) {
                            clearInterval(checkInterval);
                            const url = new URL(popup.location.href);
                            const code = url.searchParams.get('code');
                            const error = url.searchParams.get('error');
                            
                            if (error) {
                                popup.close();
                                reject(new Error(error));
                                return;
                            }
                            
                            if (code) {
                                popup.close();
                                this.exchangeGmailCode(code).then(resolve).catch(reject);
                            }
                        }
                    } catch (e) {
                        // Cross-origin error - popup still loading
                    }
                }, 500);

                // Timeout after 5 minutes
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (!popup.closed) popup.close();
                    reject(new Error('OAuth timeout'));
                }, 300000);
            });
        } catch (error) {
            console.error('[Mail Engine] Gmail OAuth error:', error);
            throw error;
        }
    }

    async exchangeGmailCode(code) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/gmail/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                throw new Error('Failed to exchange code');
            }

            const data = await response.json();
            const account = {
                id: `gmail_${Date.now()}`,
                email: data.email,
                name: data.name || data.email.split('@')[0],
                provider: 'gmail',
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: Date.now() + (data.expires_in * 1000),
                avatar: data.picture || null,
                connected: true
            };

            this.accounts.push(account);
            await this.saveAccounts();
            
            // Start syncing
            await this.syncAccount(account.id);
            
            return account;
        } catch (error) {
            console.error('[Mail Engine] Code exchange error:', error);
            throw error;
        }
    }

    // OAuth Flow - Outlook
    async connectOutlook() {
        try {
            const width = 500;
            const height = 600;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;
            
            const popup = window.open(
                `${this.apiBaseUrl}/outlook/auth`,
                'Outlook OAuth',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );

            return new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    try {
                        if (popup.closed) {
                            clearInterval(checkInterval);
                            reject(new Error('OAuth popup closed'));
                            return;
                        }

                        if (popup.location.href.includes('/outlook/callback')) {
                            clearInterval(checkInterval);
                            const url = new URL(popup.location.href);
                            const code = url.searchParams.get('code');
                            const error = url.searchParams.get('error');
                            
                            if (error) {
                                popup.close();
                                reject(new Error(error));
                                return;
                            }
                            
                            if (code) {
                                popup.close();
                                this.exchangeOutlookCode(code).then(resolve).catch(reject);
                            }
                        }
                    } catch (e) {
                        // Cross-origin
                    }
                }, 500);

                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (!popup.closed) popup.close();
                    reject(new Error('OAuth timeout'));
                }, 300000);
            });
        } catch (error) {
            console.error('[Mail Engine] Outlook OAuth error:', error);
            throw error;
        }
    }

    async exchangeOutlookCode(code) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/outlook/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                throw new Error('Failed to exchange code');
            }

            const data = await response.json();
            const account = {
                id: `outlook_${Date.now()}`,
                email: data.email,
                name: data.name || data.email.split('@')[0],
                provider: 'outlook',
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: Date.now() + (data.expires_in * 1000),
                avatar: data.picture || null,
                connected: true
            };

            this.accounts.push(account);
            await this.saveAccounts();
            
            await this.syncAccount(account.id);
            
            return account;
        } catch (error) {
            console.error('[Mail Engine] Outlook code exchange error:', error);
            throw error;
        }
    }

    // IMAP/SMTP Manual Login
    async connectIMAP(credentials) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/imap/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: credentials.email,
                    password: credentials.password, // Will be encrypted on backend
                    imapHost: credentials.imapHost,
                    imapPort: credentials.imapPort,
                    smtpHost: credentials.smtpHost,
                    smtpPort: credentials.smtpPort,
                    secure: credentials.secure
                })
            });

            if (!response.ok) {
                throw new Error('IMAP connection failed');
            }

            const data = await response.json();
            const account = {
                id: `imap_${Date.now()}`,
                email: credentials.email,
                name: credentials.name || credentials.email.split('@')[0],
                provider: 'imap',
                connected: true,
                credentials: {
                    // Don't store password - backend handles it
                    imapHost: credentials.imapHost,
                    smtpHost: credentials.smtpHost
                }
            };

            this.accounts.push(account);
            await this.saveAccounts();
            
            await this.syncAccount(account.id);
            
            return account;
        } catch (error) {
            console.error('[Mail Engine] IMAP connection error:', error);
            throw error;
        }
    }

    // Token Management
    async refreshToken(accountId) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account || !account.refreshToken) return null;

        try {
            const response = await fetch(`${this.apiBaseUrl}/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId,
                    provider: account.provider,
                    refreshToken: account.refreshToken
                })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            account.accessToken = data.access_token;
            account.expiresAt = Date.now() + (data.expires_in * 1000);
            
            if (data.refresh_token) {
                account.refreshToken = data.refresh_token;
            }
            
            await this.saveAccounts();
            return account.accessToken;
        } catch (error) {
            console.error('[Mail Engine] Token refresh error:', error);
            return null;
        }
    }

    async getValidToken(accountId) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) return null;

        // Check if token is expired or expiring soon (within 5 minutes)
        if (account.expiresAt && account.expiresAt - Date.now() < 300000) {
            await this.refreshToken(accountId);
        }

        return account.accessToken;
    }

    setupTokenRefresh() {
        // Refresh tokens before they expire
        setInterval(() => {
            this.accounts.forEach(account => {
                if (account.expiresAt && account.expiresAt - Date.now() < 600000) {
                    this.refreshToken(account.id);
                }
            });
        }, 60000); // Check every minute
    }

    // Email Sync
    async syncAccount(accountId) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) return [];

        try {
            const token = await this.getValidToken(accountId);
            if (!token && account.provider !== 'imap') {
                throw new Error('No valid token');
            }

            const response = await fetch(`${this.apiBaseUrl}/${account.provider}/inbox`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Account-Id': accountId
                }
            });

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            const emails = await response.json();
            return emails;
        } catch (error) {
            console.error('[Mail Engine] Sync error:', error);
            return [];
        }
    }

    async syncFolder(accountId, folder) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) return [];

        try {
            const token = await this.getValidToken(accountId);
            const response = await fetch(`${this.apiBaseUrl}/${account.provider}/folder`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ accountId, folder })
            });

            if (!response.ok) {
                throw new Error('Folder sync failed');
            }

            return await response.json();
        } catch (error) {
            console.error('[Mail Engine] Folder sync error:', error);
            return [];
        }
    }

    // Start Background Sync
    startSync(accountId, intervalMs = 60000) {
        const sync = async () => {
            try {
                const emails = await this.syncAccount(accountId);
                if (this.onSync) {
                    this.onSync(accountId, emails);
                }
            } catch (error) {
                console.error('[Mail Engine] Background sync error:', error);
            }
        };

        // Sync immediately
        sync();

        // Then sync periodically
        const intervalId = setInterval(sync, intervalMs);
        this.syncIntervals.set(accountId, intervalId);
    }

    stopSync(accountId) {
        const intervalId = this.syncIntervals.get(accountId);
        if (intervalId) {
            clearInterval(intervalId);
            this.syncIntervals.delete(accountId);
        }
    }

    // Send Email
    async sendEmail(accountId, emailData) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) throw new Error('Account not found');

        try {
            const token = await this.getValidToken(accountId);
            const response = await fetch(`${this.apiBaseUrl}/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accountId,
                    provider: account.provider,
                    to: emailData.to,
                    cc: emailData.cc,
                    bcc: emailData.bcc,
                    subject: emailData.subject,
                    body: emailData.body,
                    html: emailData.html,
                    attachments: emailData.attachments || []
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Send failed');
            }

            return await response.json();
        } catch (error) {
            console.error('[Mail Engine] Send error:', error);
            throw error;
        }
    }

    // Search Emails
    async searchEmails(accountId, query, filters = {}) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) return [];

        try {
            const token = await this.getValidToken(accountId);
            const response = await fetch(`${this.apiBaseUrl}/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accountId,
                    provider: account.provider,
                    query,
                    filters
                })
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            return await response.json();
        } catch (error) {
            console.error('[Mail Engine] Search error:', error);
            return [];
        }
    }

    // Email Actions
    async markAsRead(accountId, emailId) {
        return this.emailAction(accountId, emailId, 'markRead');
    }

    async markAsUnread(accountId, emailId) {
        return this.emailAction(accountId, emailId, 'markUnread');
    }

    async starEmail(accountId, emailId) {
        return this.emailAction(accountId, emailId, 'star');
    }

    async unstarEmail(accountId, emailId) {
        return this.emailAction(accountId, emailId, 'unstar');
    }

    async archiveEmail(accountId, emailId) {
        return this.emailAction(accountId, emailId, 'archive');
    }

    async deleteEmail(accountId, emailId) {
        return this.emailAction(accountId, emailId, 'delete');
    }

    async moveEmail(accountId, emailId, folder) {
        return this.emailAction(accountId, emailId, 'move', { folder });
    }

    async emailAction(accountId, emailId, action, params = {}) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) throw new Error('Account not found');

        try {
            const token = await this.getValidToken(accountId);
            const response = await fetch(`${this.apiBaseUrl}/action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accountId,
                    provider: account.provider,
                    emailId,
                    action,
                    ...params
                })
            });

            if (!response.ok) {
                throw new Error(`Action ${action} failed`);
            }

            return await response.json();
        } catch (error) {
            console.error('[Mail Engine] Action error:', error);
            throw error;
        }
    }

    // Logout
    async logout(accountId) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) return;

        try {
            // Revoke token on server
            if (account.accessToken) {
                await fetch(`${this.apiBaseUrl}/revoke`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        accountId,
                        provider: account.provider,
                        token: account.accessToken
                    })
                });
            }

            // Stop syncing
            this.stopSync(accountId);

            // Remove account
            this.accounts = this.accounts.filter(a => a.id !== accountId);
            await this.saveAccounts();
        } catch (error) {
            console.error('[Mail Engine] Logout error:', error);
        }
    }

    getAccount(accountId) {
        return this.accounts.find(a => a.id === accountId);
    }

    getAllAccounts() {
        return this.accounts;
    }
}

// Global instance
if (typeof window !== 'undefined') {
    window.MailEngine = MailEngine;
}
