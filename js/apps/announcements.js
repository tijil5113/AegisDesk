// ANNOUNCEMENTS - Announcements & Communication System
// Class announcements, instructor posts, system alerts

class AnnouncementsApp {
    constructor() {
        this.windowId = 'announcements';
        this.storageKey = 'aegis_announcements_data';
        this.currentFilter = 'all';
        this.data = this.loadData();
        this.init();
    }

    init() {
        console.log('[Announcements] Initializing...');
        this.setupEventListeners();
        this.render();
    }

    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[Announcements] Failed to load data:', e);
        }
        
        return {
            announcements: []
        };
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('[Announcements] Failed to save data:', e);
        }
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.announcements-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });

        // Create button
        const createBtn = document.getElementById('announcements-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateModal());
        }

        // Modal overlays - close on click outside
        document.querySelectorAll('.announcements-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.display = 'none';
                }
            });
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.announcements-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.render();
    }

    render() {
        const filtered = this.getFilteredAnnouncements();
        this.renderFeed(filtered);
    }

    getFilteredAnnouncements() {
        let announcements = [...this.data.announcements];
        
        // Sort by date (newest first)
        announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Filter by type
        if (this.currentFilter !== 'all') {
            announcements = announcements.filter(a => {
                if (this.currentFilter === 'pinned') return a.isPinned;
                if (this.currentFilter === 'unread') return !a.isRead;
                if (this.currentFilter === 'class') return a.category === 'class';
                if (this.currentFilter === 'system') return a.category === 'system';
                return true;
            });
        }
        
        return announcements;
    }

    renderFeed(announcements) {
        const container = document.getElementById('announcements-feed');
        const emptyState = document.getElementById('announcements-empty-state');
        
        if (!container) return;

        if (announcements.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';

        container.innerHTML = announcements.map(announcement => this.createAnnouncementCard(announcement)).join('');
        
        // Add click handlers
        container.querySelectorAll('.announcement-card').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                // Don't open detail if clicking action buttons
                if (e.target.closest('.announcement-action-btn')) return;
                
                const announcementId = card.dataset.announcementId;
                const announcement = this.data.announcements.find(a => a.id === announcementId);
                if (announcement) {
                    this.showAnnouncementDetail(announcement);
                }
            });
        });

        // Add action button handlers
        container.querySelectorAll('.announcement-pin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const announcementId = btn.dataset.announcementId;
                this.togglePin(announcementId);
            });
        });

        container.querySelectorAll('.announcement-mark-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const announcementId = btn.dataset.announcementId;
                this.markAsRead(announcementId);
            });
        });
    }

    createAnnouncementCard(announcement) {
        const isPinned = announcement.isPinned;
        const isUnread = !announcement.isRead;
        
        return `
            <div class="announcement-card ${isPinned ? 'pinned' : ''} ${isUnread ? 'unread' : ''}" 
                 data-announcement-id="${announcement.id}">
                <div class="announcement-header">
                    <div style="flex: 1;">
                        <div class="announcement-title">${this.escapeHtml(announcement.title)}</div>
                        <div class="announcement-meta">
                            <div class="announcement-source">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                ${this.escapeHtml(announcement.source)}
                            </div>
                            <div class="announcement-date">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                ${this.formatDate(announcement.createdAt)}
                            </div>
                            ${announcement.category ? `<div class="announcement-category">${announcement.category}</div>` : ''}
                        </div>
                    </div>
                </div>
                <div class="announcement-content">${this.escapeHtml(announcement.content.substring(0, 200))}${announcement.content.length > 200 ? '...' : ''}</div>
                <div class="announcement-footer">
                    <div class="announcement-actions">
                        <button class="announcement-action-btn announcement-pin-btn ${isPinned ? 'pinned' : ''}" 
                                data-announcement-id="${announcement.id}"
                                title="${isPinned ? 'Unpin' : 'Pin'}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <path d="M12 17v5"></path>
                                <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1a1 1 0 0 1 1 1v3.76z"></path>
                            </svg>
                            ${isPinned ? 'Pinned' : 'Pin'}
                        </button>
                        ${isUnread ? `
                            <button class="announcement-action-btn announcement-mark-read-btn" 
                                    data-announcement-id="${announcement.id}"
                                    title="Mark as read">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Mark Read
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    showAnnouncementDetail(announcement) {
        const modal = document.getElementById('announcements-detail-modal');
        if (!modal) return;

        // Mark as read
        this.markAsRead(announcement.id, false);

        modal.querySelector('.announcements-detail-modal').innerHTML = `
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0;">${this.escapeHtml(announcement.title)}</h2>
                        <div style="display: flex; gap: 16px; font-size: 14px; color: var(--announcements-text-muted);">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                ${this.escapeHtml(announcement.source)}
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                ${this.formatDate(announcement.createdAt)}
                            </div>
                            ${announcement.category ? `<div class="announcement-category">${announcement.category}</div>` : ''}
                        </div>
                    </div>
                </div>
                <div style="font-size: 16px; line-height: 1.7; color: var(--announcements-text); white-space: pre-wrap; margin-bottom: 24px;">
                    ${this.escapeHtml(announcement.content)}
                </div>
                <div style="padding-top: 20px; border-top: 1px solid var(--announcements-border);">
                    <button class="announcements-btn announcements-btn-secondary" onclick="announcementsApp.hideDetailModal()">Close</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    hideDetailModal() {
        const modal = document.getElementById('announcements-detail-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showCreateModal() {
        const modal = document.getElementById('announcements-create-modal');
        const form = document.getElementById('announcements-create-form');
        if (!modal || !form) return;

        form.innerHTML = `
            <div class="announcements-form-group">
                <label>Title *</label>
                <input type="text" class="announcements-input" id="create-title" placeholder="Enter announcement title">
            </div>
            <div class="announcements-form-group">
                <label>Source</label>
                <input type="text" class="announcements-input" id="create-source" placeholder="e.g., Instructor, Admin, System">
            </div>
            <div class="announcements-form-group">
                <label>Category</label>
                <select class="announcements-select" id="create-category">
                    <option value="class">Class</option>
                    <option value="system">System</option>
                    <option value="general">General</option>
                </select>
            </div>
            <div class="announcements-form-group">
                <label>Content *</label>
                <textarea class="announcements-textarea" id="create-content" placeholder="Enter announcement content..."></textarea>
            </div>
            <div class="announcements-form-group">
                <label>
                    <input type="checkbox" id="create-pinned" style="margin-right: 8px;">
                    Pin this announcement
                </label>
            </div>
            <div class="announcements-modal-actions">
                <button class="announcements-btn announcements-btn-secondary" onclick="announcementsApp.hideCreateModal()">Cancel</button>
                <button class="announcements-btn announcements-btn-primary" onclick="announcementsApp.createAnnouncement()">Create</button>
            </div>
        `;

        modal.style.display = 'flex';
        
        // Focus title input
        setTimeout(() => {
            const titleInput = document.getElementById('create-title');
            if (titleInput) titleInput.focus();
        }, 100);
    }

    hideCreateModal() {
        const modal = document.getElementById('announcements-create-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    createAnnouncement() {
        const titleInput = document.getElementById('create-title');
        const sourceInput = document.getElementById('create-source');
        const categoryInput = document.getElementById('create-category');
        const contentInput = document.getElementById('create-content');
        const pinnedCheckbox = document.getElementById('create-pinned');

        if (!titleInput || !contentInput) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
            alert('Please enter both title and content');
            return;
        }

        const announcement = {
            id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: title,
            source: sourceInput?.value.trim() || 'System',
            category: categoryInput?.value || 'general',
            content: content,
            isPinned: pinnedCheckbox?.checked || false,
            isRead: false,
            createdAt: Date.now()
        };

        this.data.announcements.push(announcement);
        this.saveData();
        this.render();
        this.hideCreateModal();

        console.log('[Announcements] Created announcement:', announcement);
    }

    togglePin(announcementId) {
        const announcement = this.data.announcements.find(a => a.id === announcementId);
        if (announcement) {
            announcement.isPinned = !announcement.isPinned;
            this.saveData();
            this.render();
        }
    }

    markAsRead(announcementId, render = true) {
        const announcement = this.data.announcements.find(a => a.id === announcementId);
        if (announcement) {
            announcement.isRead = true;
            this.saveData();
            if (render) this.render();
        }
    }

    // Utility Methods
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (diffDays < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
let announcementsApp;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        announcementsApp = new AnnouncementsApp();
        window.announcementsApp = announcementsApp;
    });
} else {
    announcementsApp = new AnnouncementsApp();
    window.announcementsApp = announcementsApp;
}
