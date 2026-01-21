// Bookmarks App
class BookmarksApp {
    constructor() {
        this.windowId = 'bookmarks';
        this.bookmarks = storage.get('bookmarks', [
            { name: 'Google', url: 'https://www.google.com', icon: '🌐' },
            { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶️' },
            { name: 'GitHub', url: 'https://github.com', icon: '💻' }
        ]);
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Bookmarks',
            width: 700,
            height: 600,
            class: 'app-bookmarks',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"></path>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
    }

    render() {
        const bookmarksHtml = this.bookmarks.map((bookmark, index) => `
            <div class="bookmark-item" data-index="${index}">
                <div class="bookmark-icon">${bookmark.icon || '🔗'}</div>
                <div class="bookmark-info">
                    <div class="bookmark-name">${this.escapeHtml(bookmark.name)}</div>
                    <div class="bookmark-url">${this.escapeHtml(bookmark.url)}</div>
                </div>
                <div class="bookmark-actions">
                    <button class="bookmark-action-btn" data-action="open" title="Open">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </button>
                    <button class="bookmark-action-btn" data-action="delete" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        return `
            <div class="bookmarks-container">
                <div class="bookmarks-header">
                    <h2>Bookmarks</h2>
                    <button class="bookmarks-add-btn" id="bookmark-add-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Bookmark
                    </button>
                </div>
                <div class="bookmarks-list" id="bookmarks-list">
                    ${this.bookmarks.length === 0 ? this.renderEmpty() : bookmarksHtml}
                </div>
            </div>
        `;
    }

    renderEmpty() {
        return `
            <div class="bookmarks-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"></path>
                </svg>
                <p>No bookmarks yet. Add one to get started!</p>
            </div>
        `;
    }

    attachEvents(window) {
        const content = window.querySelector('.window-content');
        const list = content.querySelector('#bookmarks-list');
        const addBtn = content.querySelector('#bookmark-add-btn');

        // Add bookmark
        addBtn.addEventListener('click', () => {
            this.showAddDialog(window);
        });

        // Bookmark actions
        list.addEventListener('click', (e) => {
            const bookmarkItem = e.target.closest('.bookmark-item');
            if (!bookmarkItem) return;

            const index = parseInt(bookmarkItem.dataset.index);
            const action = e.target.closest('[data-action]')?.dataset.action;

            if (action === 'open') {
                const bookmark = this.bookmarks[index];
                browserApp.open(bookmark.url, bookmark.name);
            } else if (action === 'delete') {
                this.deleteBookmark(index, window);
            } else if (!action) {
                // Click on bookmark item itself
                const bookmark = this.bookmarks[index];
                browserApp.open(bookmark.url, bookmark.name);
            }
        });
    }

    showAddDialog(window) {
        const dialog = document.createElement('div');
        dialog.className = 'bookmark-dialog-overlay';
        dialog.innerHTML = `
            <div class="bookmark-dialog">
                <h3>Add Bookmark</h3>
                <div class="dialog-form">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" id="bookmark-name" placeholder="e.g., Google" autofocus>
                    </div>
                    <div class="form-group">
                        <label>URL</label>
                        <input type="url" id="bookmark-url" placeholder="https://www.example.com">
                    </div>
                    <div class="dialog-actions">
                        <button class="dialog-btn dialog-cancel">Cancel</button>
                        <button class="dialog-btn dialog-save">Save</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);

        const cancelBtn = dialog.querySelector('.dialog-cancel');
        const saveBtn = dialog.querySelector('.dialog-save');
        const nameInput = dialog.querySelector('#bookmark-name');
        const urlInput = dialog.querySelector('#bookmark-url');

        cancelBtn.addEventListener('click', () => dialog.remove());
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.remove();
        });

        saveBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            
            if (!name || !url) {
                alert('Please fill in all fields');
                return;
            }

            // Ensure URL has protocol
            let finalUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                finalUrl = 'https://' + url;
            }

            this.addBookmark({ name, url: finalUrl }, window);
            dialog.remove();
        });

        // Enter key to save
        [nameInput, urlInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveBtn.click();
                }
            });
        });
    }

    addBookmark(bookmark, window) {
        this.bookmarks.push(bookmark);
        this.save();
        this.refresh(window);
    }

    deleteBookmark(index, window) {
        if (confirm('Are you sure you want to delete this bookmark?')) {
            this.bookmarks.splice(index, 1);
            this.save();
            this.refresh(window);
        }
    }

    refresh(window) {
        const content = window.querySelector('.window-content');
        content.innerHTML = this.render();
        this.attachEvents(window);
    }

    save() {
        storage.set('bookmarks', this.bookmarks);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    findBookmark(query) {
        const lowerQuery = query.toLowerCase();
        return this.bookmarks.find(b => 
            b.name.toLowerCase().includes(lowerQuery) || 
            b.url.toLowerCase().includes(lowerQuery)
        );
    }
}

const bookmarksApp = new BookmarksApp();

