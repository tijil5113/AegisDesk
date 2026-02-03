// Bookmarks App - PREMIUM SMART WEB VAULT
// Full-featured bookmark management with AI, browser integration, and advanced organization

class BookmarksApp {
    constructor() {
        this.windowId = 'bookmarks';
        this.db = null;
        this.dbName = 'AegisBookmarksDB';
        this.dbVersion = 1;
        
        // State
        this.bookmarks = [];
        this.folders = [];
        this.tags = [];
        this.currentView = localStorage.getItem('bookmarksView') || 'grid'; // grid, list, card
        this.currentFolder = null;
        this.selectedBookmarks = new Set();
        this.filteredBookmarks = [];
        this.searchQuery = '';
        this.sortBy = localStorage.getItem('bookmarksSort') || 'recent'; // recent, name, visits, date
        this.filterTag = null;
        this.showFavoritesOnly = false;
        
        // Settings
        this.theme = localStorage.getItem('bookmarksTheme') || 'default';
        this.autoDetectCategories = localStorage.getItem('bookmarksAutoDetect') !== 'false';
        
        // Performance
        this.faviconCache = new Map();
        this.previewCache = new Map();
        
        // Browser extension integration
        this.extensionInstalled = false;
        this.checkExtension();
        
        // Initialize IndexedDB
        this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.loadData().then(resolve).catch(reject);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Bookmarks store
                if (!db.objectStoreNames.contains('bookmarks')) {
                    const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
                    bookmarkStore.createIndex('folder', 'folder', { unique: false });
                    bookmarkStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                    bookmarkStore.createIndex('favorite', 'favorite', { unique: false });
                    bookmarkStore.createIndex('dateAdded', 'dateAdded', { unique: false });
                    bookmarkStore.createIndex('visitCount', 'visitCount', { unique: false });
                }
                
                // Folders store
                if (!db.objectStoreNames.contains('folders')) {
                    db.createObjectStore('folders', { keyPath: 'id' });
                }
                
                // Metadata store
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'bookmarkId' });
                }
            };
        });
    }

    async loadData() {
        // Load bookmarks
        const bookmarks = await this.getAllBookmarks();
        this.bookmarks = bookmarks;
        
        // Load folders
        const folders = await this.getAllFolders();
        this.folders = folders;
        
        // Extract tags
        this.tags = this.extractAllTags();
        
        // Apply filters
        this.applyFilters();
    }

    async getAllBookmarks() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // Fallback to localStorage
                const stored = storage.get('bookmarks', []);
                resolve(stored.map((b, i) => ({
                    id: b.id || `bookmark_${Date.now()}_${i}`,
                    name: b.name || 'Untitled',
                    url: b.url || '',
                    icon: b.icon || '🔗',
                    folder: b.folder || null,
                    tags: b.tags || [],
                    favorite: b.favorite || false,
                    dateAdded: b.dateAdded || new Date().toISOString(),
                    visitCount: b.visitCount || 0,
                    lastVisited: b.lastVisited || null,
                    description: b.description || '',
                    preview: b.preview || null,
                    favicon: b.favicon || null
                })));
                return;
            }
            
            const transaction = this.db.transaction(['bookmarks'], 'readonly');
            const store = transaction.objectStore('bookmarks');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFolders() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                const stored = storage.get('bookmarkFolders', []);
                resolve(stored);
                return;
            }
            
            const transaction = this.db.transaction(['folders'], 'readonly');
            const store = transaction.objectStore('folders');
            const request = store.getAll();
            request.onsuccess = () => {
                const folders = request.result || [];
                // Add default folders
                const defaultFolders = [
                    { id: 'favorites', name: 'Favorites', icon: '❤️', type: 'smart' },
                    { id: 'recent', name: 'Recently Added', icon: '🕐', type: 'smart' },
                    { id: 'most-visited', name: 'Most Visited', icon: '🔥', type: 'smart' }
                ];
                resolve([...defaultFolders, ...folders]);
            };
            request.onerror = () => reject(request.error);
        });
    }

    extractAllTags() {
        const tagSet = new Set();
        this.bookmarks.forEach(bookmark => {
            if (bookmark.tags && Array.isArray(bookmark.tags)) {
                bookmark.tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet).sort();
    }

    checkExtension() {
        // Check if browser extension is installed
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            try {
                chrome.runtime.sendMessage('aegis-desk-bookmarks', { action: 'ping' }, (response) => {
                    this.extensionInstalled = !!response;
                });
            } catch (e) {
                this.extensionInstalled = false;
            }
        }
    }

    open() {
        const content = this.render();
        const win = windowManager.createWindow(this.windowId, {
            title: 'Bookmarks - Smart Web Vault',
            width: Math.min(1200, window.innerWidth - 40),
            height: Math.min(800, window.innerHeight - 100),
            class: `app-bookmarks theme-${this.theme}`,
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"></path>
            </svg>`,
            content: content,
            onClose: () => this.cleanup()
        });

        this.currentWindow = win;
        this.attachEvents(win);
        this.loadData().then(() => {
            this.applyFilters();
            this.renderView(win);
            this.renderSidebar(win);
        });
    }

    render() {
        return `
            <div class="bookmarks-container">
                <!-- Header -->
                <div class="bookmarks-header">
                    <div class="bookmarks-header-left">
                        <h2 class="bookmarks-title">📚 Smart Web Vault</h2>
                        <div class="bookmarks-stats" id="bookmarks-stats">0 bookmarks</div>
                    </div>
                    <div class="bookmarks-header-actions">
                        <div class="view-toggle">
                            <button class="view-toggle-btn ${this.currentView === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View">⊞</button>
                            <button class="view-toggle-btn ${this.currentView === 'list' ? 'active' : ''}" data-view="list" title="List View">☰</button>
                            <button class="view-toggle-btn ${this.currentView === 'card' ? 'active' : ''}" data-view="card" title="Card View">▦</button>
                        </div>
                        <div class="bookmarks-menu" style="position:relative;">
                            <button class="bookmarks-btn-icon" id="bookmarks-menu-btn" title="More Options">⋯</button>
                            <div class="bookmarks-menu-dropdown" id="bookmarks-menu-dropdown" style="display:none;">
                                <div class="menu-item" id="menu-export-json">📥 Export as JSON</div>
                                <div class="menu-item" id="menu-export-html">📥 Export as HTML</div>
                                <div class="menu-divider"></div>
                                <div class="menu-item" id="menu-import-json">📤 Import JSON</div>
                                <div class="menu-item" id="menu-import-html">📤 Import HTML</div>
                                <div class="menu-divider"></div>
                                <div class="menu-item" id="menu-backup">💾 Create Backup</div>
                                <div class="menu-item" id="menu-restore">🔄 Restore Backup</div>
                            </div>
                        </div>
                        <button class="bookmarks-btn-icon" id="bookmarks-theme-toggle" title="Change Theme">🎨</button>
                        <button class="bookmarks-btn-primary" id="bookmark-add-btn" title="Add Bookmark (Ctrl+B)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add Bookmark
                        </button>
                    </div>
                </div>

                <!-- Search & Filters -->
                <div class="bookmarks-search-bar">
                    <div class="search-input-wrapper">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input type="text" id="bookmarks-search" placeholder="Search bookmarks, tags, URLs..." />
                        <button class="search-clear" id="search-clear" style="display:none;">✕</button>
                    </div>
                    <div class="filter-controls">
                        <select id="bookmarks-sort" title="Sort by">
                            <option value="recent">Recently Added</option>
                            <option value="name">Name (A-Z)</option>
                            <option value="visits">Most Visited</option>
                            <option value="date">Date Added</option>
                        </select>
                        <button class="bookmarks-btn-icon" id="filter-favorites" title="Show Favorites Only">❤</button>
                        <button class="bookmarks-btn-icon" id="filter-tags-toggle" title="Filter by Tags">🏷</button>
                    </div>
                </div>

                <!-- Tag Filter Panel -->
                <div class="bookmarks-tag-filter" id="bookmarks-tag-filter" style="display:none;">
                    <div class="tag-filter-title">Filter by Tags:</div>
                    <div class="tag-filter-list" id="tag-filter-list"></div>
                </div>

                <!-- Main Layout -->
                <div class="bookmarks-layout">
                    <!-- Left Sidebar -->
                    <div class="bookmarks-sidebar">
                        <div class="sidebar-section">
                            <h3>Collections</h3>
                            <button class="sidebar-btn ${!this.currentFolder ? 'active' : ''}" data-folder="all" id="sidebar-all">
                                <span class="sidebar-icon">📚</span>
                                <span class="sidebar-text">All Bookmarks</span>
                                <span class="sidebar-count" id="count-all">${this.bookmarks.length}</span>
                            </button>
                            <button class="sidebar-btn" data-folder="favorites" id="sidebar-favorites">
                                <span class="sidebar-icon">❤️</span>
                                <span class="sidebar-text">Favorites</span>
                                <span class="sidebar-count" id="count-favorites">${this.bookmarks.filter(b => b.favorite).length}</span>
                            </button>
                            <button class="sidebar-btn" data-folder="recent" id="sidebar-recent">
                                <span class="sidebar-icon">🕐</span>
                                <span class="sidebar-text">Recently Added</span>
                                <span class="sidebar-count" id="count-recent">${this.bookmarks.filter(b => {
                                    const date = new Date(b.dateAdded);
                                    const weekAgo = new Date();
                                    weekAgo.setDate(weekAgo.getDate() - 7);
                                    return date > weekAgo;
                                }).length}</span>
                            </button>
                            <button class="sidebar-btn" data-folder="most-visited" id="sidebar-most-visited">
                                <span class="sidebar-icon">🔥</span>
                                <span class="sidebar-text">Most Visited</span>
                                <span class="sidebar-count" id="count-most-visited">${this.bookmarks.filter(b => (b.visitCount || 0) > 5).length}</span>
                            </button>
                        </div>
                        <div class="sidebar-section">
                            <div class="sidebar-section-header">
                                <h3>Folders</h3>
                                <button class="sidebar-btn-new" id="sidebar-new-folder" title="New Folder">+</button>
                            </div>
                            <div class="sidebar-folders" id="sidebar-folders"></div>
                        </div>
                        <div class="sidebar-section">
                            <h3>Tags</h3>
                            <div class="sidebar-tags" id="sidebar-tags"></div>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="bookmarks-main">
                        <div class="bookmarks-content" id="bookmarks-content">
                            <!-- Bookmarks will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right-Click Context Menu -->
            <div class="bookmarks-context-menu" id="bookmarks-context-menu" style="display:none;">
                <div class="context-item" data-action="open">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Open in Browser
                </div>
                <div class="context-item" data-action="open-new-tab">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                    Open in New Tab
                </div>
                <div class="context-divider"></div>
                <div class="context-item" data-action="rename">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Rename
                </div>
                <div class="context-item" data-action="edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </div>
                <div class="context-item" data-action="duplicate">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                    </svg>
                    Duplicate
                </div>
                <div class="context-divider"></div>
                <div class="context-item" data-action="favorite">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
                    </svg>
                    Add to Favorites
                </div>
                <div class="context-item" data-action="share">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    Share Link
                </div>
                <div class="context-item" data-action="copy-url">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                    </svg>
                    Copy URL
                </div>
                <div class="context-divider"></div>
                <div class="context-item" data-action="move">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    Move to Folder
                </div>
                <div class="context-item" data-action="export">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export
                </div>
                <div class="context-divider"></div>
                <div class="context-item context-item-danger" data-action="delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    </svg>
                    Delete
                </div>
            </div>

            <!-- Add/Edit Bookmark Dialog -->
            <div class="bookmark-dialog-overlay" id="bookmark-dialog-overlay" style="display:none;">
                <div class="bookmark-dialog">
                    <div class="dialog-header">
                        <h3 id="dialog-title">Add Bookmark</h3>
                        <button class="dialog-close" id="dialog-close">✕</button>
                    </div>
                    <div class="dialog-form">
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="bookmark-name" placeholder="e.g., Google" autofocus>
                        </div>
                        <div class="form-group">
                            <label>URL</label>
                            <input type="url" id="bookmark-url" placeholder="https://www.example.com">
                            <button class="form-btn-small" id="fetch-metadata" title="Auto-fetch favicon and preview">🔍 Fetch</button>
                        </div>
                        <div class="form-group">
                            <label>Folder</label>
                            <select id="bookmark-folder">
                                <option value="">None</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Tags (comma-separated)</label>
                            <input type="text" id="bookmark-tags" placeholder="work, dev, important">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="bookmark-description" rows="3" placeholder="Optional description"></textarea>
                        </div>
                        <div class="form-group-checkbox">
                            <input type="checkbox" id="bookmark-favorite">
                            <label for="bookmark-favorite">Add to Favorites</label>
                        </div>
                        <div class="dialog-actions">
                            <button class="dialog-btn dialog-cancel">Cancel</button>
                            <button class="dialog-btn dialog-save">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents(win) {
        // Add bookmark button
        win.querySelector('#bookmark-add-btn')?.addEventListener('click', () => {
            this.showAddDialog(win);
        });

        // View toggle
        win.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentView = btn.dataset.view;
                localStorage.setItem('bookmarksView', this.currentView);
                win.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderView(win);
            });
        });

        // Search
        const searchInput = win.querySelector('#bookmarks-search');
        const searchClear = win.querySelector('#search-clear');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                searchClear.style.display = this.searchQuery ? 'block' : 'none';
                this.applyFilters();
                this.renderView(win);
            });
        }
        searchClear?.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            searchClear.style.display = 'none';
            this.applyFilters();
            this.renderView(win);
        });

        // Sort
        win.querySelector('#bookmarks-sort')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            localStorage.setItem('bookmarksSort', this.sortBy);
            this.applyFilters();
            this.renderView(win);
        });

        // Filter favorites
        win.querySelector('#filter-favorites')?.addEventListener('click', () => {
            this.showFavoritesOnly = !this.showFavoritesOnly;
            win.querySelector('#filter-favorites').classList.toggle('active', this.showFavoritesOnly);
            this.applyFilters();
            this.renderView(win);
        });

        // Tag filter toggle
        win.querySelector('#filter-tags-toggle')?.addEventListener('click', () => {
            const panel = win.querySelector('#bookmarks-tag-filter');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        // Theme toggle
        win.querySelector('#bookmarks-theme-toggle')?.addEventListener('click', () => {
            this.cycleTheme(win);
        });

        // Menu dropdown
        const menuBtn = win.querySelector('#bookmarks-menu-btn');
        const menuDropdown = win.querySelector('#bookmarks-menu-dropdown');
        if (menuBtn && menuDropdown) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
            });
            
            // Export/Import menu items
            win.querySelector('#menu-export-json')?.addEventListener('click', () => {
                this.exportBookmarks('json', win);
                menuDropdown.style.display = 'none';
            });
            win.querySelector('#menu-export-html')?.addEventListener('click', () => {
                this.exportBookmarks('html', win);
                menuDropdown.style.display = 'none';
            });
            win.querySelector('#menu-import-json')?.addEventListener('click', () => {
                this.importBookmarks('json', win);
                menuDropdown.style.display = 'none';
            });
            win.querySelector('#menu-import-html')?.addEventListener('click', () => {
                this.importBookmarks('html', win);
                menuDropdown.style.display = 'none';
            });
            win.querySelector('#menu-backup')?.addEventListener('click', () => {
                this.backupBookmarks(win);
                menuDropdown.style.display = 'none';
            });
            win.querySelector('#menu-restore')?.addEventListener('click', () => {
                this.restoreBookmarks(win);
                menuDropdown.style.display = 'none';
            });
            
            // Close dropdown on outside click
            document.addEventListener('click', () => {
                menuDropdown.style.display = 'none';
            });
        }

        // Sidebar navigation
        win.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const folder = btn.dataset.folder;
                this.currentFolder = folder === 'all' ? null : folder;
                win.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyFilters();
                this.renderView(win);
            });
        });

        // New folder
        win.querySelector('#sidebar-new-folder')?.addEventListener('click', () => {
            this.showNewFolderDialog(win);
        });

        // Context menu
        this.setupContextMenu(win);

        // Keyboard shortcuts
        win.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                win.querySelector('#bookmark-add-btn')?.click();
            } else if (e.key === 'Escape') {
                const menu = win.querySelector('#bookmarks-context-menu');
                if (menu && menu.style.display !== 'none') {
                    menu.style.display = 'none';
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInput?.focus();
            }
        });

        // Drag and drop
        this.setupDragAndDrop(win);
    }

    setupContextMenu(win) {
        const menu = win.querySelector('#bookmarks-context-menu');
        let contextBookmark = null;

        // Show context menu on right-click
        win.addEventListener('contextmenu', (e) => {
            const bookmarkItem = e.target.closest('.bookmark-item');
            if (bookmarkItem) {
                e.preventDefault();
                contextBookmark = this.filteredBookmarks[parseInt(bookmarkItem.dataset.index)];
                if (!contextBookmark) return;

                // Position menu
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const menuRect = menu.getBoundingClientRect();
                let left = e.clientX;
                let top = e.clientY;

                if (left + menuRect.width > viewportWidth) {
                    left = viewportWidth - menuRect.width - 10;
                }
                if (top + menuRect.height > viewportHeight) {
                    top = viewportHeight - menuRect.height - 10;
                }

                menu.style.left = `${left}px`;
                menu.style.top = `${top}px`;
                menu.style.display = 'block';

                // Update favorite item text
                const favoriteItem = menu.querySelector('[data-action="favorite"]');
                if (favoriteItem) {
                    favoriteItem.innerHTML = contextBookmark.favorite 
                        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path></svg>Remove from Favorites'
                        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path></svg>Add to Favorites';
                }
            }
        });

        // Hide menu on click outside
        document.addEventListener('click', () => {
            if (menu) menu.style.display = 'none';
        });

        // Handle menu actions
        menu.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                if (contextBookmark && action) {
                    this.handleContextAction(action, contextBookmark, win);
                }
                menu.style.display = 'none';
            });
        });
    }

    handleContextAction(action, bookmark, win) {
        switch(action) {
            case 'open':
                this.openBookmark(bookmark);
                break;
            case 'open-new-tab':
                window.open(bookmark.url, '_blank');
                break;
            case 'rename':
                this.showRenameDialog(bookmark, win);
                break;
            case 'edit':
                this.showEditDialog(bookmark, win);
                break;
            case 'duplicate':
                this.duplicateBookmark(bookmark, win);
                break;
            case 'favorite':
                bookmark.favorite = !bookmark.favorite;
                this.saveBookmark(bookmark);
                this.loadData().then(() => {
                    this.applyFilters();
                    this.renderView(win);
                    this.renderSidebar(win);
                });
                break;
            case 'share':
                this.shareBookmark(bookmark);
                break;
            case 'copy-url':
                navigator.clipboard.writeText(bookmark.url).then(() => {
                    this.showToast('URL copied to clipboard', win);
                });
                break;
            case 'move':
                this.showMoveDialog(bookmark, win);
                break;
            case 'export':
                this.exportBookmark(bookmark);
                break;
            case 'delete':
                this.deleteBookmark(bookmark.id, win);
                break;
        }
    }

    // Continue with more methods...
    // Due to length, I'll continue in the next part

    openBookmark(bookmark) {
        bookmark.visitCount = (bookmark.visitCount || 0) + 1;
        bookmark.lastVisited = new Date().toISOString();
        this.saveBookmark(bookmark);
        
        if (typeof browserApp !== 'undefined') {
            browserApp.open(bookmark.url, bookmark.name);
        } else {
            window.open(bookmark.url, '_blank');
        }
    }

    async saveBookmark(bookmark) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // Fallback to localStorage
                const index = this.bookmarks.findIndex(b => b.id === bookmark.id);
                if (index >= 0) {
                    this.bookmarks[index] = bookmark;
                } else {
                    this.bookmarks.push(bookmark);
                }
                storage.set('bookmarks', this.bookmarks);
                resolve();
                return;
            }
            
            const transaction = this.db.transaction(['bookmarks'], 'readwrite');
            const store = transaction.objectStore('bookmarks');
            const request = store.put(bookmark);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deleteBookmark(bookmarkId, win) {
        if (!confirm('Are you sure you want to delete this bookmark?')) return;
        
        return new Promise((resolve, reject) => {
            if (!this.db) {
                this.bookmarks = this.bookmarks.filter(b => b.id !== bookmarkId);
                storage.set('bookmarks', this.bookmarks);
                this.loadData().then(() => {
                    this.applyFilters();
                    this.renderView(win);
                    this.renderSidebar(win);
                });
                resolve();
                return;
            }
            
            const transaction = this.db.transaction(['bookmarks'], 'readwrite');
            const store = transaction.objectStore('bookmarks');
            const request = store.delete(bookmarkId);
            request.onsuccess = () => {
                this.loadData().then(() => {
                    this.applyFilters();
                    this.renderView(win);
                    this.renderSidebar(win);
                    resolve();
                });
            };
            request.onerror = () => reject(request.error);
        });
    }

    applyFilters() {
        let filtered = [...this.bookmarks];

        // Folder filter
        if (this.currentFolder) {
            if (this.currentFolder === 'favorites') {
                filtered = filtered.filter(b => b.favorite);
            } else if (this.currentFolder === 'recent') {
                filtered = filtered.filter(b => {
                    const date = new Date(b.dateAdded);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return date > weekAgo;
                });
            } else if (this.currentFolder === 'most-visited') {
                filtered = filtered.filter(b => (b.visitCount || 0) > 5).sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
            } else {
                filtered = filtered.filter(b => b.folder === this.currentFolder);
            }
        }

        // Search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(b => 
                b.name.toLowerCase().includes(query) ||
                b.url.toLowerCase().includes(query) ||
                (b.description && b.description.toLowerCase().includes(query)) ||
                (b.tags && b.tags.some(t => t.toLowerCase().includes(query)))
            );
        }

        // Favorites filter
        if (this.showFavoritesOnly) {
            filtered = filtered.filter(b => b.favorite);
        }

        // Tag filter
        if (this.filterTag) {
            filtered = filtered.filter(b => b.tags && b.tags.includes(this.filterTag));
        }

        // Sort
        filtered.sort((a, b) => {
            switch(this.sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'visits':
                    return (b.visitCount || 0) - (a.visitCount || 0);
                case 'date':
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
                case 'recent':
                default:
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
            }
        });

        this.filteredBookmarks = filtered;
    }

    renderView(win) {
        const content = win.querySelector('#bookmarks-content');
        if (!content) return;

        content.innerHTML = '';

        if (this.filteredBookmarks.length === 0) {
            content.innerHTML = this.renderEmpty();
            return;
        }

        content.className = `bookmarks-content view-${this.currentView}`;

        this.filteredBookmarks.forEach((bookmark, index) => {
            const item = this.createBookmarkElement(bookmark, index, win);
            content.appendChild(item);
        });

        this.updateStats(win);
    }

    createBookmarkElement(bookmark, index, win) {
        const div = document.createElement('div');
        div.className = 'bookmark-item';
        div.dataset.index = index;
        div.dataset.bookmarkId = bookmark.id;
        div.draggable = true;

        if (this.currentView === 'grid') {
            div.innerHTML = `
                <div class="bookmark-card">
                    <div class="bookmark-card-header">
                        <img src="${bookmark.favicon || this.getFaviconUrl(bookmark.url)}" 
                             class="bookmark-favicon" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="bookmark-favicon-fallback" style="display:none;">${bookmark.icon || '🔗'}</div>
                        ${bookmark.favorite ? '<span class="bookmark-favorite-badge">❤</span>' : ''}
                    </div>
                    <div class="bookmark-card-body">
                        <div class="bookmark-name">${this.escapeHtml(bookmark.name)}</div>
                        <div class="bookmark-url">${this.escapeHtml(this.shortenUrl(bookmark.url))}</div>
                        ${bookmark.description ? `<div class="bookmark-description">${this.escapeHtml(bookmark.description)}</div>` : ''}
                        ${bookmark.tags && bookmark.tags.length > 0 ? `
                            <div class="bookmark-tags">
                                ${bookmark.tags.map(t => `<span class="bookmark-tag">#${this.escapeHtml(t)}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="bookmark-card-footer">
                        <div class="bookmark-meta">
                            ${bookmark.visitCount > 0 ? `<span title="Visited ${bookmark.visitCount} times">👁 ${bookmark.visitCount}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        } else if (this.currentView === 'list') {
            div.innerHTML = `
                <div class="bookmark-list-item">
                    <img src="${bookmark.favicon || this.getFaviconUrl(bookmark.url)}" 
                         class="bookmark-favicon" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="bookmark-favicon-fallback" style="display:none;">${bookmark.icon || '🔗'}</div>
                    <div class="bookmark-info">
                        <div class="bookmark-name">${this.escapeHtml(bookmark.name)}</div>
                        <div class="bookmark-url">${this.escapeHtml(bookmark.url)}</div>
                    </div>
                    <div class="bookmark-meta-list">
                        ${bookmark.favorite ? '<span class="bookmark-favorite-badge">❤</span>' : ''}
                        ${bookmark.visitCount > 0 ? `<span title="Visited ${bookmark.visitCount} times">👁 ${bookmark.visitCount}</span>` : ''}
                    </div>
                </div>
            `;
        } else { // card view
            div.innerHTML = `
                <div class="bookmark-card-large">
                    ${bookmark.preview ? `<div class="bookmark-preview"><img src="${bookmark.preview}" alt="${this.escapeHtml(bookmark.name)}"></div>` : ''}
                    <div class="bookmark-card-content">
                        <div class="bookmark-card-header">
                            <img src="${bookmark.favicon || this.getFaviconUrl(bookmark.url)}" 
                                 class="bookmark-favicon" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="bookmark-favicon-fallback" style="display:none;">${bookmark.icon || '🔗'}</div>
                            <div class="bookmark-name">${this.escapeHtml(bookmark.name)}</div>
                            ${bookmark.favorite ? '<span class="bookmark-favorite-badge">❤</span>' : ''}
                        </div>
                        <div class="bookmark-url">${this.escapeHtml(this.shortenUrl(bookmark.url))}</div>
                        ${bookmark.description ? `<div class="bookmark-description">${this.escapeHtml(bookmark.description)}</div>` : ''}
                        ${bookmark.tags && bookmark.tags.length > 0 ? `
                            <div class="bookmark-tags">
                                ${bookmark.tags.map(t => `<span class="bookmark-tag">#${this.escapeHtml(t)}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Click to open
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.bookmark-action-btn')) {
                this.openBookmark(bookmark);
                this.loadData().then(() => {
                    this.applyFilters();
                    this.renderView(win);
                });
            }
        });

        return div;
    }

    getFaviconUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return '';
        }
    }

    shortenUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname + urlObj.pathname;
        } catch {
            return url;
        }
    }

    renderEmpty() {
        return `
            <div class="bookmarks-empty">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"></path>
                </svg>
                <h2>No Bookmarks Found</h2>
                <p>Add your first bookmark to get started!</p>
                <button class="bookmarks-btn-primary" id="empty-add-btn" style="margin-top: 20px;">+ Add Bookmark</button>
            </div>
        `;
    }

    renderSidebar(win) {
        // Render folders
        const foldersEl = win.querySelector('#sidebar-folders');
        if (foldersEl) {
            foldersEl.innerHTML = this.folders
                .filter(f => f.type !== 'smart')
                .map(folder => {
                    const count = this.bookmarks.filter(b => b.folder === folder.id).length;
                    return `
                        <button class="sidebar-btn ${this.currentFolder === folder.id ? 'active' : ''}" 
                                data-folder="${folder.id}">
                            <span class="sidebar-icon">${folder.icon || '📁'}</span>
                            <span class="sidebar-text">${this.escapeHtml(folder.name)}</span>
                            <span class="sidebar-count">${count}</span>
                        </button>
                    `;
                }).join('');
            
            foldersEl.querySelectorAll('.sidebar-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const folder = btn.dataset.folder;
                    this.currentFolder = folder;
                    win.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.applyFilters();
                    this.renderView(win);
                });
            });
        }

        // Render tags
        const tagsEl = win.querySelector('#sidebar-tags');
        if (tagsEl) {
            tagsEl.innerHTML = this.tags.map(tag => {
                const count = this.bookmarks.filter(b => b.tags && b.tags.includes(tag)).length;
                return `
                    <button class="sidebar-tag-btn ${this.filterTag === tag ? 'active' : ''}" 
                            data-tag="${tag}">
                        <span class="sidebar-tag-text">#${this.escapeHtml(tag)}</span>
                        <span class="sidebar-count">${count}</span>
                    </button>
                `;
            }).join('');

            tagsEl.querySelectorAll('.sidebar-tag-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tag = btn.dataset.tag;
                    this.filterTag = this.filterTag === tag ? null : tag;
                    win.querySelectorAll('.sidebar-tag-btn').forEach(b => b.classList.remove('active'));
                    if (this.filterTag === tag) btn.classList.add('active');
                    this.applyFilters();
                    this.renderView(win);
                });
            });
        }

        // Update counts
        this.updateSidebarCounts(win);
    }

    updateSidebarCounts(win) {
        win.querySelector('#count-all').textContent = this.bookmarks.length;
        win.querySelector('#count-favorites').textContent = this.bookmarks.filter(b => b.favorite).length;
        win.querySelector('#count-recent').textContent = this.bookmarks.filter(b => {
            const date = new Date(b.dateAdded);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date > weekAgo;
        }).length;
        win.querySelector('#count-most-visited').textContent = this.bookmarks.filter(b => (b.visitCount || 0) > 5).length;
    }

    updateStats(win) {
        const statsEl = win.querySelector('#bookmarks-stats');
        if (statsEl) {
            const total = this.bookmarks.length;
            const filtered = this.filteredBookmarks.length;
            statsEl.textContent = `${filtered}${filtered !== total ? ` of ${total}` : ''} bookmark${filtered !== 1 ? 's' : ''}`;
        }
    }

    showAddDialog(win) {
        const overlay = win.querySelector('#bookmark-dialog-overlay');
        const dialog = overlay.querySelector('.bookmark-dialog');
        const title = dialog.querySelector('#dialog-title');
        const nameInput = dialog.querySelector('#bookmark-name');
        const urlInput = dialog.querySelector('#bookmark-url');
        const folderSelect = dialog.querySelector('#bookmark-folder');
        const tagsInput = dialog.querySelector('#bookmark-tags');
        const descInput = dialog.querySelector('#bookmark-description');
        const favoriteCheck = dialog.querySelector('#bookmark-favorite');
        const saveBtn = dialog.querySelector('.dialog-save');
        const closeBtn = dialog.querySelector('#dialog-close');

        // Reset form
        title.textContent = 'Add Bookmark';
        nameInput.value = '';
        urlInput.value = '';
        tagsInput.value = '';
        descInput.value = '';
        favoriteCheck.checked = false;
        
        // Populate folders
        folderSelect.innerHTML = '<option value="">None</option>';
        this.folders.filter(f => f.type !== 'smart').forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            folderSelect.appendChild(option);
        });

        // Show dialog
        overlay.style.display = 'flex';

        // Fetch metadata button
        const fetchBtn = dialog.querySelector('#fetch-metadata');
        fetchBtn.onclick = () => {
            const url = urlInput.value.trim();
            if (!url) {
                alert('Please enter a URL first');
                return;
            }
            this.fetchBookmarkMetadata(url, nameInput, descInput, win);
        };

        // Save button
        const oldSaveHandler = saveBtn.onclick;
        saveBtn.onclick = () => {
            const name = nameInput.value.trim();
            let url = urlInput.value.trim();
            
            if (!name || !url) {
                alert('Please fill in name and URL');
                return;
            }

            // Ensure URL has protocol
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
            const folder = folderSelect.value || null;

            // Auto-detect category
            let autoFolder = folder;
            if (!autoFolder && this.autoDetectCategories) {
                const detectedFolder = this.detectCategory(url, name);
                if (detectedFolder) {
                    autoFolder = detectedFolder;
                }
            }

            const bookmark = {
                id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: name,
                url: url,
                folder: autoFolder,
                tags: tags,
                description: descInput.value.trim(),
                favorite: favoriteCheck.checked,
                dateAdded: new Date().toISOString(),
                visitCount: 0,
                lastVisited: null,
                icon: '🔗',
                favicon: this.getFaviconUrl(url),
                preview: null
            };

            // Fetch favicon and preview in background
            this.fetchBookmarkMetadata(url, null, null, win).then(metadata => {
                if (metadata.favicon) bookmark.favicon = metadata.favicon;
                if (metadata.preview) bookmark.preview = metadata.preview;
                if (metadata.description && !bookmark.description) bookmark.description = metadata.description;
                this.saveBookmark(bookmark);
            }).catch(() => {
                this.saveBookmark(bookmark);
            });

            overlay.style.display = 'none';
            this.loadData().then(() => {
                this.applyFilters();
                this.renderView(win);
                this.renderSidebar(win);
            });
        };

        // Close button
        closeBtn.onclick = () => {
            overlay.style.display = 'none';
        };
        dialog.querySelector('.dialog-cancel').onclick = () => {
            overlay.style.display = 'none';
        };
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.style.display = 'none';
        };

        // Enter key to save
        [nameInput, urlInput].forEach(input => {
            input.onkeypress = (e) => {
                if (e.key === 'Enter') saveBtn.click();
            };
        });
    }

    detectCategory(url, name) {
        const lowerUrl = url.toLowerCase();
        const lowerName = name.toLowerCase();

        // YouTube
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
            return this.getOrCreateFolder('Videos', '🎥');
        }
        
        // GitHub
        if (lowerUrl.includes('github.com')) {
            return this.getOrCreateFolder('Dev', '💻');
        }
        
        // Docs/Research
        if (lowerUrl.includes('docs.') || lowerUrl.includes('wikipedia') || 
            lowerUrl.includes('research') || lowerName.includes('research') ||
            lowerName.includes('study') || lowerName.includes('paper')) {
            return this.getOrCreateFolder('Study', '📚');
        }
        
        // Shopping
        if (lowerUrl.includes('amazon') || lowerUrl.includes('shop') || 
            lowerUrl.includes('store') || lowerUrl.includes('buy')) {
            return this.getOrCreateFolder('Shopping', '🛒');
        }
        
        // Social
        if (lowerUrl.includes('twitter') || lowerUrl.includes('facebook') || 
            lowerUrl.includes('instagram') || lowerUrl.includes('linkedin') ||
            lowerUrl.includes('reddit') || lowerUrl.includes('discord')) {
            return this.getOrCreateFolder('Social', '👥');
        }

        return null;
    }

    getOrCreateFolder(name, icon) {
        let folder = this.folders.find(f => f.name === name && f.type !== 'smart');
        if (!folder) {
            folder = {
                id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: name,
                icon: icon,
                type: 'user',
                created: new Date().toISOString()
            };
            this.saveFolder(folder).then(() => {
                this.loadData().then(() => {
                    if (this.currentWindow) {
                        this.renderSidebar(this.currentWindow);
                    }
                });
            });
        }
        return folder.id;
    }

    async fetchBookmarkMetadata(url, nameInput, descInput, win) {
        try {
            // Fetch favicon
            const favicon = this.getFaviconUrl(url);
            
            // Try to fetch page metadata via proxy or CORS
            // Note: This is a simplified version - in production, you'd use a backend proxy
            const metadata = {
                favicon: favicon,
                preview: null,
                description: ''
            };

            // Update inputs if provided
            if (nameInput && !nameInput.value) {
                try {
                    const domain = new URL(url).hostname.replace('www.', '');
                    nameInput.value = domain.charAt(0).toUpperCase() + domain.slice(1);
                } catch {}
            }

            return metadata;
        } catch (e) {
            console.error('Failed to fetch metadata:', e);
            return { favicon: this.getFaviconUrl(url), preview: null, description: '' };
        }
    }

    async saveFolder(folder) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                const index = this.folders.findIndex(f => f.id === folder.id);
                if (index >= 0) {
                    this.folders[index] = folder;
                } else {
                    this.folders.push(folder);
                }
                storage.set('bookmarkFolders', this.folders.filter(f => f.type !== 'smart'));
                resolve();
                return;
            }
            
            const transaction = this.db.transaction(['folders'], 'readwrite');
            const store = transaction.objectStore('folders');
            const request = store.put(folder);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    showNewFolderDialog(win) {
        const name = prompt('Folder name:');
        if (name && name.trim()) {
            const folder = {
                id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: name.trim(),
                icon: '📁',
                type: 'user',
                created: new Date().toISOString()
            };
            this.saveFolder(folder).then(() => {
                this.loadData().then(() => {
                    this.renderSidebar(win);
                });
            });
        }
    }

    showRenameDialog(bookmark, win) {
        const newName = prompt('Rename bookmark:', bookmark.name);
        if (newName && newName.trim() && newName !== bookmark.name) {
            bookmark.name = newName.trim();
            this.saveBookmark(bookmark);
            this.loadData().then(() => {
                this.applyFilters();
                this.renderView(win);
            });
        }
    }

    showEditDialog(bookmark, win) {
        // Similar to showAddDialog but pre-filled
        const overlay = win.querySelector('#bookmark-dialog-overlay');
        const dialog = overlay.querySelector('.bookmark-dialog');
        const title = dialog.querySelector('#dialog-title');
        const nameInput = dialog.querySelector('#bookmark-name');
        const urlInput = dialog.querySelector('#bookmark-url');
        const folderSelect = dialog.querySelector('#bookmark-folder');
        const tagsInput = dialog.querySelector('#bookmark-tags');
        const descInput = dialog.querySelector('#bookmark-description');
        const favoriteCheck = dialog.querySelector('#bookmark-favorite');
        const saveBtn = dialog.querySelector('.dialog-save');

        title.textContent = 'Edit Bookmark';
        nameInput.value = bookmark.name;
        urlInput.value = bookmark.url;
        tagsInput.value = bookmark.tags ? bookmark.tags.join(', ') : '';
        descInput.value = bookmark.description || '';
        favoriteCheck.checked = bookmark.favorite || false;

        // Populate folders
        folderSelect.innerHTML = '<option value="">None</option>';
        this.folders.filter(f => f.type !== 'smart').forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            option.selected = folder.id === bookmark.folder;
            folderSelect.appendChild(option);
        });

        overlay.style.display = 'flex';

        saveBtn.onclick = () => {
            bookmark.name = nameInput.value.trim();
            bookmark.url = urlInput.value.trim();
            bookmark.tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
            bookmark.folder = folderSelect.value || null;
            bookmark.description = descInput.value.trim();
            bookmark.favorite = favoriteCheck.checked;

            this.saveBookmark(bookmark);
            overlay.style.display = 'none';
            this.loadData().then(() => {
                this.applyFilters();
                this.renderView(win);
                this.renderSidebar(win);
            });
        };
    }

    duplicateBookmark(bookmark, win) {
        const newBookmark = {
            ...bookmark,
            id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: bookmark.name + ' (Copy)',
            dateAdded: new Date().toISOString(),
            visitCount: 0,
            lastVisited: null
        };
        this.saveBookmark(newBookmark);
        this.loadData().then(() => {
            this.applyFilters();
            this.renderView(win);
        });
    }

    shareBookmark(bookmark) {
        if (navigator.share) {
            navigator.share({
                title: bookmark.name,
                text: bookmark.description || bookmark.name,
                url: bookmark.url
            }).catch(() => {
                navigator.clipboard.writeText(bookmark.url);
                alert('URL copied to clipboard');
            });
        } else {
            navigator.clipboard.writeText(bookmark.url);
            alert('URL copied to clipboard');
        }
    }

    showMoveDialog(bookmark, win) {
        const folderNames = this.folders.filter(f => f.type !== 'smart').map(f => f.name);
        const choice = prompt(`Move to folder:\n\n${folderNames.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nEnter number or folder name:`);
        if (choice) {
            const index = parseInt(choice) - 1;
            let folder = null;
            if (!isNaN(index) && index >= 0 && index < folderNames.length) {
                folder = this.folders.filter(f => f.type !== 'smart')[index];
            } else {
                folder = this.folders.find(f => f.name.toLowerCase() === choice.toLowerCase() && f.type !== 'smart');
            }
            if (folder) {
                bookmark.folder = folder.id;
                this.saveBookmark(bookmark);
                this.loadData().then(() => {
                    this.applyFilters();
                    this.renderView(win);
                    this.renderSidebar(win);
                });
            }
        }
    }

    exportBookmark(bookmark) {
        const data = JSON.stringify(bookmark, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookmark-${bookmark.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    setupDragAndDrop(win) {
        const content = win.querySelector('#bookmarks-content');
        if (!content) return;

        let draggedElement = null;

        content.addEventListener('dragstart', (e) => {
            if (e.target.closest('.bookmark-item')) {
                draggedElement = e.target.closest('.bookmark-item');
                e.dataTransfer.effectAllowed = 'move';
                draggedElement.style.opacity = '0.5';
            }
        });

        content.addEventListener('dragend', (e) => {
            if (draggedElement) {
                draggedElement.style.opacity = '1';
                draggedElement = null;
            }
        });

        content.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        content.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedElement) {
                // Reorder logic would go here
                draggedElement.style.opacity = '1';
                draggedElement = null;
            }
        });
    }

    cycleTheme(win) {
        const themes = [
            { id: 'default', name: 'Default Dark' },
            { id: 'cyber-neon', name: 'Cyber Neon' },
            { id: 'glass-dark', name: 'Glass Dark' },
            { id: 'soft-pastel', name: 'Soft Pastel' },
            { id: 'amoled-night', name: 'AMOLED Night' },
            { id: 'minimal-light', name: 'Minimal Light' },
            { id: 'retro-pixel', name: 'Retro Pixel' }
        ];
        
        const currentIndex = themes.findIndex(t => t.id === this.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        this.theme = nextTheme.id;
        localStorage.setItem('bookmarksTheme', this.theme);
        
        const themeIds = themes.map(t => t.id);
        win.classList.remove(...themeIds.map(t => `theme-${t}`));
        win.classList.add(`theme-${this.theme}`);
        
        this.showToast(`Theme: ${nextTheme.name}`, win);
    }

    showToast(message, win) {
        const toast = document.createElement('div');
        toast.className = 'bookmarks-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    async exportBookmarks(format = 'json', win) {
        const bookmarksToExport = this.filteredBookmarks.length > 0 ? this.filteredBookmarks : this.bookmarks;
        
        if (format === 'json') {
            const data = JSON.stringify({
                version: 1,
                timestamp: new Date().toISOString(),
                bookmarks: bookmarksToExport,
                folders: this.folders.filter(f => f.type !== 'smart')
            }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bookmarks-export-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast(`Exported ${bookmarksToExport.length} bookmarks as JSON`, win);
        } else if (format === 'html') {
            // Chrome/Edge/Firefox HTML format
            let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;
            
            // Group by folder
            const foldersMap = new Map();
            bookmarksToExport.forEach(bookmark => {
                const folderId = bookmark.folder || 'none';
                if (!foldersMap.has(folderId)) {
                    foldersMap.set(folderId, []);
                }
                foldersMap.get(folderId).push(bookmark);
            });
            
            foldersMap.forEach((bookmarks, folderId) => {
                const folder = this.folders.find(f => f.id === folderId);
                if (folder && folder.type !== 'smart') {
                    html += `    <DT><H3>${this.escapeHtml(folder.name)}</H3>\n    <DL><p>\n`;
                }
                bookmarks.forEach(bookmark => {
                    html += `        <DT><A HREF="${this.escapeHtml(bookmark.url)}" ADD_DATE="${Math.floor(new Date(bookmark.dateAdded).getTime() / 1000)}">${this.escapeHtml(bookmark.name)}</A>\n`;
                });
                if (folder && folder.type !== 'smart') {
                    html += `    </DL><p>\n`;
                }
            });
            
            html += `</DL><p>`;
            
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bookmarks-export-${Date.now()}.html`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast(`Exported ${bookmarksToExport.length} bookmarks as HTML`, win);
        }
    }

    async importBookmarks(format = 'json', win) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = format === 'json' ? 'application/json' : 'text/html';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const text = await file.text();
            
            try {
                if (format === 'json') {
                    const data = JSON.parse(text);
                    const bookmarks = data.bookmarks || data;
                    let imported = 0;
                    
                    for (const bookmark of bookmarks) {
                        bookmark.id = bookmark.id || `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        await this.saveBookmark(bookmark);
                        imported++;
                    }
                    
                    if (data.folders) {
                        for (const folder of data.folders) {
                            await this.saveFolder(folder);
                        }
                    }
                    
                    this.showToast(`Imported ${imported} bookmarks`, win);
                } else if (format === 'html') {
                    // Parse HTML bookmarks (simplified)
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, 'text/html');
                    const links = doc.querySelectorAll('A');
                    let imported = 0;
                    
                    links.forEach(link => {
                        const bookmark = {
                            id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            name: link.textContent.trim(),
                            url: link.getAttribute('HREF'),
                            dateAdded: new Date(parseInt(link.getAttribute('ADD_DATE') || Date.now()) * 1000).toISOString(),
                            visitCount: 0,
                            favorite: false,
                            tags: [],
                            folder: null,
                            favicon: this.getFaviconUrl(link.getAttribute('HREF')),
                            preview: null
                        };
                        this.saveBookmark(bookmark);
                        imported++;
                    });
                    
                    this.showToast(`Imported ${imported} bookmarks from HTML`, win);
                }
                
                await this.loadData();
                this.applyFilters();
                this.renderView(win);
                this.renderSidebar(win);
            } catch (e) {
                alert(`Import failed: ${e.message}`);
            }
        });
        
        input.click();
    }

    async backupBookmarks(win) {
        const backup = {
            version: 1,
            timestamp: new Date().toISOString(),
            bookmarks: this.bookmarks,
            folders: this.folders.filter(f => f.type !== 'smart')
        };
        
        const data = JSON.stringify(backup, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookmarks-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Backup created successfully', win);
    }

    async restoreBookmarks(win) {
        if (!confirm('Restore will replace all current bookmarks. Continue?')) return;
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const backup = JSON.parse(text);
                
                // Clear existing
                if (this.db) {
                    const transaction = this.db.transaction(['bookmarks', 'folders'], 'readwrite');
                    await Promise.all([
                        new Promise((resolve) => {
                            const store = transaction.objectStore('bookmarks');
                            store.clear().onsuccess = () => resolve();
                        }),
                        new Promise((resolve) => {
                            const store = transaction.objectStore('folders');
                            store.clear().onsuccess = () => resolve();
                        })
                    ]);
                }
                
                // Restore bookmarks
                for (const bookmark of backup.bookmarks) {
                    await this.saveBookmark(bookmark);
                }
                
                // Restore folders
                for (const folder of backup.folders || []) {
                    await this.saveFolder(folder);
                }
                
                await this.loadData();
                this.applyFilters();
                this.renderView(win);
                this.renderSidebar(win);
                
                this.showToast(`Restored ${backup.bookmarks.length} bookmarks`, win);
            } catch (e) {
                alert(`Restore failed: ${e.message}`);
            }
        });
        
        input.click();
    }

    cleanup() {
        this.currentWindow = null;
        this.selectedBookmarks.clear();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const bookmarksApp = new BookmarksApp();

// Make globally accessible
if (typeof window !== 'undefined') {
    window.bookmarksApp = bookmarksApp;
}

// Browser Extension Integration
if (typeof chrome !== 'undefined' && chrome.runtime) {
    // Listen for messages from extension
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'saveBookmark') {
            const bookmark = {
                id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: request.title || 'Untitled',
                url: request.url,
                description: request.description || '',
                dateAdded: new Date().toISOString(),
                visitCount: 0,
                favorite: false,
                tags: [],
                folder: null,
                favicon: request.favicon || null,
                preview: request.preview || null
            };
            
            // Auto-detect category
            if (bookmarksApp.autoDetectCategories) {
                bookmark.folder = bookmarksApp.detectCategory(bookmark.url, bookmark.name);
            }
            
            bookmarksApp.saveBookmark(bookmark).then(() => {
                sendResponse({ success: true });
            });
            return true;
        }
    });
}
