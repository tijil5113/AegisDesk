// NEXT-GEN FILES APP - OS-Grade File Manager
// Multi-pane, multi-view, AI-powered, beautiful
// Built on Virtual File System (VFS)

class NextGenFilesApp {
    constructor() {
        this.windowId = 'files';
        this.currentPath = '/';
        this.viewMode = storage.get('files_viewMode', 'grid'); // grid, list, column, timeline
        this.selectedFiles = new Set();
        this.clipboard = null;
        this.clipboardAction = null; // 'copy' or 'cut'
        this.navigationHistory = [];
        this.historyIndex = -1;
        this.searchQuery = '';
        this.sidebarCollapsed = false;
        this.inspectorVisible = true;
        this.previewFile = null;
        this.favorites = [];
        this.tags = [];
        
        // Initialize VFS
        this.initVFS();
    }
    
    async initVFS() {
        if (typeof vfs === 'undefined') {
            console.error('VFS not loaded!');
            return;
        }
        await vfs.init();
        this.favorites = await vfs.getFavorites();
        this.tags = await vfs.getTags();
    }
    
    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Files',
            width: 1200,
            height: 800,
            class: 'app-files-v2',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path>
            </svg>`,
            content: content
        });
        
        this.attachEvents(window);
        this.loadFolder(window, this.currentPath);
        this.consumeOpenIntent(window);
    }

    consumeOpenIntent(window) {
        try {
            const intent = (typeof storage !== 'undefined' && storage.get)
                ? storage.get('files_open_intent', null)
                : null;
            if (!intent) return;
            if (Date.now() - (intent.ts || 0) > 120000) {
                storage.remove('files_open_intent');
                return;
            }
            storage.remove('files_open_intent');
            if (intent.query && window.querySelector('#files-search')) {
                const input = window.querySelector('#files-search');
                input.value = intent.query;
                this.searchQuery = intent.query;
                this.loadFolder(window, this.currentPath);
            }
            if (intent.path) {
                const parent = intent.path.lastIndexOf('/') > 0
                    ? intent.path.slice(0, intent.path.lastIndexOf('/')) || '/'
                    : '/';
                this.loadFolder(window, parent);
            }
        } catch (e) { /* ignore */ }
    }
    
    render() {
        return `
            <div class="files-v2-container">
                <div class="aegis-app-notice" style="margin:10px 12px 0;">
                    <div><strong>Virtual workspace.</strong> Files stored here live in this browser. This is not unrestricted access to your computer disk.</div>
                </div>
                <!-- Toolbar -->
                <div class="files-toolbar">
                    <div class="toolbar-left">
                        <button class="toolbar-btn" id="files-back" title="Back (Alt+Left)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button class="toolbar-btn" id="files-forward" title="Forward (Alt+Right)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                        <button class="toolbar-btn" id="files-up" title="Up (Alt+Up)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                        </button>
                        <div class="toolbar-separator"></div>
                        <div class="breadcrumb-container" id="files-breadcrumb"></div>
                    </div>
                    <div class="toolbar-center">
                        <div class="search-container">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input type="text" id="files-search" placeholder="Search files..." autocomplete="off">
                            <button class="search-clear" id="search-clear" style="display: none;">x</button>
                        </div>
                    </div>
                    <div class="toolbar-right">
                        <button class="toolbar-btn" id="files-view-grid" data-view="grid" title="Grid View">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                        </button>
                        <button class="toolbar-btn" id="files-view-list" data-view="list" title="List View">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                        </button>
                        <button class="toolbar-btn" id="files-new-folder" title="New Folder (Ctrl+Shift+N)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path>
                                <line x1="12" y1="11" x2="12" y2="17"></line>
                                <line x1="9" y1="14" x2="15" y2="14"></line>
                            </svg>
                        </button>
                        <button class="toolbar-btn" id="files-upload" title="Upload (Ctrl+U)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Main Content Area -->
                <div class="files-main-content">
                    <!-- Sidebar -->
                    <div class="files-sidebar" id="files-sidebar">
                        <div class="sidebar-section">
                            <div class="sidebar-item active" data-path="/">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                                <span>Home</span>
                            </div>
                            <div class="sidebar-item" data-path="/Documents">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                                    <path d="M14 2v6h6"></path>
                                </svg>
                                <span>Documents</span>
                            </div>
                            <div class="sidebar-item" data-path="/Downloads">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                <span>Downloads</span>
                            </div>
                            <div class="sidebar-item" data-path="/Music">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 18V5l12-2v13"></path>
                                    <circle cx="6" cy="18" r="3"></circle>
                                    <circle cx="18" cy="16" r="3"></circle>
                                </svg>
                                <span>Music</span>
                            </div>
                            <div class="sidebar-item" data-path="/Pictures">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                <span>Pictures</span>
                            </div>
                            <div class="sidebar-item" data-path="/Videos">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                </svg>
                                <span>Videos</span>
                            </div>
                        </div>
                        
                        <div class="sidebar-section">
                            <div class="sidebar-header">Favorites</div>
                            <div class="sidebar-favorites" id="sidebar-favorites"></div>
                        </div>
                        
                        <div class="sidebar-section">
                            <div class="sidebar-header">Tags</div>
                            <div class="sidebar-tags" id="sidebar-tags"></div>
                        </div>
                        
                        <div class="sidebar-section">
                            <div class="sidebar-item" data-path="/Trash">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                                </svg>
                                <span>Trash</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Main View -->
                    <div class="files-main-view" id="files-main-view">
                        <div class="files-view-content" id="files-view-content"></div>
                    </div>
                    
                    <!-- Inspector Panel -->
                    <div class="files-inspector" id="files-inspector">
                        <div class="inspector-header">
                            <span>Details</span>
                            <button class="inspector-toggle" id="inspector-toggle" title="Toggle Inspector">x</button>
                        </div>
                        <div class="inspector-content" id="inspector-content">
                            <div class="inspector-empty">Select a file to view details</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadFolder(window, path) {
        try {
            this.currentPath = path;
            this.selectedFiles.clear();
            
            // Update breadcrumb
            this.updateBreadcrumb(window);
            
            // Update sidebar active state
            const sidebarItems = window.querySelectorAll('.sidebar-item');
            sidebarItems.forEach(item => {
                item.classList.toggle('active', item.dataset.path === path);
            });
            
            // Load files
            let files = [];
            if (this.searchQuery) {
                files = await vfs.search(this.searchQuery, { path, includeTrash: path === '/Trash' });
            } else {
                files = await vfs.listFolder(path, {
                    sortBy: storage.get('files_sortBy', 'name'),
                    sortOrder: storage.get('files_sortOrder', 'asc')
                });
            }
            
            // Render files
            this.renderFiles(window, files);
            
            // Update history
            if (this.navigationHistory[this.historyIndex] !== path) {
                this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
                this.navigationHistory.push(path);
                this.historyIndex = this.navigationHistory.length - 1;
            }
            
            // Update toolbar buttons
            this.updateToolbarButtons(window);
            
        } catch (error) {
            console.error('Error loading folder:', error);
            this.showError(window, `Failed to load folder: ${error.message}`);
        }
    }
    
    renderFiles(window, files) {
        const container = window.querySelector('#files-view-content');
        if (!container) return;
        
        if (files.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }
        
        switch (this.viewMode) {
            case 'grid':
                container.innerHTML = this.renderGridView(files);
                break;
            case 'list':
                container.innerHTML = this.renderListView(files);
                break;
            case 'column':
                container.innerHTML = this.renderColumnView(files);
                break;
            case 'timeline':
                container.innerHTML = this.renderTimelineView(files);
                break;
        }
        
        // Attach file item events
        this.attachFileEvents(window, files);
    }
    
    renderGridView(files) {
        return files.map(file => `
            <div class="file-item grid-item" 
                 data-path="${file.path}" 
                 data-type="${file.type}"
                 draggable="true">
                <div class="file-icon-container">
                    ${this.getFileIcon(file)}
                    ${file.type === 'folder' ? '<div class="folder-badge"></div>' : ''}
                </div>
                <div class="file-name" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</div>
                ${file.type === 'file' ? `<div class="file-size">${vfs.formatFileSize(file.size)}</div>` : ''}
            </div>
        `).join('');
    }
    
    renderListView(files) {
        return `
            <div class="files-list-view">
                <div class="list-header">
                    <div class="list-col-name">Name</div>
                    <div class="list-col-size">Size</div>
                    <div class="list-col-type">Type</div>
                    <div class="list-col-modified">Modified</div>
                </div>
                ${files.map(file => `
                    <div class="file-item list-item" 
                         data-path="${file.path}" 
                         data-type="${file.type}"
                         draggable="true">
                        <div class="list-col-name">
                            ${this.getFileIcon(file)}
                            <span class="file-name">${this.escapeHtml(file.name)}</span>
                        </div>
                        <div class="list-col-size">${file.type === 'file' ? vfs.formatFileSize(file.size) : '-'}</div>
                        <div class="list-col-type">${file.fileType || 'folder'}</div>
                        <div class="list-col-modified">${this.formatDate(file.modified)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderColumnView(files) {
        // macOS-style column view (simplified)
        return `
            <div class="files-column-view">
                ${files.map(file => `
                    <div class="file-item column-item" 
                         data-path="${file.path}" 
                         data-type="${file.type}"
                         draggable="true">
                        ${this.getFileIcon(file)}
                        <div class="file-name">${this.escapeHtml(file.name)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderTimelineView(files) {
        // Group by date
        const grouped = {};
        files.forEach(file => {
            const date = new Date(file.modified);
            const dateKey = date.toLocaleDateString();
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(file);
        });
        
        const dates = Object.keys(grouped).sort((a, b) => 
            new Date(b) - new Date(a)
        );
        
        return dates.map(date => `
            <div class="timeline-group">
                <div class="timeline-date">${date}</div>
                <div class="timeline-files">
                    ${grouped[date].map(file => `
                        <div class="file-item timeline-item" 
                             data-path="${file.path}" 
                             data-type="${file.type}"
                             draggable="true">
                            ${this.getFileIcon(file)}
                            <div class="file-info">
                                <div class="file-name">${this.escapeHtml(file.name)}</div>
                                <div class="file-meta">${vfs.formatFileSize(file.size)} - ${new Date(file.modified).toLocaleTimeString()}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
    
    getFileIcon(file) {
        if (file.type === 'folder') {
            return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path>
            </svg>`;
        }
        
        const fileType = file.fileType || 'file';
        const icons = {
            pdf: `<svg width="48" height="48" viewBox="0 0 24 24" fill="#ef4444" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                <path d="M14 2v6h6"></path>
                <path d="M16 13H8"></path><path d="M16 17H8"></path>
            </svg>`,
            image: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
            </svg>`,
            video: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>`,
            audio: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
            </svg>`,
            code: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
            </svg>`,
            text: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                <path d="M14 2v6h6"></path>
                <path d="M16 13H8"></path><path d="M16 17H8"></path>
            </svg>`
        };
        
        return icons[fileType] || `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
            <path d="M14 2v6h6"></path>
        </svg>`;
    }
    
    updateBreadcrumb(window) {
        const container = window.querySelector('#files-breadcrumb');
        if (!container) return;
        
        const parts = this.currentPath.split('/').filter(p => p);
        const items = ['Home', ...parts];
        
        container.innerHTML = items.map((part, index) => {
            const path = index === 0 ? '/' : '/' + parts.slice(0, index).join('/');
            return `<span class="breadcrumb-item" data-path="${path}">${this.escapeHtml(part)}</span>`;
        }).join('<span class="breadcrumb-separator">></span>');
        
        // Attach click handlers
        container.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadFolder(window, item.dataset.path);
            });
        });
    }
    
    attachEvents(window) {
        // Toolbar buttons
        window.querySelector('#files-back')?.addEventListener('click', () => this.navigateBack(window));
        window.querySelector('#files-forward')?.addEventListener('click', () => this.navigateForward(window));
        window.querySelector('#files-up')?.addEventListener('click', () => {
            const parent = this.currentPath === '/' ? '/' : this.currentPath.split('/').slice(0, -1).join('/') || '/';
            this.loadFolder(window, parent);
        });
        window.querySelector('#files-new-folder')?.addEventListener('click', () => this.createFolder(window));
        window.querySelector('#files-upload')?.addEventListener('click', () => this.uploadFiles(window));
        
        // View mode buttons
        window.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.viewMode = btn.dataset.view;
                storage.set('files_viewMode', this.viewMode);
                this.loadFolder(window, this.currentPath);
            });
        });
        
        // Search
        const searchInput = window.querySelector('#files-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                if (this.searchQuery) {
                    window.querySelector('#search-clear').style.display = 'block';
                    this.loadFolder(window, this.currentPath);
                } else {
                    window.querySelector('#search-clear').style.display = 'none';
                    this.loadFolder(window, this.currentPath);
                }
            });
            
            window.querySelector('#search-clear')?.addEventListener('click', () => {
                searchInput.value = '';
                this.searchQuery = '';
                window.querySelector('#search-clear').style.display = 'none';
                this.loadFolder(window, this.currentPath);
            });
        }
        
        // Sidebar
        window.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadFolder(window, item.dataset.path);
            });
        });
        
        // Inspector toggle
        window.querySelector('#inspector-toggle')?.addEventListener('click', () => {
            this.inspectorVisible = !this.inspectorVisible;
            const inspector = window.querySelector('#files-inspector');
            if (inspector) {
                inspector.style.display = this.inspectorVisible ? 'flex' : 'none';
            }
        });
        
        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            this.handleKeyboard(window, e);
        });
        
        // Drag & drop
        this.setupDragAndDrop(window);
    }
    
    attachFileEvents(window, files) {
        const fileItems = window.querySelectorAll('.file-item');
        
        fileItems.forEach(item => {
            const path = item.dataset.path;
            const file = files.find(f => f.path === path);
            if (!file) return;
            
            // Click to select/open
            item.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    // Multi-select
                    this.toggleSelection(path);
                } else if (e.shiftKey) {
                    // Range select
                    this.selectRange(files, path);
                } else {
                    // Single select/open
                    this.selectedFiles.clear();
                    this.selectedFiles.add(path);
                    if (file.type === 'folder') {
                        this.loadFolder(window, path);
                    } else {
                        this.openFile(file);
                    }
                }
                this.updateSelection(window);
            });
            
            // Double-click to open
            item.addEventListener('dblclick', () => {
                if (file.type === 'folder') {
                    this.loadFolder(window, path);
                } else {
                    this.openFile(file);
                }
            });
            
            // Context menu
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(window, e, file);
            });
            
            // Drag start
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', path);
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });
        
        // Drop zone
        const viewContent = window.querySelector('#files-view-content');
        if (viewContent) {
            viewContent.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            
            viewContent.addEventListener('drop', async (e) => {
                e.preventDefault();
                const sourcePath = e.dataTransfer.getData('text/plain');
                if (sourcePath) {
                    await this.moveFile(sourcePath, this.currentPath);
                    this.loadFolder(window, this.currentPath);
                }
            });
        }
    }
    
    async openFile(file) {
        // Show preview in inspector
        this.previewFile = file;
        this.updateInspector(file);
        
        // If it's a previewable file, show preview
        if (['image', 'pdf', 'text', 'code'].includes(file.fileType)) {
            await this.showPreview(file);
        } else {
            // Open in appropriate app
            if (file.fileType === 'audio' && typeof musicPlayerApp !== 'undefined') {
                // Open in music player
            } else if (file.fileType === 'video') {
                // Open in video player
            } else {
                // Open in file viewer
                const fileData = await vfs.getFileData(file.fileDataId);
                if (fileData) {
                    const url = URL.createObjectURL(fileData);
                    window.open(`file-viewer.html?name=${encodeURIComponent(file.name)}&url=${encodeURIComponent(url)}&type=${encodeURIComponent(file.fileType)}&mime=${encodeURIComponent(file.mimeType)}`, '_blank');
                }
            }
        }
    }
    
    async showPreview(file) {
        const inspector = document.querySelector('#inspector-content');
        if (!inspector) return;
        
        const fileData = await vfs.getFileData(file.fileDataId);
        if (!fileData) return;
        
        const url = URL.createObjectURL(fileData);
        
        let previewHTML = '';
        if (file.fileType === 'image') {
            previewHTML = `<img src="${url}" alt="${this.escapeHtml(file.name)}" style="max-width: 100%; height: auto;">`;
        } else if (file.fileType === 'pdf') {
            previewHTML = `<iframe src="${url}" style="width: 100%; height: 400px; border: none;"></iframe>`;
        } else if (file.fileType === 'text' || file.fileType === 'code') {
            const text = await fileData.text();
            previewHTML = `<pre style="background: rgba(15,23,42,0.5); padding: 16px; border-radius: 8px; overflow: auto; max-height: 400px; font-family: 'JetBrains Mono', monospace; font-size: 12px;">${this.escapeHtml(text)}</pre>`;
        }
        
        if (previewHTML) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'file-preview';
            previewDiv.innerHTML = previewHTML;
            inspector.appendChild(previewDiv);
        }
    }
    
    updateInspector(file) {
        const inspector = document.querySelector('#inspector-content');
        if (!inspector) return;
        
        inspector.innerHTML = `
            <div class="inspector-preview">
                ${this.getFileIcon(file)}
            </div>
            <div class="inspector-details">
                <div class="detail-row">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">${this.escapeHtml(file.name)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value">${file.fileType || 'folder'}</span>
                </div>
                ${file.type === 'file' ? `
                    <div class="detail-row">
                        <span class="detail-label">Size:</span>
                        <span class="detail-value">${vfs.formatFileSize(file.size)}</span>
                    </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">Modified:</span>
                    <span class="detail-value">${this.formatDate(file.modified)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Created:</span>
                    <span class="detail-value">${this.formatDate(file.created)}</span>
                </div>
                ${file.tags && file.tags.length > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">Tags:</span>
                        <div class="detail-tags">
                            ${file.tags.map(tag => `<span class="tag-badge" style="background: ${this.getTagColor(tag)}">${tag}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="inspector-actions">
                <button class="inspector-btn" onclick="filesAppV2.openFile(${JSON.stringify(file).replace(/"/g, '&quot;')})">Open</button>
                <button class="inspector-btn" onclick="filesAppV2.renameFile('${file.path}')">Rename</button>
                <button class="inspector-btn danger" onclick="filesAppV2.deleteFile('${file.path}')">Delete</button>
            </div>
        `;
    }
    
    async createFolder(window) {
        const name = prompt('Enter folder name:');
        if (!name || !name.trim()) return;
        
        try {
            await vfs.createFolder(this.currentPath, name.trim());
            this.loadFolder(window, this.currentPath);
        } catch (error) {
            alert(`Error creating folder: ${error.message}`);
        }
    }
    
    async uploadFiles(window) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        
        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                try {
                    await vfs.createFile(this.currentPath, file.name, file);
                } catch (error) {
                    console.error('Error uploading file:', error);
                }
            }
            this.loadFolder(window, this.currentPath);
        });
        
        input.click();
    }
    
    async moveFile(sourcePath, destinationPath) {
        try {
            await vfs.moveFile(sourcePath, destinationPath);
        } catch (error) {
            alert(`Error moving file: ${error.message}`);
        }
    }
    
    async deleteFile(path) {
        if (!confirm('Move to Trash?')) return;
        try {
            await vfs.deleteFile(path, false);
            this.loadFolder(document.querySelector(`[data-window-id="${this.windowId}"]`), this.currentPath);
        } catch (error) {
            alert(`Error deleting file: ${error.message}`);
        }
    }
    
    async renameFile(path) {
        const file = await vfs.getFile(path);
        if (!file) return;
        
        const newName = prompt('Enter new name:', file.name);
        if (!newName || !newName.trim() || newName === file.name) return;
        
        try {
            await vfs.renameFile(path, newName.trim());
            this.loadFolder(document.querySelector(`[data-window-id="${this.windowId}"]`), this.currentPath);
        } catch (error) {
            alert(`Error renaming file: ${error.message}`);
        }
    }
    
    navigateBack(window) {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.loadFolder(window, this.navigationHistory[this.historyIndex]);
        }
    }
    
    navigateForward(window) {
        if (this.historyIndex < this.navigationHistory.length - 1) {
            this.historyIndex++;
            this.loadFolder(window, this.navigationHistory[this.historyIndex]);
        }
    }
    
    updateToolbarButtons(window) {
        window.querySelector('#files-back').disabled = this.historyIndex <= 0;
        window.querySelector('#files-forward').disabled = this.historyIndex >= this.navigationHistory.length - 1;
        window.querySelector('#files-up').disabled = this.currentPath === '/';
    }
    
    toggleSelection(path) {
        if (this.selectedFiles.has(path)) {
            this.selectedFiles.delete(path);
        } else {
            this.selectedFiles.add(path);
        }
    }
    
    selectRange(files, endPath) {
        // Simple range selection
        const selected = Array.from(this.selectedFiles);
        if (selected.length === 0) {
            this.selectedFiles.add(endPath);
            return;
        }
        
        const startIndex = files.findIndex(f => f.path === selected[0]);
        const endIndex = files.findIndex(f => f.path === endPath);
        
        if (startIndex !== -1 && endIndex !== -1) {
            const start = Math.min(startIndex, endIndex);
            const end = Math.max(startIndex, endIndex);
            for (let i = start; i <= end; i++) {
                this.selectedFiles.add(files[i].path);
            }
        }
    }
    
    updateSelection(window) {
        window.querySelectorAll('.file-item').forEach(item => {
            item.classList.toggle('selected', this.selectedFiles.has(item.dataset.path));
        });
    }
    
    showContextMenu(window, e, file) {
        // Remove existing menu
        const existing = document.querySelector('.files-context-menu');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.className = 'files-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${e.clientY}px;
            left: ${e.clientX}px;
            z-index: 10000;
        `;
        
        menu.innerHTML = `
            <button class="context-item" data-action="open">Open</button>
            <button class="context-item" data-action="quicklook">Quick Look</button>
            <button class="context-item" data-action="rename">Rename</button>
            <button class="context-item" data-action="copy">Copy</button>
            <button class="context-item" data-action="cut">Cut</button>
            <button class="context-item" data-action="delete">Delete</button>
            <button class="context-item" data-action="properties">Properties</button>
        `;
        
        document.body.appendChild(menu);
        
        menu.querySelectorAll('.context-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleContextAction(window, action, file);
                menu.remove();
            });
        });
        
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }
    
    handleContextAction(window, action, file) {
        switch (action) {
            case 'open':
                if (file.type === 'folder') {
                    this.loadFolder(window, file.path);
                } else {
                    this.openFile(file);
                }
                break;
            case 'quicklook':
                if (typeof AegisQuickLook !== 'undefined') {
                    AegisQuickLook.show({
                        kind: 'Virtual file',
                        title: file.name || file.path,
                        meta: 'Virtual Files workspace — not the host disk',
                        body: file.path,
                        open: () => this.openFile(file)
                    });
                }
                break;
            case 'rename':
                this.renameFile(file.path);
                break;
            case 'copy':
                this.clipboard = file.path;
                this.clipboardAction = 'copy';
                break;
            case 'cut':
                this.clipboard = file.path;
                this.clipboardAction = 'cut';
                break;
            case 'delete':
                this.deleteFile(file.path);
                break;
            case 'properties':
                this.updateInspector(file);
                break;
        }
    }
    
    handleKeyboard(window, e) {
        // Alt+Left: Back
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            this.navigateBack(window);
        }
        // Alt+Right: Forward
        if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            this.navigateForward(window);
        }
        // Alt+Up: Up
        if (e.altKey && e.key === 'ArrowUp') {
            e.preventDefault();
            const parent = this.currentPath === '/' ? '/' : this.currentPath.split('/').slice(0, -1).join('/') || '/';
            this.loadFolder(window, parent);
        }
        // Delete: Delete selected
        if (e.key === 'Delete' && this.selectedFiles.size > 0) {
            e.preventDefault();
            Array.from(this.selectedFiles).forEach(path => this.deleteFile(path));
        }
        // Ctrl+A: Select all
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            const files = Array.from(window.querySelectorAll('.file-item'));
            files.forEach(item => this.selectedFiles.add(item.dataset.path));
            this.updateSelection(window);
        }
        // Ctrl+Shift+N: New folder
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
            e.preventDefault();
            this.createFolder(window);
        }
        // Space: Quick Look selected file
        if (e.key === ' ' && !e.metaKey && !e.ctrlKey && this.selectedFiles.size > 0) {
            const tag = (e.target && e.target.tagName || '').toLowerCase();
            if (tag !== 'input' && tag !== 'textarea') {
                e.preventDefault();
                const path = Array.from(this.selectedFiles)[0];
                const file = this.previewFile && this.previewFile.path === path ? this.previewFile : { name: path, path: path };
                if (typeof AegisQuickLook !== 'undefined') {
                    AegisQuickLook.show({
                        kind: 'Virtual file',
                        title: file.name || path,
                        meta: 'Virtual Files workspace — not the host disk',
                        body: path,
                        open: () => this.openFile(file)
                    }, { fromSpace: true });
                }
            }
        }
    }
    
    setupDragAndDrop(window) {
        // Global drop handler
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        document.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files);
                for (const file of files) {
                    try {
                        await vfs.createFile(this.currentPath, file.name, file);
                    } catch (error) {
                        console.error('Error uploading file:', error);
                    }
                }
                this.loadFolder(window, this.currentPath);
            }
        });
    }
    
    renderEmptyState() {
        return `
            <div class="files-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path>
                </svg>
                <p>${this.searchQuery ? 'No files found' : 'This folder is empty'}</p>
            </div>
        `;
    }
    
    showError(window, message) {
        const container = window.querySelector('#files-view-content');
        if (container) {
            container.innerHTML = `
                <div class="files-error">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>${this.escapeHtml(message)}</p>
                </div>
            `;
        }
    }
    
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    getTagColor(tagName) {
        const tag = this.tags.find(t => t.name === tagName);
        return tag ? tag.color : '#6366f1';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create instance
const filesAppV2 = new NextGenFilesApp();
window.filesAppV2 = filesAppV2;
window.filesApp = filesAppV2;
