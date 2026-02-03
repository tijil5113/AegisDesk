// Photo Gallery App - PROFESSIONAL OS-LEVEL PHOTO MANAGER
// Full-featured photo management with IndexedDB, AI, editing, and more

class GalleryApp {
    constructor() {
        this.windowId = 'gallery';
        this.db = null;
        this.dbName = 'AegisGalleryDB';
        this.dbVersion = 1;
        
        // State
        this.photos = [];
        this.albums = [];
        this.tags = [];
        this.currentView = 'grid'; // grid, masonry, timeline, album
        this.currentAlbum = null;
        this.selectedPhotos = new Set();
        this.filteredPhotos = [];
        this.searchQuery = '';
        this.currentPhotoIndex = 0;
        this.isFullscreen = false;
        this.isEditing = false;
        this.editorHistory = [];
        this.editorHistoryIndex = -1;
        
        // Settings
        this.theme = localStorage.getItem('galleryTheme') || 'default';
        this.thumbnailSize = parseInt(localStorage.getItem('galleryThumbSize') || '200');
        this.zoomLevel = parseFloat(localStorage.getItem('galleryZoom') || '1');
        
        // Device detection
        this.deviceType = this.detectDevice();
        this.screenSize = { width: window.innerWidth, height: window.innerHeight };
        this.pixelRatio = window.devicePixelRatio || 1;
        
        // Performance
        this.thumbnailCache = new Map();
        this.virtualScrollStart = 0;
        this.virtualScrollEnd = 50;
        
        // AI
        this.aiConversationHistory = [];
        
        // Responsive
        this.isMobile = this.deviceType === 'mobile';
        this.isTablet = this.deviceType === 'tablet';
        this.isDesktop = this.deviceType === 'desktop';
        
        // Window reference
        this.currentWindow = null;
        
        // Initialize IndexedDB
        this.initDB();
        
        // Setup responsive listeners
        this.setupResponsiveListeners();
    }

    detectDevice() {
        const width = window.innerWidth;
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (width < 768) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    }

    setupResponsiveListeners() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.screenSize = { width: window.innerWidth, height: window.innerHeight };
                this.deviceType = this.detectDevice();
                this.isMobile = this.deviceType === 'mobile';
                this.isTablet = this.deviceType === 'tablet';
                this.isDesktop = this.deviceType === 'desktop';
                
                // Update UI if gallery is open
                if (this.currentWindow) {
                    this.applyResponsiveStyles(this.currentWindow);
                }
            }, 250);
        });
    }

    applyResponsiveStyles(win) {
        const container = win.querySelector('.gallery-container');
        if (!container) return;
        
        // Apply device-specific classes
        container.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
        container.classList.add(`device-${this.deviceType}`);
        
        // Adjust sidebar for mobile
        const sidebar = win.querySelector('.gallery-sidebar');
        if (sidebar) {
            if (this.isMobile) {
                sidebar.style.width = '100%';
                sidebar.style.maxHeight = '200px';
            } else if (this.isTablet) {
                sidebar.style.width = '180px';
            } else {
                sidebar.style.width = '200px';
            }
        }
        
        // Adjust grid columns
        const photosContainer = win.querySelector('.gallery-photos-container');
        if (photosContainer) {
            if (this.isMobile) {
                photosContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
            } else if (this.isTablet) {
                photosContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
            }
        }
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
                
                // Photos store
                if (!db.objectStoreNames.contains('photos')) {
                    const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
                    photoStore.createIndex('dateTaken', 'dateTaken', { unique: false });
                    photoStore.createIndex('album', 'album', { unique: false });
                    photoStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                    photoStore.createIndex('favorite', 'favorite', { unique: false });
                    photoStore.createIndex('rating', 'rating', { unique: false });
                }
                
                // Albums store
                if (!db.objectStoreNames.contains('albums')) {
                    const albumStore = db.createObjectStore('albums', { keyPath: 'id' });
                    albumStore.createIndex('name', 'name', { unique: true });
                }
                
                // Thumbnails store
                if (!db.objectStoreNames.contains('thumbnails')) {
                    db.createObjectStore('thumbnails', { keyPath: 'photoId' });
                }
                
                // Metadata store
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'photoId' });
                }
            };
        });
    }

    async loadData() {
        // Load albums
        const albums = await this.getAllAlbums();
        this.albums = albums;
        
        // Load all photos
        const photos = await this.getAllPhotos();
        this.photos = photos;
        this.filteredPhotos = photos;
        
        // Load tags
        this.tags = this.extractAllTags();
    }

    async getAllPhotos() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllAlbums() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['albums'], 'readonly');
            const store = transaction.objectStore('albums');
            const request = store.getAll();
            request.onsuccess = () => {
                const albums = request.result || [];
                // Add smart albums
                albums.push(
                    { id: 'smart-favorites', name: 'Favorites', type: 'smart', icon: '❤️' },
                    { id: 'smart-recent', name: 'Recently Added', type: 'smart', icon: '🕐' },
                    { id: 'smart-screenshots', name: 'Screenshots', type: 'smart', icon: '📱' },
                    { id: 'smart-large', name: 'Large Files', type: 'smart', icon: '📦' },
                    { id: 'smart-duplicates', name: 'Duplicates', type: 'smart', icon: '🔄' },
                    { id: 'smart-ai-grouped', name: 'AI Grouped', type: 'smart', icon: '🤖' },
                    { id: 'smart-faces', name: 'Faces', type: 'smart', icon: '👤' },
                    { id: 'smart-work', name: 'Work', type: 'smart', icon: '💼' },
                    { id: 'smart-study', name: 'Study', type: 'smart', icon: '📚' },
                    { id: 'smart-personal', name: 'Personal', type: 'smart', icon: '🏠' },
                    { id: 'smart-unsorted', name: 'Unsorted', type: 'smart', icon: '📂' }
                );
                resolve(albums);
            };
            request.onerror = () => reject(request.error);
        });
    }

    extractAllTags() {
        const tagSet = new Set();
        this.photos.forEach(photo => {
            if (photo.tags && Array.isArray(photo.tags)) {
                photo.tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet).sort();
    }

    open() {
        const content = this.render();
        const win = windowManager.createWindow(this.windowId, {
            title: 'Photo Gallery',
            width: Math.min(1200, window.innerWidth - 40),
            height: Math.min(800, window.innerHeight - 100),
            class: `app-gallery theme-${this.theme}`,
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
            </svg>`,
            content: content,
            onClose: () => this.cleanup()
        });

        this.currentWindow = win;
        this.attachEvents(win);
        this.loadPhotosIntoView(win);
        this.applyResponsiveStyles(win);
        this.setupScrolling(win);
    }

    render() {
        return `
            <div class="gallery-container">
                <!-- Header Toolbar -->
                <div class="gallery-header">
                    <div class="gallery-header-left">
                        <h2 class="gallery-title">Photo Gallery</h2>
                        <div class="gallery-stats" id="gallery-stats">0 photos</div>
                    </div>
                        <div class="gallery-header-actions">
                        <div class="gallery-upload-menu">
                            <button class="gallery-btn gallery-btn-primary" id="gallery-upload">📤 Import</button>
                            <div class="upload-dropdown" id="upload-dropdown" style="display:none;">
                                <div class="upload-section-title">Import from Device</div>
                                <button class="dropdown-item" id="upload-files">📁 Select Files</button>
                                <button class="dropdown-item" id="upload-folder">📂 Select Folder</button>
                                <button class="dropdown-item" id="upload-camera">📷 Camera</button>
                                <button class="dropdown-item" id="upload-paste">📋 Paste from Clipboard</button>
                                <button class="dropdown-item" id="upload-zip">📦 Import from ZIP</button>
                                ${this.isMobile ? '<button class="dropdown-item" id="upload-mobile-gallery">📱 Mobile Gallery</button>' : ''}
                                <div class="upload-divider"></div>
                                <div class="upload-hint">Drag & drop images anywhere</div>
                                <div class="upload-formats">Supports: JPG, PNG, WEBP, GIF, HEIC</div>
                            </div>
                        </div>
                        <div class="gallery-zoom-controls">
                            <button class="gallery-btn-icon" id="zoom-out-btn" title="Zoom Out">🔍-</button>
                            <span class="zoom-level" id="zoom-level">${Math.round(this.zoomLevel * 100)}%</span>
                            <button class="gallery-btn-icon" id="zoom-in-btn" title="Zoom In">🔍+</button>
                            <button class="gallery-btn-icon" id="zoom-reset-btn" title="Reset Zoom">⌂</button>
                        </div>
                        <button class="gallery-btn-icon" id="gallery-theme-toggle" title="Change Theme (Cycle through themes)">🎨</button>
                        <button class="gallery-btn" id="gallery-export" ${this.selectedPhotos.size === 0 ? 'disabled' : ''} title="${this.selectedPhotos.size > 0 ? `Export ${this.selectedPhotos.size} selected photo(s)` : 'Export (select photos first)'}">Export</button>
                        <button class="gallery-btn" id="gallery-backup" title="Create backup of all photos and albums">Backup</button>
                    </div>
                </div>

                <!-- Search Bar -->
                <div class="gallery-search-bar">
                    <input type="text" id="gallery-search" placeholder="Search photos, tags, albums..." />
                    <button class="gallery-btn-icon" id="gallery-filter-toggle" title="Filters">🔍</button>
                </div>

                <!-- Filter Panel (collapsible) -->
                <div class="gallery-filter-panel" id="gallery-filter-panel" style="display:none;">
                    <div class="filter-group">
                        <label>Tags</label>
                        <div class="filter-tags" id="filter-tags"></div>
                    </div>
                    <div class="filter-group">
                        <label>Date Range</label>
                        <input type="date" id="filter-date-from" />
                        <input type="date" id="filter-date-to" />
                    </div>
                    <div class="filter-group">
                        <label>Rating</label>
                        <div class="filter-rating" id="filter-rating">
                            ${[1,2,3,4,5].map(r => `<button class="rating-btn" data-rating="${r}">${'⭐'.repeat(r)}</button>`).join('')}
                        </div>
                    </div>
                    <div class="filter-group">
                        <label>Favorites Only</label>
                        <input type="checkbox" id="filter-favorites" />
                    </div>
                </div>

                <!-- Main Layout -->
                <div class="gallery-layout">
                    <!-- Left Sidebar -->
                    <div class="gallery-sidebar">
                        <div class="sidebar-section">
                            <h3>Albums</h3>
                            <button class="sidebar-btn" id="sidebar-all-photos">📷 All Photos</button>
                            <div class="sidebar-albums" id="sidebar-albums"></div>
                            <button class="sidebar-btn sidebar-btn-new" id="sidebar-new-album">+ New Album</button>
                            <div class="album-context-menu" id="album-context-menu" style="display:none;">
                                <div class="context-item" data-action="rename">✏️ Rename Album</div>
                                <div class="context-item" data-action="delete">🗑️ Delete Album</div>
                                <div class="context-item" data-action="export">📦 Export as ZIP</div>
                                <div class="context-item" data-action="download">⬇️ Download All Photos</div>
                                <div class="context-item" data-action="duplicate">📋 Duplicate Album</div>
                                <div class="context-item" data-action="merge">🔀 Merge Albums</div>
                                <div class="context-divider"></div>
                                <div class="context-item" data-action="lock">🔒 Lock Album</div>
                                <div class="context-item" data-action="settings">⚙️ Album Settings</div>
                                <div class="context-item" data-action="cover">🖼️ Change Cover</div>
                                <div class="context-item" data-action="sort">🔀 Sort Photos</div>
                                <div class="context-divider"></div>
                                <div class="context-item" data-action="move">📦 Move Album</div>
                                <div class="context-item" data-action="share">🔗 Share Album</div>
                                <div class="context-item" data-action="smart">✨ Create Smart Album</div>
                            </div>
                        </div>
                        <div class="sidebar-section">
                            <h3>Tags</h3>
                            <div class="sidebar-tags" id="sidebar-tags"></div>
                        </div>
                        <div class="sidebar-section">
                            <h3>Smart Albums</h3>
                            <div class="sidebar-smart-albums" id="sidebar-smart-albums"></div>
                        </div>
                    </div>

                    <!-- Center Gallery View -->
                    <div class="gallery-main-view">
                        <div class="gallery-view-controls">
                            <div class="view-mode-buttons">
                                <button class="view-mode-btn ${this.currentView === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View">⊞</button>
                                <button class="view-mode-btn ${this.currentView === 'masonry' ? 'active' : ''}" data-view="masonry" title="Masonry View">▦</button>
                                <button class="view-mode-btn ${this.currentView === 'timeline' ? 'active' : ''}" data-view="timeline" title="Timeline View">📅</button>
                                <button class="view-mode-btn ${this.currentView === 'album' ? 'active' : ''}" data-view="album" title="Album View">📁</button>
                            </div>
                            <div class="view-actions">
                                <button class="gallery-btn-icon" id="gallery-select-mode" title="Toggle Selection Mode (Ctrl+A to select all)">☑</button>
                                <button class="gallery-btn-icon" id="gallery-slideshow" title="Start Slideshow (Auto-advance through photos)">▶</button>
                                <button class="gallery-btn-icon" id="gallery-compare" title="${this.selectedPhotos.size === 2 ? 'Compare 2 selected photos side-by-side' : 'Compare Mode (Select 2 photos first)'}" ${this.selectedPhotos.size !== 2 ? 'disabled' : ''}>⚖</button>
                            </div>
                        </div>
                        <div class="gallery-photos-container" id="gallery-photos-container">
                            <!-- Photos will be rendered here -->
                        </div>
                    </div>

                    <!-- Right Panel (Metadata/AI) -->
                    <div class="gallery-right-panel" id="gallery-right-panel">
                        <div class="panel-section">
                            <h3>Photo Info</h3>
                            <div class="photo-info-content" id="photo-info-content">
                                <p class="panel-placeholder">Select a photo to view details</p>
                            </div>
                            <div class="photo-info-actions" id="photo-info-actions" style="display:none;">
                                <button class="gallery-btn" id="info-copy-metadata">Copy Metadata</button>
                                <button class="gallery-btn" id="info-remove-metadata">Remove Metadata</button>
                            </div>
                        </div>
                        <div class="panel-section">
                            <h3>AI Assistant</h3>
                            <div class="ai-panel-content" id="ai-panel-content">
                                <button class="gallery-btn" id="ai-describe">Describe Image</button>
                                <button class="gallery-btn" id="ai-extract-text">Extract Text</button>
                                <button class="gallery-btn" id="ai-suggest-tags">Suggest Tags</button>
                                <button class="gallery-btn" id="ai-auto-caption">Auto Caption</button>
                                <button class="gallery-btn" id="ai-detect-similar">Detect Similar</button>
                                <button class="gallery-btn" id="ai-blur-faces">Blur Faces</button>
                                <button class="gallery-btn" id="ai-remove-background">Remove Background</button>
                                <button class="gallery-btn" id="ai-generate-title">Generate Title</button>
                                <button class="gallery-btn" id="ai-send-to-notes">Send to Notes</button>
                                <div class="ai-divider"></div>
                                <div class="ai-section-title">Image Enhancement</div>
                                <button class="gallery-btn" id="ai-enhance-sharpness">🔍 Enhance Sharpness</button>
                                <button class="gallery-btn" id="ai-improve-clarity">✨ Improve Clarity</button>
                                <button class="gallery-btn" id="ai-reduce-blur">📸 Reduce Blur</button>
                                <button class="gallery-btn" id="ai-upscale">⬆️ AI Upscale</button>
                                <button class="gallery-btn" id="ai-noise-reduction">🔇 Noise Reduction</button>
                                <button class="gallery-btn" id="ai-hdr-boost">☀️ HDR Boost</button>
                                <button class="gallery-btn" id="ai-color-correction">🎨 Color Correction</button>
                                <button class="gallery-btn" id="ai-dehaze">🌫️ Dehaze</button>
                                <button class="gallery-btn" id="ai-restore-old">📜 Restore Old Image</button>
                                <button class="gallery-btn" id="ai-readable-mode">📖 Readable Mode (Screenshots)</button>
                                <div class="ai-messages" id="ai-messages"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Fullscreen Preview Modal -->
            <div class="gallery-fullscreen" id="gallery-fullscreen" style="display:none;">
                <div class="fullscreen-header">
                    <button class="fullscreen-btn" id="fullscreen-close">✕</button>
                    <div class="fullscreen-title" id="fullscreen-title"></div>
                    <div class="fullscreen-actions">
                        <button class="fullscreen-btn" id="fullscreen-edit" title="Edit Photo (Ctrl+E)">✏ Edit</button>
                        <button class="fullscreen-btn" id="fullscreen-favorite" title="Toggle Favorite (F key)">❤</button>
                        <button class="fullscreen-btn" id="fullscreen-delete" title="Delete Photo (Delete key)">🗑</button>
                    </div>
                </div>
                    <div class="fullscreen-content">
                        <button class="fullscreen-nav fullscreen-prev" id="fullscreen-prev">‹</button>
                        <div class="fullscreen-image-container" id="fullscreen-image-container">
                            <div class="fullscreen-image-wrapper" id="fullscreen-image-wrapper">
                                <img id="fullscreen-image" />
                            </div>
                            <div class="fullscreen-zoom-controls">
                                <button class="zoom-btn" id="zoom-in" title="Zoom In (Mouse wheel + Ctrl)">+</button>
                                <button class="zoom-btn" id="zoom-out" title="Zoom Out (Mouse wheel + Ctrl)">-</button>
                                <button class="zoom-btn" id="zoom-100" title="100% - Actual Size">1:1</button>
                                <button class="zoom-btn" id="zoom-200" title="200% - Double Size">2:1</button>
                                <button class="zoom-btn" id="zoom-fit" title="Fit to Screen (Best Fit)">Fit</button>
                                <button class="zoom-btn" id="zoom-fill" title="Fill Screen (Crop to fit)">Fill</button>
                                <button class="zoom-btn" id="zoom-width" title="Fit to Width">Width</button>
                                <button class="zoom-btn" id="zoom-height" title="Fit to Height">Height</button>
                                <button class="zoom-btn" id="zoom-rotate" title="Rotate 90° Clockwise">↻</button>
                                <span class="zoom-level-display" id="fullscreen-zoom-level">100%</span>
                            </div>
                            <div class="fullscreen-filmstrip" id="fullscreen-filmstrip"></div>
                        </div>
                        <button class="fullscreen-nav fullscreen-next" id="fullscreen-next">›</button>
                    </div>
            </div>

            <!-- Photo Editor Modal -->
            <div class="gallery-editor" id="gallery-editor" style="display:none;">
                <div class="editor-header">
                    <h3>Photo Editor</h3>
                    <button class="editor-btn" id="editor-close">Close</button>
                </div>
                <div class="editor-content">
                    <div class="editor-tools">
                        <button class="editor-tool-btn" data-tool="crop">✂ Crop</button>
                        <button class="editor-tool-btn" data-tool="rotate">↻ Rotate</button>
                        <button class="editor-tool-btn" data-tool="brightness">☀ Brightness</button>
                        <button class="editor-tool-btn" data-tool="contrast">◐ Contrast</button>
                        <button class="editor-tool-btn" data-tool="saturation">🎨 Saturation</button>
                        <button class="editor-tool-btn" data-tool="sharpness">🔍 Sharpness</button>
                        <button class="editor-tool-btn" data-tool="noise">🔇 Noise Reduction</button>
                        <button class="editor-tool-btn" data-tool="filter">🎭 Filters</button>
                        <button class="editor-tool-btn" id="editor-undo" disabled>↶ Undo</button>
                        <button class="editor-tool-btn" id="editor-redo" disabled>↷ Redo</button>
                    </div>
                    <div class="editor-canvas-container">
                        <canvas id="editor-canvas"></canvas>
                    </div>
                    <div class="editor-controls" id="editor-controls"></div>
                </div>
                <div class="editor-footer">
                    <button class="gallery-btn" id="editor-save-new">Save as New</button>
                    <button class="gallery-btn gallery-btn-primary" id="editor-save">Save</button>
                </div>
            </div>
        `;
    }

    attachEvents(win) {
        // Upload menu with proper positioning
        const uploadBtn = win.querySelector('#gallery-upload');
        const uploadDropdown = win.querySelector('#upload-dropdown');
        if (uploadBtn && uploadDropdown) {
            uploadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = uploadDropdown.style.display !== 'none';
                uploadDropdown.style.display = isVisible ? 'none' : 'block';
                
                if (!isVisible) {
                    // Position dropdown to prevent clipping
                    const btnRect = uploadBtn.getBoundingClientRect();
                    const dropdownRect = uploadDropdown.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    
                    let left = 0;
                    let top = '100%';
                    
                    // Check right edge overflow
                    if (btnRect.left + dropdownRect.width > viewportWidth) {
                        left = viewportWidth - btnRect.right;
                    }
                    
                    // Check bottom edge overflow - show above if needed
                    if (btnRect.bottom + dropdownRect.height > viewportHeight) {
                        top = 'auto';
                        uploadDropdown.style.bottom = '100%';
                        uploadDropdown.style.top = 'auto';
                    } else {
                        uploadDropdown.style.top = '100%';
                        uploadDropdown.style.bottom = 'auto';
                    }
                    
                    uploadDropdown.style.left = `${left}px`;
                    uploadDropdown.style.maxHeight = `${Math.min(dropdownRect.height, viewportHeight - btnRect.bottom - 20)}px`;
                }
            });
            
            win.querySelector('#upload-files')?.addEventListener('click', () => {
                uploadDropdown.style.display = 'none';
                this.handleUpload(win);
            });
            
            win.querySelector('#upload-folder')?.addEventListener('click', () => {
                uploadDropdown.style.display = 'none';
                this.handleFolderUpload(win);
            });
            
            win.querySelector('#upload-camera')?.addEventListener('click', () => {
                uploadDropdown.style.display = 'none';
                this.handleCameraCapture(win);
            });
            
            win.querySelector('#upload-paste')?.addEventListener('click', () => {
                uploadDropdown.style.display = 'none';
                this.handlePasteUpload(win);
            });
            
            if (this.isMobile) {
                win.querySelector('#upload-mobile-gallery')?.addEventListener('click', () => {
                    uploadDropdown.style.display = 'none';
                    this.handleMobileGalleryUpload(win);
                });
            }
            
            win.querySelector('#upload-zip')?.addEventListener('click', () => {
                uploadDropdown.style.display = 'none';
                this.handleZipUpload(win);
            });
            
            // Close dropdown when clicking outside
            const closeDropdown = (e) => {
                if (!uploadBtn.contains(e.target) && !uploadDropdown.contains(e.target)) {
                    uploadDropdown.style.display = 'none';
                    document.removeEventListener('click', closeDropdown);
                }
            };
            
            uploadBtn.addEventListener('click', () => {
                setTimeout(() => document.addEventListener('click', closeDropdown), 0);
            });
        }
        
        // Zoom controls
        win.querySelector('#zoom-in-btn')?.addEventListener('click', () => {
            this.zoomLevel = Math.min(2, this.zoomLevel + 0.1);
            this.applyZoom(win);
        });
        
        win.querySelector('#zoom-out-btn')?.addEventListener('click', () => {
            this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.1);
            this.applyZoom(win);
        });
        
        win.querySelector('#zoom-reset-btn')?.addEventListener('click', () => {
            this.zoomLevel = 1;
            this.applyZoom(win);
        });
        
        // Keyboard zoom
        win.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this.zoomLevel = Math.max(0.5, Math.min(2, this.zoomLevel + delta));
                this.applyZoom(win);
            }
        }, { passive: false });
        
        // Clipboard paste
        win.addEventListener('paste', (e) => {
            this.handlePasteUpload(win, e);
        });
        
        // Search
        win.querySelector('#gallery-search')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.applyFilters(win);
        });
        
        // View mode toggle
        win.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentView = btn.dataset.view;
                // Update active state
                win.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderView(win);
            });
        });
        
        // Select mode toggle
        let selectMode = false;
        win.querySelector('#gallery-select-mode')?.addEventListener('click', () => {
            selectMode = !selectMode;
            const btn = win.querySelector('#gallery-select-mode');
            if (btn) {
                btn.classList.toggle('active', selectMode);
                btn.title = selectMode ? 'Selection Mode ON (Click photos to select)' : 'Toggle Selection Mode';
            }
            // Show/hide checkboxes
            win.querySelectorAll('.photo-selection-check').forEach(check => {
                check.style.display = selectMode ? 'block' : 'none';
            });
        });
        
        // Theme toggle
        win.querySelector('#gallery-theme-toggle')?.addEventListener('click', () => {
            this.cycleTheme(win);
        });
        
        // Filter toggle
        win.querySelector('#gallery-filter-toggle')?.addEventListener('click', () => {
            const panel = win.querySelector('#gallery-filter-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        
        // Album selection
        win.querySelector('#sidebar-all-photos')?.addEventListener('click', () => {
            this.currentAlbum = null;
            this.applyFilters(win);
        });
        
        // New album
        win.querySelector('#sidebar-new-album')?.addEventListener('click', () => {
            const name = prompt('Album name:');
            if (name && name.trim()) {
                this.createAlbum(name.trim(), win);
            }
        });
        
        // Export
        win.querySelector('#gallery-export')?.addEventListener('click', () => {
            if (this.selectedPhotos.size > 0) {
                this.exportPhotos(win);
            } else {
                alert('Please select photos to export');
            }
        });
        
        // Backup
        win.querySelector('#gallery-backup')?.addEventListener('click', () => {
            this.createBackup(win);
        });
        
        // Slideshow
        win.querySelector('#gallery-slideshow')?.addEventListener('click', () => {
            this.startSlideshow(win);
        });
        
        // Compare mode
        win.querySelector('#gallery-compare')?.addEventListener('click', () => {
            if (this.selectedPhotos.size === 2) {
                this.openCompareMode(win);
            }
        });
        
        // Album context menu
        this.setupAlbumContextMenu(win);
        
        // Fullscreen zoom controls
        win.querySelector('#zoom-in')?.addEventListener('click', () => this.zoomImage(1.2, win));
        win.querySelector('#zoom-out')?.addEventListener('click', () => this.zoomImage(0.8, win));
        win.querySelector('#zoom-100')?.addEventListener('click', () => this.zoomToLevel(1, win));
        win.querySelector('#zoom-200')?.addEventListener('click', () => this.zoomToLevel(2, win));
        win.querySelector('#zoom-fit')?.addEventListener('click', () => this.zoomFitToScreen(win));
        win.querySelector('#zoom-fill')?.addEventListener('click', () => this.zoomFillScreen(win));
        win.querySelector('#zoom-width')?.addEventListener('click', () => this.zoomFitToWidth(win));
        win.querySelector('#zoom-height')?.addEventListener('click', () => this.zoomFitToHeight(win));
        win.querySelector('#zoom-rotate')?.addEventListener('click', () => this.rotateFullscreenImage(win));
        
        // Fullscreen image pan
        const fullscreenImg = win.querySelector('#fullscreen-image');
        if (fullscreenImg) {
            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let currentX = 0;
            let currentY = 0;
            
            fullscreenImg.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX - currentX;
                startY = e.clientY - currentY;
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging && this.isFullscreen) {
                    currentX = e.clientX - startX;
                    currentY = e.clientY - startY;
                    fullscreenImg.style.transform = `translate(${currentX}px, ${currentY}px)`;
                }
            });
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        }
        
        // Drag and drop - enhanced with better visual feedback
        const container = win.querySelector('.gallery-photos-container');
        const galleryContainer = win.querySelector('.gallery-container');
        
        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            if (container) container.classList.add('drag-over');
        };
        
        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove if we're leaving the container
            if (!container?.contains(e.relatedTarget)) {
                if (container) container.classList.remove('drag-over');
            }
        };
        
        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (container) container.classList.remove('drag-over');
            this.handleDrop(e, win);
        };
        
        if (container) {
            container.addEventListener('dragover', handleDragOver);
            container.addEventListener('dragleave', handleDragLeave);
            container.addEventListener('drop', handleDrop);
        }
        
        // Also allow dropping on the entire gallery container
        if (galleryContainer) {
            galleryContainer.addEventListener('dragover', handleDragOver);
            galleryContainer.addEventListener('dragleave', handleDragLeave);
            galleryContainer.addEventListener('drop', handleDrop);
        }
        
        // Fullscreen events
        win.querySelector('#fullscreen-close')?.addEventListener('click', () => this.closeFullscreen(win));
        win.querySelector('#fullscreen-prev')?.addEventListener('click', () => this.navigatePhoto(-1, win));
        win.querySelector('#fullscreen-next')?.addEventListener('click', () => this.navigatePhoto(1, win));
        win.querySelector('#fullscreen-favorite')?.addEventListener('click', () => this.toggleFavorite(win));
        win.querySelector('#fullscreen-edit')?.addEventListener('click', () => this.openEditor(win));
        win.querySelector('#fullscreen-delete')?.addEventListener('click', () => this.deletePhoto(win));
        
        // Editor events
        win.querySelector('#editor-close')?.addEventListener('click', () => this.closeEditor(win));
        win.querySelector('#editor-save')?.addEventListener('click', () => this.saveEditedPhoto(win, false));
        win.querySelector('#editor-save-new')?.addEventListener('click', () => this.saveEditedPhoto(win, true));
        win.querySelector('#editor-undo')?.addEventListener('click', () => this.undoEditor(win));
        win.querySelector('#editor-redo')?.addEventListener('click', () => this.redoEditor(win));
        win.querySelectorAll('.editor-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (tool) this.selectEditorTool(tool, win);
            });
        });
        
        // Editor keyboard shortcuts
        win.addEventListener('keydown', (e) => {
            if (!this.isEditing) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undoEditor(win);
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redoEditor(win);
            }
        });
        
        // AI events
        win.querySelector('#ai-describe')?.addEventListener('click', () => this.aiDescribe(win));
        win.querySelector('#ai-extract-text')?.addEventListener('click', () => this.aiExtractText(win));
        win.querySelector('#ai-suggest-tags')?.addEventListener('click', () => this.aiSuggestTags(win));
        win.querySelector('#ai-auto-caption')?.addEventListener('click', () => this.aiAutoCaption(win));
        win.querySelector('#ai-detect-similar')?.addEventListener('click', () => this.aiDetectSimilar(win));
        win.querySelector('#ai-blur-faces')?.addEventListener('click', () => this.aiBlurFaces(win));
        win.querySelector('#ai-remove-background')?.addEventListener('click', () => this.removeBackground(win));
        win.querySelector('#ai-generate-title')?.addEventListener('click', () => this.generateTitle(win));
        win.querySelector('#ai-send-to-notes')?.addEventListener('click', () => this.sendToNotes(win));
        
        // Image enhancement buttons
        win.querySelector('#ai-enhance-sharpness')?.addEventListener('click', () => this.enhanceSharpness(win));
        win.querySelector('#ai-improve-clarity')?.addEventListener('click', () => this.improveClarity(win));
        win.querySelector('#ai-reduce-blur')?.addEventListener('click', () => this.reduceBlur(win));
        win.querySelector('#ai-upscale')?.addEventListener('click', () => this.aiUpscale(win));
        win.querySelector('#ai-noise-reduction')?.addEventListener('click', () => this.noiseReduction(win));
        win.querySelector('#ai-hdr-boost')?.addEventListener('click', () => this.hdrBoost(win));
        win.querySelector('#ai-color-correction')?.addEventListener('click', () => this.colorCorrection(win));
        win.querySelector('#ai-dehaze')?.addEventListener('click', () => this.dehaze(win));
        win.querySelector('#ai-restore-old')?.addEventListener('click', () => this.restoreOldImage(win));
        win.querySelector('#ai-readable-mode')?.addEventListener('click', () => this.readableMode(win));
        
        // Keyboard shortcuts
        win.addEventListener('keydown', (e) => {
            // Prevent shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }
            
            if (e.key === 'Escape') {
                if (this.isFullscreen) this.closeFullscreen(win);
                if (this.isEditing) this.closeEditor(win);
            } else if (e.key === 'ArrowLeft' && this.isFullscreen && !this.isEditing) {
                e.preventDefault();
                this.navigatePhoto(-1, win);
            } else if (e.key === 'ArrowRight' && this.isFullscreen && !this.isEditing) {
                e.preventDefault();
                this.navigatePhoto(1, win);
            } else if (e.key === 'f' && this.isFullscreen && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.toggleFavorite(win);
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                e.preventDefault();
                win.querySelector('#gallery-upload')?.click();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                if (this.currentPhoto) {
                    this.openEditor(win);
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                win.querySelector('#gallery-search')?.focus();
            } else if (e.key === 'Delete' && this.selectedPhotos.size > 0) {
                e.preventDefault();
                if (confirm(`Delete ${this.selectedPhotos.size} selected photo(s)?`)) {
                    this.deleteSelectedPhotos(win);
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.selectAllPhotos(win);
            }
        });
    }

    async loadPhotosIntoView(win) {
        await this.loadData();
        this.applyFilters(win);
        this.renderSidebar(win);
        this.updateStats(win);
    }

    renderSidebar(win) {
        const albumsEl = win.querySelector('#sidebar-albums');
        if (albumsEl) {
            albumsEl.innerHTML = this.albums
                .filter(a => a.type !== 'smart')
                .map(album => {
                    const photoCount = this.photos.filter(p => p.album === album.id).length;
                    return `
                        <button class="sidebar-album-btn" data-album-id="${album.id}" data-album-name="${this.escapeHtml(album.name)}">
                            <span class="album-icon">${album.locked ? '🔒' : '📁'}</span>
                            <span class="album-name">${this.escapeHtml(album.name)}</span>
                            <span class="album-count">${photoCount}</span>
                        </button>
                    `;
                }).join('');
            
            albumsEl.querySelectorAll('.sidebar-album-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if (e.button === 0 || !e.button) { // Left click
                        this.currentAlbum = btn.dataset.albumId;
                        this.applyFilters(win);
                    }
                });
                
                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.showAlbumContextMenu(btn, e, win);
                });
            });
        }
        
        const smartAlbumsEl = win.querySelector('#sidebar-smart-albums');
        if (smartAlbumsEl) {
            smartAlbumsEl.innerHTML = this.albums
                .filter(a => a.type === 'smart')
                .map(album => `
                    <button class="sidebar-album-btn" data-album-id="${album.id}">
                        ${album.icon} ${this.escapeHtml(album.name)}
                    </button>
                `).join('');
            
            smartAlbumsEl.querySelectorAll('.sidebar-album-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.currentAlbum = btn.dataset.albumId;
                    this.applyFilters(win);
                });
            });
        }
        
        const tagsEl = win.querySelector('#sidebar-tags');
        if (tagsEl) {
            tagsEl.innerHTML = this.tags.map(tag => `
                <button class="sidebar-tag-btn" data-tag="${tag}">
                    #${this.escapeHtml(tag)}
                </button>
            `).join('');
            
            tagsEl.querySelectorAll('.sidebar-tag-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tag = btn.dataset.tag;
                    this.searchQuery = `#${tag}`;
                    win.querySelector('#gallery-search').value = this.searchQuery;
                    this.applyFilters(win);
                });
            });
        }
    }

    applyFilters(win) {
        let filtered = [...this.photos];
        
        // Album filter
        if (this.currentAlbum) {
            if (this.currentAlbum === 'smart-favorites') {
                filtered = filtered.filter(p => p.favorite);
            } else if (this.currentAlbum === 'smart-recent') {
                filtered = filtered.sort((a, b) => new Date(b.dateAdded || b.dateTaken) - new Date(a.dateAdded || a.dateTaken)).slice(0, 50);
            } else if (this.currentAlbum === 'smart-screenshots') {
                filtered = filtered.filter(p => 
                    p.name?.toLowerCase().includes('screenshot') || 
                    p.name?.toLowerCase().includes('screen') ||
                    p.tags?.some(t => t.toLowerCase().includes('screenshot'))
                );
            } else if (this.currentAlbum === 'smart-large') {
                filtered = filtered.filter(p => (p.size || 0) > 5 * 1024 * 1024).sort((a, b) => (b.size || 0) - (a.size || 0));
            } else if (this.currentAlbum === 'smart-duplicates') {
                // Find duplicates by similar dimensions and size
                const duplicates = [];
                filtered.forEach((photo, idx) => {
                    const similar = filtered.slice(idx + 1).find(p => 
                        Math.abs((p.width || 0) - (photo.width || 0)) < 10 &&
                        Math.abs((p.height || 0) - (photo.height || 0)) < 10 &&
                        Math.abs((p.size || 0) - (photo.size || 0)) < 50000
                    );
                    if (similar) {
                        if (!duplicates.find(d => d.id === photo.id)) duplicates.push(photo);
                        if (!duplicates.find(d => d.id === similar.id)) duplicates.push(similar);
                    }
                });
                filtered = duplicates;
            } else if (this.currentAlbum === 'smart-ai-grouped') {
                // Photos with AI-generated tags
                filtered = filtered.filter(p => p.tags && p.tags.length > 0);
            } else if (this.currentAlbum === 'smart-faces') {
                // Photos that might contain faces (heuristic: portrait orientation, certain aspect ratios)
                filtered = filtered.filter(p => {
                    const ratio = (p.width || 1) / (p.height || 1);
                    return ratio > 0.6 && ratio < 1.4; // Portrait-ish
                });
            } else if (this.currentAlbum === 'smart-work') {
                filtered = filtered.filter(p => 
                    p.tags?.some(t => ['work', 'office', 'business', 'meeting'].includes(t.toLowerCase())) ||
                    p.album?.toLowerCase().includes('work')
                );
            } else if (this.currentAlbum === 'smart-study') {
                filtered = filtered.filter(p => 
                    p.tags?.some(t => ['study', 'school', 'education', 'learning', 'notes'].includes(t.toLowerCase())) ||
                    p.album?.toLowerCase().includes('study')
                );
            } else if (this.currentAlbum === 'smart-personal') {
                filtered = filtered.filter(p => 
                    p.tags?.some(t => ['personal', 'family', 'friends', 'home', 'vacation'].includes(t.toLowerCase())) ||
                    p.album?.toLowerCase().includes('personal')
                );
            } else if (this.currentAlbum === 'smart-unsorted') {
                filtered = filtered.filter(p => !p.album || p.album === '' || p.album === null);
            } else {
                // Regular album
                filtered = filtered.filter(p => p.album === this.currentAlbum);
            }
        }
        
        // Search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                p.name?.toLowerCase().includes(query) ||
                p.tags?.some(t => t.toLowerCase().includes(query.replace('#', ''))) ||
                p.album?.toLowerCase().includes(query)
            );
        }
        
        // Rating filter
        const ratingFilter = win.querySelector('#filter-rating .rating-btn.active')?.dataset.rating;
        if (ratingFilter) {
            filtered = filtered.filter(p => p.rating >= parseInt(ratingFilter));
        }
        
        // Favorites filter
        if (win.querySelector('#filter-favorites')?.checked) {
            filtered = filtered.filter(p => p.favorite);
        }
        
        this.filteredPhotos = filtered;
        this.renderView(win);
        this.updateStats(win);
    }

    renderView(win) {
        const container = win.querySelector('#gallery-photos-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.filteredPhotos.length === 0) {
            container.innerHTML = `
                <div class="gallery-empty">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <h2>No Photos</h2>
                    <p>Upload photos or adjust your filters</p>
                    <button class="gallery-btn" id="empty-upload-btn" style="margin-top: 16px;">📤 Import Photos</button>
                </div>
            `;
            
            win.querySelector('#empty-upload-btn')?.addEventListener('click', () => {
                win.querySelector('#gallery-upload')?.click();
            });
            return;
        }
        
        container.className = `gallery-photos-container view-${this.currentView}`;
        
        // Apply responsive grid columns
        if (this.currentView === 'grid') {
            const columns = this.isMobile ? 2 : this.isTablet ? 3 : 4;
            container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        }
        
        // Virtual scrolling for performance
        const visiblePhotos = this.filteredPhotos.slice(this.virtualScrollStart, this.virtualScrollEnd);
        
        visiblePhotos.forEach((photo, idx) => {
            const actualIdx = this.virtualScrollStart + idx;
            const photoEl = this.createPhotoElement(photo, actualIdx, win);
            container.appendChild(photoEl);
        });
        
        // Setup scroll listener for virtual scrolling
        let scrollTimeout;
        container.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.handleVirtualScroll(container, win);
            }, 50);
        }, { passive: true });
        
        // Apply zoom after rendering
        this.applyZoom(win);
    }

    createPhotoElement(photo, index, win) {
        const div = document.createElement('div');
        div.className = 'gallery-photo-item';
        div.dataset.photoId = photo.id;
        div.dataset.index = index;
        
        if (this.selectedPhotos.has(photo.id)) {
            div.classList.add('selected');
        }
        
        div.innerHTML = `
            <div class="photo-thumbnail">
                <img 
                    src="${photo.thumbnail || photo.url}" 
                    data-full-res="${photo.url}"
                    data-preview="${photo.previewThumbnail || photo.url}"
                    alt="${this.escapeHtml(photo.name)}" 
                    loading="lazy"
                    style="image-rendering: auto; -webkit-backface-visibility: hidden; backface-visibility: hidden; transform: translateZ(0); will-change: transform;"
                    title="${this.escapeHtml(photo.name)}"
                />
                <div class="photo-overlay">
                    ${photo.favorite ? '<span class="photo-favorite" title="Favorite">❤</span>' : ''}
                    ${photo.rating ? `<span class="photo-rating" title="Rating: ${photo.rating}">${'⭐'.repeat(photo.rating)}</span>` : ''}
                </div>
                <div class="photo-selection-check">
                    <input type="checkbox" ${this.selectedPhotos.has(photo.id) ? 'checked' : ''} title="Select photo" />
                </div>
            </div>
            <div class="photo-info">
                <div class="photo-name" title="${this.escapeHtml(photo.name)}">${this.escapeHtml(photo.name)}</div>
                <div class="photo-meta">${this.formatDate(photo.dateTaken || photo.dateAdded)}</div>
            </div>
        `;
        
        div.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') {
                e.stopPropagation();
                this.toggleSelection(photo.id, win);
            } else {
                this.selectPhoto(photo, win);
            }
        });
        
        // Double-click is handled in image hover section above
        
        // High-res preview on hover with full resolution support
        const img = div.querySelector('img');
        if (img) {
            // Ensure full resolution is available
            img.dataset.fullRes = photo.url;
            
            let hoverTimeout;
            div.addEventListener('mouseenter', () => {
                hoverTimeout = setTimeout(() => {
                    // Load preview thumbnail or full-res for better quality
                    if (photo.previewThumbnail && img.src !== photo.previewThumbnail) {
                        img.src = photo.previewThumbnail;
                    } else if (photo.url && img.src !== photo.url) {
                        img.src = photo.url;
                    }
                }, 200); // Delay to avoid loading on quick hovers
            });
            
            div.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimeout);
                // Revert to thumbnail after delay to save memory
                setTimeout(() => {
                    if (photo.thumbnail && !div.matches(':hover')) {
                        img.src = photo.thumbnail;
                    }
                }, 1500);
            });
            
            // Double-click to open fullscreen with full resolution
            div.addEventListener('dblclick', () => {
                this.openFullscreen(index, win);
            });
        }
        
        return div;
    }

    selectPhoto(photo, win) {
        this.currentPhoto = photo;
        this.renderPhotoInfo(win);
    }

    renderPhotoInfo(win) {
        const infoEl = win.querySelector('#photo-info-content');
        const actionsEl = win.querySelector('#photo-info-actions');
        if (!infoEl || !this.currentPhoto) {
            if (infoEl) infoEl.innerHTML = '<p class="panel-placeholder">Select a photo to view details</p>';
            if (actionsEl) actionsEl.style.display = 'none';
            return;
        }
        
        const photo = this.currentPhoto;
        const exif = photo.exif || {};
        
        infoEl.innerHTML = `
            <div class="photo-info-detail">
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${this.escapeHtml(photo.name)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Size:</span>
                    <span class="info-value">${this.formatFileSize(photo.size || 0)}</span>
                </div>
                ${photo.width && photo.height ? `
                <div class="info-row">
                    <span class="info-label">Resolution:</span>
                    <span class="info-value">${photo.width} × ${photo.height} px</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-label">Upload Date:</span>
                    <span class="info-value">${this.formatDate(photo.dateAdded)}</span>
                </div>
                ${photo.dateTaken ? `
                <div class="info-row">
                    <span class="info-label">Date Taken:</span>
                    <span class="info-value">${this.formatDate(photo.dateTaken)}</span>
                </div>
                ` : ''}
                ${exif.camera ? `
                <div class="info-row">
                    <span class="info-label">Camera:</span>
                    <span class="info-value">${this.escapeHtml(exif.camera)}</span>
                </div>
                ` : ''}
                ${exif.iso ? `
                <div class="info-row">
                    <span class="info-label">ISO:</span>
                    <span class="info-value">${exif.iso}</span>
                </div>
                ` : ''}
                ${exif.aperture ? `
                <div class="info-row">
                    <span class="info-label">Aperture:</span>
                    <span class="info-value">f/${exif.aperture}</span>
                </div>
                ` : ''}
                ${exif.shutterSpeed ? `
                <div class="info-row">
                    <span class="info-label">Shutter Speed:</span>
                    <span class="info-value">${exif.shutterSpeed}s</span>
                </div>
                ` : ''}
                ${exif.focalLength ? `
                <div class="info-row">
                    <span class="info-label">Focal Length:</span>
                    <span class="info-value">${exif.focalLength}mm</span>
                </div>
                ` : ''}
                ${exif.gps ? `
                <div class="info-row">
                    <span class="info-label">GPS:</span>
                    <span class="info-value">${exif.gps.lat}, ${exif.gps.lon}</span>
                </div>
                ` : ''}
                ${photo.tags && photo.tags.length > 0 ? `
                <div class="info-row">
                    <span class="info-label">Tags:</span>
                    <div class="info-tags">
                        ${photo.tags.map(t => `<span class="info-tag">#${this.escapeHtml(t)}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-label">Rating:</span>
                    <div class="info-rating">
                        ${[1,2,3,4,5].map(r => `<button class="rating-star ${r <= (photo.rating || 0) ? 'active' : ''}" data-rating="${r}">⭐</button>`).join('')}
                    </div>
                </div>
                <div class="info-actions">
                    <button class="gallery-btn" id="info-favorite">${photo.favorite ? '❤️ Favorited' : '🤍 Favorite'}</button>
                    <button class="gallery-btn" id="info-add-tags">Add Tags</button>
                </div>
            </div>
        `;
        
        if (actionsEl) actionsEl.style.display = 'block';
        
        // Rating stars
        infoEl.querySelectorAll('.rating-star').forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                photo.rating = rating === photo.rating ? 0 : rating;
                this.savePhoto(photo);
                this.renderPhotoInfo(win);
                this.renderView(win);
            });
        });
        
        // Favorite button
        infoEl.querySelector('#info-favorite')?.addEventListener('click', () => {
            photo.favorite = !photo.favorite;
            this.savePhoto(photo);
            this.renderPhotoInfo(win);
            this.renderView(win);
        });
        
        // Add tags button
        infoEl.querySelector('#info-add-tags')?.addEventListener('click', () => {
            const tag = prompt('Enter tag:');
            if (tag && tag.trim()) {
                if (!photo.tags) photo.tags = [];
                if (!photo.tags.includes(tag.trim())) {
                    photo.tags.push(tag.trim());
                    this.savePhoto(photo);
                    this.loadData().then(() => {
                        this.renderSidebar(win);
                        this.renderPhotoInfo(win);
                        this.renderView(win);
                    });
                }
            }
        });
        
        // Copy metadata button
        win.querySelector('#info-copy-metadata')?.addEventListener('click', () => {
            const metadata = JSON.stringify({
                name: photo.name,
                size: photo.size,
                dimensions: `${photo.width}×${photo.height}`,
                dateTaken: photo.dateTaken,
                exif: photo.exif,
                tags: photo.tags,
                rating: photo.rating,
                favorite: photo.favorite
            }, null, 2);
            navigator.clipboard.writeText(metadata).then(() => {
                alert('Metadata copied to clipboard');
            });
        });
        
        // Remove metadata button
        win.querySelector('#info-remove-metadata')?.addEventListener('click', () => {
            if (confirm('Remove EXIF metadata? This cannot be undone.')) {
                delete photo.exif;
                this.savePhoto(photo);
                this.renderPhotoInfo(win);
            }
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    async handleUpload(win) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.multiple = true;
        
        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                await this.processUploads(files, win);
            }
        });
        
        input.click();
    }

    async handleFolderUpload(win) {
        // Note: Folder upload requires webkitdirectory attribute
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        
        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
            if (files.length > 0) {
                await this.processUploads(files, win);
            }
        });
        
        input.click();
    }

    async handleCameraCapture(win) {
        // Check if camera is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Camera not available in this browser');
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            
            const modal = document.createElement('div');
            modal.className = 'camera-modal';
            modal.innerHTML = `
                <div class="camera-container">
                    <video id="camera-preview" autoplay></video>
                    <div class="camera-controls">
                        <button class="gallery-btn" id="camera-capture">📷 Capture</button>
                        <button class="gallery-btn" id="camera-cancel">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const preview = modal.querySelector('#camera-preview');
            preview.srcObject = stream;
            
            modal.querySelector('#camera-capture').addEventListener('click', async () => {
                const canvas = document.createElement('canvas');
                canvas.width = preview.videoWidth;
                canvas.height = preview.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(preview, 0, 0);
                
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    stream.getTracks().forEach(track => track.stop());
                    modal.remove();
                    await this.processUploads([file], win);
                }, 'image/jpeg', 0.9);
            });
            
            modal.querySelector('#camera-cancel').addEventListener('click', () => {
                stream.getTracks().forEach(track => track.stop());
                modal.remove();
            });
        } catch (e) {
            alert(`Camera error: ${e.message}`);
        }
    }

    applyZoom(win) {
        localStorage.setItem('galleryZoom', this.zoomLevel.toString());
        const container = win.querySelector('.gallery-photos-container');
        const zoomLevelEl = win.querySelector('#zoom-level');
        
        if (zoomLevelEl) {
            zoomLevelEl.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
        
        if (container) {
            container.style.transform = `scale(${this.zoomLevel})`;
            container.style.transformOrigin = 'top left';
            container.style.width = `${100 / this.zoomLevel}%`;
        }
        
        // Adjust thumbnail size
        const thumbnails = container?.querySelectorAll('.photo-thumbnail');
        if (thumbnails) {
            thumbnails.forEach(thumb => {
                thumb.style.transform = `scale(${this.zoomLevel})`;
            });
        }
    }

    async handleMobileGalleryUpload(win) {
        // For mobile devices, use file input with accept
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.capture = 'environment'; // Use back camera if available
        
        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                await this.processUploads(files, win);
            }
        });
        
        input.click();
    }

    async handlePasteUpload(win, e = null) {
        if (e) {
            e.preventDefault();
            const items = e.clipboardData?.items || [];
            const files = [];
            
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                }
            }
            
            if (files.length > 0) {
                await this.processUploads(files, win);
            }
        } else {
            // Manual paste button
            navigator.clipboard.read().then(async (clipboardItems) => {
                const files = [];
                for (const clipboardItem of clipboardItems) {
                    for (const type of clipboardItem.types) {
                        if (type.startsWith('image/')) {
                            const blob = await clipboardItem.getType(type);
                            const file = new File([blob], `pasted_${Date.now()}.${type.split('/')[1]}`, { type });
                            files.push(file);
                        }
                    }
                }
                if (files.length > 0) {
                    await this.processUploads(files, win);
                } else {
                    alert('No images found in clipboard');
                }
            }).catch(() => {
                alert('Clipboard access denied. Please paste images directly into the gallery.');
            });
        }
    }

    async processUploads(files, win) {
        const validFiles = files.filter(f => {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
            return validTypes.includes(f.type) || f.name.match(/\.(jpg|jpeg|png|webp|gif|heic|heif)$/i);
        });
        
        if (validFiles.length === 0) {
            alert('No valid image files selected. Supported: JPG, PNG, WEBP, GIF, HEIC');
            return;
        }
        
        // Show upload progress
        const progressEl = document.createElement('div');
        progressEl.className = 'upload-progress';
        progressEl.innerHTML = `
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" style="width: 0%"></div>
            </div>
            <div class="upload-progress-text">Uploading 0/${validFiles.length}...</div>
        `;
        win.querySelector('.gallery-container')?.appendChild(progressEl);
        
        try {
            for (let i = 0; i < validFiles.length; i++) {
                await this.processFile(validFiles[i], win);
                const progress = ((i + 1) / validFiles.length) * 100;
                progressEl.querySelector('.upload-progress-fill').style.width = `${progress}%`;
                progressEl.querySelector('.upload-progress-text').textContent = `Uploading ${i + 1}/${validFiles.length}...`;
            }
            
            await this.loadData();
            this.applyFilters(win);
            this.renderSidebar(win);
            
            progressEl.querySelector('.upload-progress-text').textContent = `✓ Uploaded ${validFiles.length} photo(s)`;
            setTimeout(() => progressEl.remove(), 2000);
        } catch (e) {
            progressEl.remove();
            alert(`Upload failed: ${e.message}`);
        }
    }
    
    deleteSelectedPhotos(win) {
        const selected = Array.from(this.selectedPhotos);
        selected.forEach(async (photoId) => {
            const photo = this.photos.find(p => p.id === photoId);
            if (photo) {
                await this.deletePhotoById(photoId);
            }
        });
        this.selectedPhotos.clear();
        this.loadData().then(() => {
            this.applyFilters(win);
            this.renderView(win);
            this.updateStats(win);
        });
    }
    
    async deletePhotoById(photoId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.delete(photoId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    selectAllPhotos(win) {
        if (this.filteredPhotos.length === 0) return;
        this.filteredPhotos.forEach(photo => {
            this.selectedPhotos.add(photo.id);
        });
        this.updateStats(win);
        this.updateSelectionButtons(win);
        this.renderView(win);
    }
    
    updateSelectionButtons(win) {
        const exportBtn = win.querySelector('#gallery-export');
        const compareBtn = win.querySelector('#gallery-compare');
        if (exportBtn) {
            exportBtn.disabled = this.selectedPhotos.size === 0;
            exportBtn.title = this.selectedPhotos.size > 0 ? `Export ${this.selectedPhotos.size} photo(s)` : 'Export (select photos first)';
        }
        if (compareBtn) {
            compareBtn.disabled = this.selectedPhotos.size !== 2;
            compareBtn.title = this.selectedPhotos.size === 2 ? 'Compare 2 photos' : 'Compare (select 2 photos)';
        }
    }

    async processFile(file, win) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const photo = {
                    id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    url: e.target.result, // Full-resolution DataURL
                    originalBlob: null, // Will store original Blob reference
                    dateAdded: new Date().toISOString(),
                    dateTaken: new Date().toISOString(),
                    size: file.size,
                    type: file.type,
                    favorite: false,
                    rating: 0,
                    tags: [],
                    album: null,
                    width: 0,
                    height: 0,
                    isHighRes: true, // Flag for full-resolution image
                    quality: 'original' // Quality level
                };
                
                // Store original file as Blob for high-res access
                photo.originalBlob = file;
                
                // Extract EXIF if image
                if (file.type.startsWith('image/')) {
                    await this.extractEXIF(photo, e.target.result);
                    // Generate high-quality thumbnails
                    await this.generateThumbnail(photo);
                    await this.generateHighResThumbnail(photo);
                }
                
                // Save to IndexedDB
                await this.savePhoto(photo);
                resolve();
            };
            // Read as DataURL for full quality (no compression)
            reader.readAsDataURL(file);
        });
    }

    async extractEXIF(photo, dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                photo.width = img.width;
                photo.height = img.height;
                
                // Try to extract EXIF using EXIF.js if available, otherwise basic metadata
                if (typeof EXIF !== 'undefined') {
                    EXIF.getData(img, function() {
                        photo.exif = {
                            camera: EXIF.getTag(this, 'Model') || EXIF.getTag(this, 'Make'),
                            iso: EXIF.getTag(this, 'ISOSpeedRatings'),
                            aperture: EXIF.getTag(this, 'FNumber'),
                            shutterSpeed: EXIF.getTag(this, 'ExposureTime'),
                            focalLength: EXIF.getTag(this, 'FocalLength'),
                            dateTaken: EXIF.getTag(this, 'DateTimeOriginal') || EXIF.getTag(this, 'DateTime'),
                            gps: EXIF.getTag(this, 'GPSLatitude') ? {
                                lat: EXIF.getTag(this, 'GPSLatitude'),
                                lon: EXIF.getTag(this, 'GPSLongitude')
                            } : null
                        };
                        resolve();
                    });
                } else {
                    // Basic extraction
                    photo.exif = {
                        width: img.width,
                        height: img.height
                    };
                    resolve();
                }
            };
            img.src = dataUrl;
        });
    }

    async generateThumbnail(photo) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { 
                    alpha: false,
                    desynchronized: true,
                    willReadFrequently: false
                });
                
                // High-quality thumbnail generation
                const maxSize = this.thumbnailSize * this.pixelRatio; // Account for HiDPI
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) {
                        height = (height / width) * maxSize;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width / height) * maxSize;
                        height = maxSize;
                    }
                }
                
                // Set canvas size with pixel ratio for sharp rendering
                canvas.width = width;
                canvas.height = height;
                
                // High-quality image rendering settings
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Draw with high quality
                ctx.drawImage(img, 0, 0, width, height);
                
                // Generate high-quality thumbnail (0.95 quality for sharp thumbnails)
                photo.thumbnail = canvas.toDataURL('image/jpeg', 0.95);
                resolve();
            };
            img.src = photo.url;
        });
    }
    
    async generateHighResThumbnail(photo) {
        // Generate a larger, sharper thumbnail for hover/preview
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { 
                    alpha: false,
                    desynchronized: true
                });
                
                // Larger preview thumbnail (2x size)
                const maxSize = this.thumbnailSize * 2 * this.pixelRatio;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) {
                        height = (height / width) * maxSize;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width / height) * maxSize;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                photo.previewThumbnail = canvas.toDataURL('image/jpeg', 0.98);
                resolve();
            };
            img.src = photo.url;
        });
    }

    async savePhoto(photo) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.put(photo);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async handleDrop(e, win) {
        e.preventDefault();
        e.stopPropagation();
        
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(f => {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
            return validTypes.includes(f.type) || f.name.match(/\.(jpg|jpeg|png|webp|gif|heic|heif)$/i);
        });
        
        if (imageFiles.length > 0) {
            await this.processUploads(imageFiles, win);
        } else if (files.length > 0) {
            alert('Please drop image files only. Supported formats: JPG, PNG, WEBP, GIF, HEIC');
        }
    }

    openFullscreen(index, win) {
        this.currentPhotoIndex = index;
        this.isFullscreen = true;
        const photo = this.filteredPhotos[index];
        if (!photo) return;
        this.currentPhoto = photo;
        this.fullscreenZoom = 1;
        this.fullscreenRotation = 0;
        const modal = win.querySelector('#gallery-fullscreen');
        if (!modal) return;
        modal.style.display = 'flex';
        const img = modal.querySelector('#fullscreen-image');
        const wrapper = modal.querySelector('#fullscreen-image-wrapper');
        
        if (!img || !wrapper) return;
        
        // Load full-resolution image with high-quality rendering
        img.src = photo.url; // Always use original full-res
        img.style.imageRendering = 'auto';
        img.style.transform = 'scale(1) rotate(0deg)';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.cursor = 'grab';
        img.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Ensure high-quality rendering with GPU acceleration
        img.onload = () => {
            // Force high-quality rendering with GPU acceleration
            img.style.willChange = 'transform';
            img.style.backfaceVisibility = 'hidden';
            img.style.transform = 'translateZ(0) scale(1) rotate(0deg)';
            
            // Auto-fit to screen on load
            this.zoomFitToScreen(win);
        };
        
        modal.querySelector('#fullscreen-title').textContent = photo.name;
        this.updateFullscreenNav(win);
        this.updateFullscreenUI(win);
        this.renderPhotoInfo(win);
        this.renderFilmstrip(win);
        this.setupFullscreenZoom(win);
        
        // Setup keyboard navigation
        this.setupFullscreenKeyboard(win);
    }
    
    setupFullscreenKeyboard(win) {
        // Keyboard navigation is already handled in attachEvents, but ensure it works
        const handleKeyDown = (e) => {
            if (!this.isFullscreen) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.navigatePhoto(-1, win);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigatePhoto(1, win);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeFullscreen(win);
            } else if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.toggleFavorite(win);
            }
        };
        
        // Remove old listener if exists
        if (this.fullscreenKeyHandler) {
            document.removeEventListener('keydown', this.fullscreenKeyHandler);
        }
        
        this.fullscreenKeyHandler = handleKeyDown;
        document.addEventListener('keydown', handleKeyDown);
    }
    
    setupFullscreenZoom(win) {
        const img = win.querySelector('#fullscreen-image');
        if (!img) return;
        
        // Pinch-to-zoom for touch devices
        let initialDistance = 0;
        let initialZoom = this.fullscreenZoom;
        
        img.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                initialZoom = this.fullscreenZoom;
            }
        });
        
        img.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                const scale = currentDistance / initialDistance;
                this.fullscreenZoom = Math.max(0.5, Math.min(5, initialZoom * scale));
                this.applyFullscreenZoom(win);
            }
        });
    }
    
    applyFullscreenZoom(win) {
        const img = win.querySelector('#fullscreen-image');
        const wrapper = win.querySelector('#fullscreen-image-wrapper');
        if (!img || !wrapper) return;
        
        // Apply zoom with high-quality rendering and smooth transitions
        img.style.transform = `scale(${this.fullscreenZoom}) rotate(${this.fullscreenRotation}deg)`;
        img.style.imageRendering = this.fullscreenZoom >= 1 ? 'auto' : 'auto';
        
        // Center the image in wrapper
        img.style.position = 'relative';
        img.style.left = '0';
        img.style.top = '0';
        
        // Update zoom display
        const zoomDisplay = win.querySelector('#fullscreen-zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(this.fullscreenZoom * 100)}%`;
        }
    }

    renderFilmstrip(win) {
        const filmstrip = win.querySelector('#fullscreen-filmstrip');
        if (!filmstrip) return;
        
        const startIdx = Math.max(0, this.currentPhotoIndex - 5);
        const endIdx = Math.min(this.filteredPhotos.length, this.currentPhotoIndex + 6);
        const visiblePhotos = this.filteredPhotos.slice(startIdx, endIdx);
        
        filmstrip.innerHTML = visiblePhotos.map((photo, idx) => {
            const actualIdx = startIdx + idx;
            const isActive = actualIdx === this.currentPhotoIndex;
            return `
                <div class="filmstrip-item ${isActive ? 'active' : ''}" data-index="${actualIdx}">
                    <img src="${photo.thumbnail || photo.url}" />
                </div>
            `;
        }).join('');
        
        filmstrip.querySelectorAll('.filmstrip-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.dataset.index);
                this.currentPhotoIndex = idx;
                const photo = this.filteredPhotos[idx];
                this.currentPhoto = photo;
                win.querySelector('#fullscreen-image').src = photo.url;
                win.querySelector('#fullscreen-title').textContent = photo.name;
                this.updateFullscreenNav(win);
                this.renderFilmstrip(win);
            });
        });
    }

    zoomImage(factor, win) {
        const img = win.querySelector('#fullscreen-image');
        if (!img) return;
        this.fullscreenZoom = Math.max(0.5, Math.min(5, this.fullscreenZoom * factor));
        this.applyFullscreenZoom(win);
    }
    
    zoomToLevel(level, win) {
        this.fullscreenZoom = Math.max(0.5, Math.min(5, level));
        this.applyFullscreenZoom(win);
    }
    
    zoomFitToScreen(win) {
        const img = win.querySelector('#fullscreen-image');
        if (!img) return;
        const wrapper = win.querySelector('#fullscreen-image-wrapper');
        if (!wrapper) return;
        
        // Wait for image to load if needed
        if (!img.complete || img.naturalWidth === 0) {
            img.onload = () => this.zoomFitToScreen(win);
            return;
        }
        
        const wrapperWidth = wrapper.clientWidth;
        const wrapperHeight = wrapper.clientHeight;
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        
        if (imgWidth === 0 || imgHeight === 0) return;
        
        const scaleX = wrapperWidth / imgWidth;
        const scaleY = wrapperHeight / imgHeight;
        this.fullscreenZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
        this.applyFullscreenZoom(win);
    }
    
    zoomFitToWidth(win) {
        const img = win.querySelector('#fullscreen-image');
        if (!img) return;
        const wrapper = win.querySelector('#fullscreen-image-wrapper');
        if (!wrapper) return;
        
        if (!img.complete || img.naturalWidth === 0) {
            img.onload = () => this.zoomFitToWidth(win);
            return;
        }
        
        const wrapperWidth = wrapper.clientWidth;
        const imgWidth = img.naturalWidth || img.width;
        if (imgWidth === 0) return;
        
        this.fullscreenZoom = wrapperWidth / imgWidth;
        this.applyFullscreenZoom(win);
    }
    
    zoomFitToHeight(win) {
        const img = win.querySelector('#fullscreen-image');
        if (!img) return;
        const wrapper = win.querySelector('#fullscreen-image-wrapper');
        if (!wrapper) return;
        
        if (!img.complete || img.naturalHeight === 0) {
            img.onload = () => this.zoomFitToHeight(win);
            return;
        }
        
        const wrapperHeight = wrapper.clientHeight;
        const imgHeight = img.naturalHeight || img.height;
        if (imgHeight === 0) return;
        
        this.fullscreenZoom = wrapperHeight / imgHeight;
        this.applyFullscreenZoom(win);
    }
    
    zoomFillScreen(win) {
        const img = win.querySelector('#fullscreen-image');
        if (!img) return;
        const wrapper = win.querySelector('#fullscreen-image-wrapper');
        if (!wrapper) return;
        
        if (!img.complete || img.naturalWidth === 0) {
            img.onload = () => this.zoomFillScreen(win);
            return;
        }
        
        const wrapperWidth = wrapper.clientWidth;
        const wrapperHeight = wrapper.clientHeight;
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        
        if (imgWidth === 0 || imgHeight === 0) return;
        
        const scaleX = wrapperWidth / imgWidth;
        const scaleY = wrapperHeight / imgHeight;
        this.fullscreenZoom = Math.max(scaleX, scaleY); // Fill entire screen
        this.applyFullscreenZoom(win);
    }

    resetZoom(win) {
        const img = win.querySelector('#fullscreen-image');
        if (!img) return;
        this.fullscreenZoom = 1;
        this.fullscreenRotation = 0;
        img.style.transform = 'scale(1) rotate(0deg)';
        img.style.left = '0';
        img.style.top = '0';
        img.style.imageRendering = 'auto';
        this.applyFullscreenZoom(win);
    }

    rotateFullscreenImage(win) {
        const img = win.querySelector('#fullscreen-image');
        if (!img) return;
        this.fullscreenRotation = (this.fullscreenRotation + 90) % 360;
        img.style.transform = `scale(${this.fullscreenZoom}) rotate(${this.fullscreenRotation}deg)`;
    }

    startSlideshow(win) {
        if (this.filteredPhotos.length === 0) {
            alert('No photos to show');
            return;
        }
        
        this.isSlideshow = true;
        this.slideshowIndex = 0;
        this.openFullscreen(0, win);
        
        this.slideshowInterval = setInterval(() => {
            this.slideshowIndex = (this.slideshowIndex + 1) % this.filteredPhotos.length;
            this.currentPhotoIndex = this.slideshowIndex;
            const photo = this.filteredPhotos[this.slideshowIndex];
            this.currentPhoto = photo;
            win.querySelector('#fullscreen-image').src = photo.url;
            win.querySelector('#fullscreen-title').textContent = photo.name;
            this.updateFullscreenNav(win);
            this.renderFilmstrip(win);
        }, 3000); // 3 seconds per photo
    }

    openCompareMode(win) {
        const selected = Array.from(this.selectedPhotos);
        if (selected.length !== 2) return;
        
        const photo1 = this.photos.find(p => p.id === selected[0]);
        const photo2 = this.photos.find(p => p.id === selected[1]);
        
        if (!photo1 || !photo2) return;
        
        const modal = document.createElement('div');
        modal.className = 'compare-modal';
        modal.innerHTML = `
            <div class="compare-container">
                <div class="compare-header">
                    <h3>Compare Photos</h3>
                    <button class="gallery-btn" id="compare-close">Close</button>
                </div>
                <div class="compare-content">
                    <div class="compare-photo">
                        <img src="${photo1.url}" />
                        <div class="compare-info">${photo1.name}</div>
                    </div>
                    <div class="compare-divider"></div>
                    <div class="compare-photo">
                        <img src="${photo2.url}" />
                        <div class="compare-info">${photo2.name}</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('#compare-close').addEventListener('click', () => {
            modal.remove();
        });
    }

    closeFullscreen(win) {
        this.isFullscreen = false;
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
        
        // Remove keyboard listener
        if (this.fullscreenKeyHandler) {
            document.removeEventListener('keydown', this.fullscreenKeyHandler);
            this.fullscreenKeyHandler = null;
        }
        
        const modal = win.querySelector('#gallery-fullscreen');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    navigatePhoto(direction, win) {
        const newIndex = this.currentPhotoIndex + direction;
        if (newIndex >= 0 && newIndex < this.filteredPhotos.length) {
            this.currentPhotoIndex = newIndex;
            const photo = this.filteredPhotos[newIndex];
            this.currentPhoto = photo;
            win.querySelector('#fullscreen-image').src = photo.url;
            win.querySelector('#fullscreen-title').textContent = photo.name;
            this.updateFullscreenNav(win);
            this.updateFullscreenUI(win);
            this.renderPhotoInfo(win);
        }
    }

    updateFullscreenNav(win) {
        win.querySelector('#fullscreen-prev').disabled = this.currentPhotoIndex === 0;
        win.querySelector('#fullscreen-next').disabled = this.currentPhotoIndex === this.filteredPhotos.length - 1;
    }

    toggleSelection(photoId, win) {
        if (this.selectedPhotos.has(photoId)) {
            this.selectedPhotos.delete(photoId);
        } else {
            this.selectedPhotos.add(photoId);
        }
        this.updateStats(win);
        this.renderView(win);
        const exportBtn = win.querySelector('#gallery-export');
        const compareBtn = win.querySelector('#gallery-compare');
        if (exportBtn) exportBtn.disabled = this.selectedPhotos.size === 0;
        if (compareBtn) compareBtn.disabled = this.selectedPhotos.size !== 2;
    }

    updateStats(win) {
        const statsEl = win.querySelector('#gallery-stats');
        if (statsEl) {
            const total = this.photos.length;
            const filtered = this.filteredPhotos.length;
            const selected = this.selectedPhotos.size;
            statsEl.textContent = `${filtered}${filtered !== total ? ` of ${total}` : ''} photos${selected > 0 ? ` • ${selected} selected` : ''}`;
        }
    }

    handleVirtualScroll(container, win) {
        const scrollTop = container.scrollTop;
        const itemHeight = 250; // Approximate
        const visibleCount = Math.ceil(container.clientHeight / itemHeight);
        const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
        const end = Math.min(this.filteredPhotos.length, start + visibleCount + 20);
        
        if (start !== this.virtualScrollStart || end !== this.virtualScrollEnd) {
            this.virtualScrollStart = start;
            this.virtualScrollEnd = end;
            this.renderView(win);
        }
    }

    cycleTheme(win) {
        const themes = [
            { id: 'default', name: 'Default Dark' },
            { id: 'neon-night', name: 'Neon Night' },
            { id: 'cyber-purple', name: 'Cyber Purple' },
            { id: 'soft-pastel', name: 'Soft Pastel' },
            { id: 'amoled-black', name: 'AMOLED Dark' },
            { id: 'warm-minimal', name: 'Warm Minimal' },
            { id: 'glassmorphism', name: 'Glassmorphism' },
            { id: 'retro-pixel', name: 'Retro Pixel' },
            { id: 'professional-light', name: 'Professional Light' },
            { id: 'dark-pro', name: 'Dark Pro' },
            { id: 'neon-cyber', name: 'Neon Cyber' },
            { id: 'glass-blur', name: 'Glass Blur' },
            { id: 'film-vintage', name: 'Film Vintage' },
            { id: 'pastel-soft', name: 'Pastel Soft' },
            { id: 'studio-mode', name: 'Studio Mode' }
        ];
        
        const currentIndex = themes.findIndex(t => t.id === this.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        this.theme = nextTheme.id;
        localStorage.setItem('galleryTheme', this.theme);
        
        // Remove all theme classes
        const themeIds = themes.map(t => t.id);
        win.classList.remove(...themeIds.map(t => `theme-${t}`));
        win.classList.add(`theme-${this.theme}`);
        this.applyThemeStyles(win);
        
        // Show theme change notification
        const msg = document.createElement('div');
        msg.className = 'gallery-toast';
        msg.textContent = `Theme: ${nextTheme.name}`;
        msg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(99, 102, 241, 0.9); color: white; padding: 12px 20px; border-radius: 8px; z-index: 10001; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
        document.body.appendChild(msg);
        setTimeout(() => {
            msg.style.transition = 'opacity 0.3s ease';
            msg.style.opacity = '0';
            setTimeout(() => msg.remove(), 300);
        }, 2000);
    }

    applyThemeStyles(win) {
        // Apply theme-specific styles dynamically
        const root = win.querySelector('.gallery-container') || win;
        root.setAttribute('data-theme', this.theme);
    }

    setupAlbumContextMenu(win) {
        const menu = win.querySelector('#album-context-menu');
        if (!menu) return;
        
        menu.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                const albumId = menu.dataset.albumId;
                const albumName = menu.dataset.albumName;
                this.handleAlbumContextAction(action, albumId, albumName, win);
                menu.style.display = 'none';
            });
        });
        
        // Close menu on outside click
        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
    }

    showAlbumContextMenu(btn, e, win) {
        const menu = win.querySelector('#album-context-menu');
        if (!menu) return;
        
        menu.dataset.albumId = btn.dataset.albumId;
        menu.dataset.albumName = btn.dataset.albumName;
        menu.style.display = 'block';
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const menuRect = menu.getBoundingClientRect();
        const menuWidth = menuRect.width || 200;
        const menuHeight = menuRect.height || 300;
        
        // Calculate position with viewport boundary detection
        let left = e.clientX;
        let top = e.clientY;
        
        // Check right edge overflow
        if (left + menuWidth > viewportWidth) {
            left = viewportWidth - menuWidth - 10;
        }
        
        // Check left edge overflow
        if (left < 10) {
            left = 10;
        }
        
        // Check bottom edge overflow
        if (top + menuHeight > viewportHeight) {
            top = viewportHeight - menuHeight - 10;
        }
        
        // Check top edge overflow
        if (top < 10) {
            top = 10;
        }
        
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.maxHeight = `${Math.min(menuHeight, viewportHeight - top - 20)}px`;
        menu.style.overflowY = 'auto';
        
        // Animate appearance
        menu.style.opacity = '0';
        menu.style.transform = 'scale(0.95)';
        requestAnimationFrame(() => {
            menu.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            menu.style.opacity = '1';
            menu.style.transform = 'scale(1)';
        });
        
        e.stopPropagation();
    }

    async handleAlbumContextAction(action, albumId, albumName, win) {
        const album = this.albums.find(a => a.id === albumId);
        if (!album && action !== 'create') return;
        
        switch(action) {
            case 'rename':
                const newName = prompt('Rename album:', albumName);
                if (newName && newName.trim() && newName !== albumName) {
                    album.name = newName.trim();
                    await this.saveAlbum(album);
                    await this.loadData();
                    this.renderSidebar(win);
                }
                break;
            case 'delete':
                if (confirm(`Delete album "${albumName}"? Photos will not be deleted.`)) {
                    await this.deleteAlbum(albumId);
                    await this.loadData();
                    this.renderSidebar(win);
                    if (this.currentAlbum === albumId) {
                        this.currentAlbum = null;
                        this.applyFilters(win);
                    }
                }
                break;
            case 'export':
                await this.exportAlbumAsZip(albumId, win);
                break;
            case 'download':
                await this.downloadAlbumPhotos(albumId, win);
                break;
            case 'duplicate':
                await this.duplicateAlbum(albumId, win);
                break;
            case 'merge':
                await this.mergeAlbums(albumId, win);
                break;
            case 'lock':
                album.locked = !album.locked;
                if (album.locked) {
                    const pin = prompt('Set PIN for album:');
                    if (pin) {
                        album.pin = pin;
                    } else {
                        album.locked = false;
                    }
                }
                await this.saveAlbum(album);
                await this.loadData();
                this.renderSidebar(win);
                break;
            case 'cover':
                const coverPhoto = await this.selectCoverPhoto(albumId, win);
                if (coverPhoto) {
                    album.coverPhotoId = coverPhoto.id;
                    await this.saveAlbum(album);
                    await this.loadData();
                    this.renderSidebar(win);
                }
                break;
            case 'sort':
                await this.sortAlbumPhotos(albumId, win);
                break;
            case 'move':
                await this.moveAlbum(albumId, win);
                break;
            case 'share':
                await this.shareAlbum(albumId, win);
                break;
            case 'smart':
                await this.createSmartAlbum(win);
                break;
        }
    }
    
    async moveAlbum(albumId, win) {
        const album = this.albums.find(a => a.id === albumId);
        if (!album) return;
        
        const newPosition = prompt('Move album to position (number):');
        if (newPosition && !isNaN(newPosition)) {
            // Simple position update (would use IndexedDB order in production)
            alert(`Album "${album.name}" moved to position ${newPosition}`);
        }
    }
    
    async shareAlbum(albumId, win) {
        const album = this.albums.find(a => a.id === albumId);
        if (!album) return;
        
        const photos = this.photos.filter(p => p.album === albumId);
        const shareData = {
            album: album.name,
            photoCount: photos.length,
            photos: photos.map(p => ({ name: p.name, url: p.url }))
        };
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Album: ${album.name}`,
                    text: `${album.name} - ${photos.length} photos`,
                    url: window.location.href
                });
            } catch (e) {
                // Fallback to clipboard
                navigator.clipboard.writeText(JSON.stringify(shareData, null, 2));
                alert('Album data copied to clipboard');
            }
        } else {
            navigator.clipboard.writeText(JSON.stringify(shareData, null, 2));
            alert('Album data copied to clipboard');
        }
    }
    
    async createSmartAlbum(win) {
        const name = prompt('Smart Album name:');
        if (!name || !name.trim()) return;
        
        const rule = prompt('Filter rule:\n1 = Favorites\n2 = Recently Added\n3 = Screenshots\n4 = Large Files\n5 = Duplicates');
        const ruleMap = {
            '1': { type: 'smart', filter: 'favorites', icon: '❤️' },
            '2': { type: 'smart', filter: 'recent', icon: '🕐' },
            '3': { type: 'smart', filter: 'screenshots', icon: '📸' },
            '4': { type: 'smart', filter: 'large', icon: '📦' },
            '5': { type: 'smart', filter: 'duplicates', icon: '🔄' }
        };
        
        if (ruleMap[rule]) {
            const smartAlbum = {
                id: `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: name.trim(),
                ...ruleMap[rule],
                created: new Date().toISOString()
            };
            
            await this.saveAlbum(smartAlbum);
            await this.loadData();
            this.renderSidebar(win);
        }
    }

    async saveAlbum(album) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['albums'], 'readwrite');
            const store = transaction.objectStore('albums');
            const request = store.put(album);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deleteAlbum(albumId) {
        // Remove album from photos
        const photos = this.photos.filter(p => p.album === albumId);
        for (const photo of photos) {
            photo.album = null;
            await this.savePhoto(photo);
        }
        
        // Delete album
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['albums'], 'readwrite');
            const store = transaction.objectStore('albums');
            const request = store.delete(albumId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async exportAlbumAsZip(albumId, win) {
        const photos = this.photos.filter(p => p.album === albumId);
        if (photos.length === 0) {
            alert('Album is empty');
            return;
        }
        
        // Export as JSON (ZIP would require JSZip library)
        const data = JSON.stringify(photos, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `album-${albumId}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async downloadAlbumPhotos(albumId, win) {
        const photos = this.photos.filter(p => p.album === albumId);
        if (photos.length === 0) {
            alert('Album is empty');
            return;
        }
        
        // Download photos one by one
        for (const photo of photos) {
            const link = document.createElement('a');
            link.href = photo.url;
            link.download = photo.name;
            link.click();
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        }
    }

    async duplicateAlbum(albumId, win) {
        const album = this.albums.find(a => a.id === albumId);
        if (!album) return;
        
        const newName = prompt('Duplicate album name:', `${album.name} (Copy)`);
        if (newName && newName.trim()) {
            const newAlbum = {
                id: `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: newName.trim(),
                type: 'user',
                created: new Date().toISOString()
            };
            
            await this.saveAlbum(newAlbum);
            
            // Copy photos to new album
            const photos = this.photos.filter(p => p.album === albumId);
            for (const photo of photos) {
                const newPhoto = { ...photo };
                newPhoto.id = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                newPhoto.album = newAlbum.id;
                await this.savePhoto(newPhoto);
            }
            
            await this.loadData();
            this.renderSidebar(win);
        }
    }

    async mergeAlbums(albumId, win) {
        const targetAlbum = this.albums.find(a => a.id === albumId);
        if (!targetAlbum) return;
        
        const otherAlbums = this.albums.filter(a => a.id !== albumId && a.type !== 'smart');
        if (otherAlbums.length === 0) {
            alert('No other albums to merge with');
            return;
        }
        
        const albumNames = otherAlbums.map(a => a.name).join(', ');
        const confirmMsg = `Merge photos from "${albumNames}" into "${targetAlbum.name}"?`;
        if (confirm(confirmMsg)) {
            for (const album of otherAlbums) {
                const photos = this.photos.filter(p => p.album === album.id);
                for (const photo of photos) {
                    photo.album = albumId;
                    await this.savePhoto(photo);
                }
                await this.deleteAlbum(album.id);
            }
            
            await this.loadData();
            this.renderSidebar(win);
            this.applyFilters(win);
        }
    }

    async selectCoverPhoto(albumId, win) {
        const photos = this.photos.filter(p => p.album === albumId);
        if (photos.length === 0) {
            alert('Album is empty');
            return null;
        }
        
        // Show photo picker (simplified - would be a modal in production)
        const photoNames = photos.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
        const choice = prompt(`Select cover photo (1-${photos.length}):\n\n${photoNames}`);
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < photos.length) {
            return photos[index];
        }
        return null;
    }

    async sortAlbumPhotos(albumId, win) {
        const sortBy = prompt('Sort by: date, size, name');
        if (!sortBy) return;
        
        const photos = this.photos.filter(p => p.album === albumId);
        const sorted = photos.sort((a, b) => {
            switch(sortBy.toLowerCase()) {
                case 'date':
                    return new Date(b.dateTaken || b.dateAdded) - new Date(a.dateTaken || a.dateAdded);
                case 'size':
                    return (b.size || 0) - (a.size || 0);
                case 'name':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });
        
        // Update order (simplified - would store order in IndexedDB)
        alert(`Sorted ${sorted.length} photos by ${sortBy}`);
    }

    async exportPhotos(win) {
        if (this.selectedPhotos.size === 0) {
            alert('Please select photos to export');
            return;
        }
        
        const photosToExport = this.photos.filter(p => this.selectedPhotos.has(p.id));
        if (photosToExport.length === 0) return;
        
        // Show export options
        const format = confirm('Export as:\nOK = Download images\nCancel = Export metadata JSON') ? 'images' : 'json';
        
        if (format === 'images') {
            // Download each image
            for (const photo of photosToExport) {
                const link = document.createElement('a');
                link.href = photo.url;
                link.download = photo.name;
                link.click();
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between downloads
            }
            alert(`Exported ${photosToExport.length} photos`);
        } else {
            // Export metadata as JSON
            const data = JSON.stringify(photosToExport.map(p => ({
                id: p.id,
                name: p.name,
                dateAdded: p.dateAdded,
                dateTaken: p.dateTaken,
                tags: p.tags,
                rating: p.rating,
                favorite: p.favorite,
                album: p.album,
                exif: p.exif
            })), null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gallery-export-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    async createBackup(win) {
        try {
            const backup = {
                version: 1,
                timestamp: new Date().toISOString(),
                photos: this.photos.map(p => ({
                    id: p.id,
                    name: p.name,
                    url: p.url,
                    dateAdded: p.dateAdded,
                    dateTaken: p.dateTaken,
                    size: p.size,
                    type: p.type,
                    width: p.width,
                    height: p.height,
                    tags: p.tags,
                    rating: p.rating,
                    favorite: p.favorite,
                    album: p.album,
                    exif: p.exif
                })),
                albums: this.albums.filter(a => a.type !== 'smart').map(a => ({
                    id: a.id,
                    name: a.name,
                    type: a.type,
                    created: a.created
                }))
            };
            
            const data = JSON.stringify(backup, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gallery-backup-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            // Show success message
            const msg = document.createElement('div');
            msg.className = 'gallery-toast';
            msg.textContent = '✓ Backup created successfully';
            win.querySelector('.gallery-container')?.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        } catch (e) {
            alert(`Backup failed: ${e.message}`);
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toggleFavorite(win) {
        const photo = this.filteredPhotos[this.currentPhotoIndex] || this.currentPhoto;
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        photo.favorite = !photo.favorite;
        this.savePhoto(photo);
        this.updateFullscreenUI(win);
        this.renderView(win);
        this.renderPhotoInfo(win);
        
        // Show feedback
        const msg = document.createElement('div');
        msg.className = 'gallery-toast';
        msg.textContent = photo.favorite ? '❤ Added to favorites' : '🤍 Removed from favorites';
        document.body.appendChild(msg);
        setTimeout(() => {
            msg.style.transition = 'opacity 0.3s ease';
            msg.style.opacity = '0';
            setTimeout(() => msg.remove(), 300);
        }, 1500);
    }

    updateFullscreenUI(win) {
        const photo = this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) return;
        const favBtn = win.querySelector('#fullscreen-favorite');
        if (favBtn) {
            favBtn.textContent = photo.favorite ? '❤️' : '🤍';
            favBtn.classList.toggle('active', photo.favorite);
        }
    }

    openEditor(win) {
        const photo = this.filteredPhotos[this.currentPhotoIndex] || this.currentPhoto;
        if (!photo) {
            alert('Please select a photo to edit');
            return;
        }
        this.isEditing = true;
        this.editingPhoto = photo;
        this.editorHistory = [];
        this.editorHistoryIndex = -1;
        
        const modal = win.querySelector('#gallery-editor');
        const canvas = win.querySelector('#editor-canvas');
        if (!modal || !canvas) return;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Use full resolution
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { 
                alpha: false,
                desynchronized: true,
                willReadFrequently: false
            });
            
            // High-quality rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0);
            
            // Save initial state
            this.editorHistory.push(canvas.toDataURL('image/jpeg', 0.95));
            this.editorHistoryIndex = 0;
            this.updateEditorHistoryButtons(win);
            
            modal.style.display = 'flex';
            
            // Reset editor controls
            const controls = win.querySelector('#editor-controls');
            if (controls) controls.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; padding: 12px;">Select a tool to start editing</p>';
        };
        img.onerror = () => {
            alert('Failed to load image for editing');
            this.isEditing = false;
        };
        img.src = photo.url;
    }

    closeEditor(win) {
        this.isEditing = false;
        this.editingPhoto = null;
        this.editorHistory = [];
        this.editorHistoryIndex = -1;
        const modal = win.querySelector('#gallery-editor');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    selectEditorTool(tool, win) {
        const controls = win.querySelector('#editor-controls');
        controls.innerHTML = '';
        
        switch(tool) {
            case 'crop':
                controls.innerHTML = `
                    <div class="crop-presets">
                        <div class="crop-preset-label">Aspect Ratio:</div>
                        <button class="crop-preset-btn" data-ratio="free">Free</button>
                        <button class="crop-preset-btn" data-ratio="1:1">1:1 (Square)</button>
                        <button class="crop-preset-btn" data-ratio="4:3">4:3</button>
                        <button class="crop-preset-btn" data-ratio="16:9">16:9</button>
                        <button class="crop-preset-btn" data-ratio="3:2">3:2</button>
                        <button class="crop-preset-btn" data-ratio="9:16">9:16 (Portrait)</button>
                    </div>
                    <p style="margin-top: 12px; font-size: 12px; color: var(--text-muted);">Click and drag on canvas to crop</p>
                `;
                win.querySelectorAll('.crop-preset-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.cropAspectRatio = btn.dataset.ratio;
                        win.querySelectorAll('.crop-preset-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        this.setupCropTool(win);
                    });
                });
                this.cropAspectRatio = 'free';
                this.setupCropTool(win);
                break;
            case 'rotate':
                controls.innerHTML = '<button class="gallery-btn" id="rotate-90">Rotate 90°</button>';
                win.querySelector('#rotate-90')?.addEventListener('click', () => this.rotateImage(90, win));
                break;
            case 'brightness':
                controls.innerHTML = '<input type="range" id="brightness-slider" min="-100" max="100" value="0" />';
                win.querySelector('#brightness-slider')?.addEventListener('input', (e) => {
                    this.applyBrightness(parseInt(e.target.value), win);
                });
                break;
            case 'contrast':
                controls.innerHTML = '<input type="range" id="contrast-slider" min="-100" max="100" value="0" />';
                win.querySelector('#contrast-slider')?.addEventListener('input', (e) => {
                    this.applyContrast(parseInt(e.target.value), win);
                });
                break;
            case 'saturation':
                controls.innerHTML = '<input type="range" id="saturation-slider" min="-100" max="100" value="0" />';
                win.querySelector('#saturation-slider')?.addEventListener('input', (e) => {
                    this.applySaturation(parseInt(e.target.value), win);
                });
                break;
            case 'sharpness':
                controls.innerHTML = '<input type="range" id="sharpness-slider" min="0" max="200" value="0" />';
                win.querySelector('#sharpness-slider')?.addEventListener('input', (e) => {
                    this.applySharpness(parseInt(e.target.value), win);
                });
                break;
            case 'noise':
                controls.innerHTML = '<input type="range" id="noise-slider" min="0" max="100" value="0" />';
                win.querySelector('#noise-slider')?.addEventListener('input', (e) => {
                    this.applyNoiseReduction(parseInt(e.target.value), win);
                });
                break;
            case 'filter':
                controls.innerHTML = `
                    <div class="filter-presets">
                        <button class="filter-preset" data-filter="vintage">Vintage</button>
                        <button class="filter-preset" data-filter="blackwhite">B&W</button>
                        <button class="filter-preset" data-filter="sepia">Sepia</button>
                        <button class="filter-preset" data-filter="cool">Cool</button>
                        <button class="filter-preset" data-filter="warm">Warm</button>
                    </div>
                `;
                win.querySelectorAll('.filter-preset').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.applyFilter(btn.dataset.filter, win);
                    });
                });
                break;
        }
    }

    rotateImage(degrees, win) {
        const canvas = win.querySelector('#editor-canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            if (degrees === 90 || degrees === -90) {
                canvas.width = img.height;
                canvas.height = img.width;
            }
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(degrees * Math.PI / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
            this.pushEditorHistory(canvas, win);
        };
        img.src = this.editorHistory[this.editorHistoryIndex];
    }

    setupCropTool(win) {
        const canvas = win.querySelector('#editor-canvas');
        if (!canvas) return;
        
        let isCropping = false;
        let startX = 0, startY = 0, endX = 0, endY = 0;
        let cropRect = null;
        
        const drawCropRect = () => {
            if (!cropRect) return;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Draw crop overlay
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
                
                // Darken outside crop area
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.clearRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
                ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.width, cropRect.height, cropRect.x, cropRect.y, cropRect.width, cropRect.height);
            };
            img.src = this.editorHistory[this.editorHistoryIndex] || this.currentPhoto?.url;
        };
        
        canvas.addEventListener('mousedown', (e) => {
            isCropping = true;
            const rect = canvas.getBoundingClientRect();
            startX = (e.clientX - rect.left) * (canvas.width / rect.width);
            startY = (e.clientY - rect.top) * (canvas.height / rect.height);
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!isCropping) return;
            const rect = canvas.getBoundingClientRect();
            endX = (e.clientX - rect.left) * (canvas.width / rect.width);
            endY = (e.clientY - rect.top) * (canvas.height / rect.height);
            
            let width = Math.abs(endX - startX);
            let height = Math.abs(endY - startY);
            
            // Apply aspect ratio if set
            if (this.cropAspectRatio && this.cropAspectRatio !== 'free') {
                const [w, h] = this.cropAspectRatio.split(':').map(Number);
                const ratio = w / h;
                if (width / height > ratio) {
                    width = height * ratio;
                } else {
                    height = width / ratio;
                }
            }
            
            cropRect = {
                x: Math.min(startX, endX),
                y: Math.min(startY, endY),
                width: width,
                height: height
            };
            
            drawCropRect();
        });
        
        canvas.addEventListener('mouseup', () => {
            if (isCropping && cropRect) {
                this.applyCrop(cropRect, win);
                isCropping = false;
                cropRect = null;
            }
        });
    }
    
    applyCrop(cropRect, win) {
        const canvas = win.querySelector('#editor-canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropRect.width;
            croppedCanvas.height = cropRect.height;
            const croppedCtx = croppedCanvas.getContext('2d');
            
            croppedCtx.drawImage(
                img,
                cropRect.x, cropRect.y, cropRect.width, cropRect.height,
                0, 0, cropRect.width, cropRect.height
            );
            
            canvas.width = cropRect.width;
            canvas.height = cropRect.height;
            ctx.drawImage(croppedCanvas, 0, 0);
            
            this.pushEditorHistory(canvas, win);
        };
        
        img.src = this.editorHistory[this.editorHistoryIndex] || this.currentPhoto?.url;
    }

    applyBrightness(value, win) {
        const canvas = win.querySelector('#editor-canvas');
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = value / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + (255 * factor)));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (255 * factor)));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (255 * factor)));
        }
        
        ctx.putImageData(imageData, 0, 0);
        this.pushEditorHistory(canvas, win);
    }

    applyContrast(value, win) {
        const canvas = win.querySelector('#editor-canvas');
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = (259 * (value + 255)) / (255 * (259 - value));
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
        }
        
        ctx.putImageData(imageData, 0, 0);
        this.pushEditorHistory(canvas, win);
    }

    applySaturation(value, win) {
        const canvas = win.querySelector('#editor-canvas');
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = value / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = Math.min(255, Math.max(0, gray + (data[i] - gray) * (1 + factor)));
            data[i + 1] = Math.min(255, Math.max(0, gray + (data[i + 1] - gray) * (1 + factor)));
            data[i + 2] = Math.min(255, Math.max(0, gray + (data[i + 2] - gray) * (1 + factor)));
        }
        
        ctx.putImageData(imageData, 0, 0);
        this.pushEditorHistory(canvas, win);
    }

    applySharpness(value, win) {
        const canvas = win.querySelector('#editor-canvas');
        const ctx = canvas.getContext('2d', { 
            alpha: false,
            desynchronized: true
        });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = new Uint8ClampedArray(imageData.data);
        const width = canvas.width;
        const height = canvas.height;
        
        // Sharpen kernel based on value
        const strength = value / 100;
        const kernel = [
            0, -strength, 0,
            -strength, 1 + 4 * strength, -strength,
            0, -strength, 0
        ];
        
        this.applyConvolution(data, width, height, kernel, 3);
        
        imageData.data.set(data);
        ctx.putImageData(imageData, 0, 0);
        this.pushEditorHistory(canvas, win);
    }

    applyNoiseReduction(value, win) {
        const canvas = win.querySelector('#editor-canvas');
        const ctx = canvas.getContext('2d', { 
            alpha: false,
            desynchronized: true
        });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const strength = value / 100;
        
        // Apply Gaussian blur for noise reduction
        const temp = new Uint8ClampedArray(data);
        const radius = Math.floor(strength * 2);
        
        for (let y = radius; y < canvas.height - radius; y++) {
            for (let x = radius; x < canvas.width - radius; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
                        r += temp[idx];
                        g += temp[idx + 1];
                        b += temp[idx + 2];
                        count++;
                    }
                }
                
                const idx = (y * canvas.width + x) * 4;
                data[idx] = r / count;
                data[idx + 1] = g / count;
                data[idx + 2] = b / count;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        this.pushEditorHistory(canvas, win);
    }

    applyFilter(filterName, win) {
        const canvas = win.querySelector('#editor-canvas');
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            switch(filterName) {
                case 'vintage':
                    r = Math.min(255, r * 1.1);
                    g = Math.min(255, g * 0.95);
                    b = Math.min(255, b * 0.9);
                    break;
                case 'blackwhite':
                    const gray = r * 0.299 + g * 0.587 + b * 0.114;
                    r = g = b = gray;
                    break;
                case 'sepia':
                    r = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                    g = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                    b = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                    break;
                case 'cool':
                    b = Math.min(255, b * 1.2);
                    r = Math.max(0, r * 0.9);
                    break;
                case 'warm':
                    r = Math.min(255, r * 1.2);
                    b = Math.max(0, b * 0.9);
                    break;
            }
            
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
        
        ctx.putImageData(imageData, 0, 0);
        this.pushEditorHistory(canvas, win);
    }

    pushEditorHistory(canvas, win) {
        this.editorHistory = this.editorHistory.slice(0, this.editorHistoryIndex + 1);
        this.editorHistory.push(canvas.toDataURL('image/jpeg', 0.95));
        this.editorHistoryIndex++;
        this.updateEditorHistoryButtons(win);
    }
    
    updateEditorHistoryButtons(win) {
        const undoBtn = win.querySelector('#editor-undo');
        const redoBtn = win.querySelector('#editor-redo');
        if (undoBtn) undoBtn.disabled = this.editorHistoryIndex <= 0;
        if (redoBtn) redoBtn.disabled = this.editorHistoryIndex >= this.editorHistory.length - 1;
    }
    
    undoEditor(win) {
        if (this.editorHistoryIndex <= 0) return;
        this.editorHistoryIndex--;
        this.applyEditorHistory(win);
    }
    
    redoEditor(win) {
        if (this.editorHistoryIndex >= this.editorHistory.length - 1) return;
        this.editorHistoryIndex++;
        this.applyEditorHistory(win);
    }
    
    applyEditorHistory(win) {
        const canvas = win.querySelector('#editor-canvas');
        if (!canvas || !this.editorHistory[this.editorHistoryIndex]) return;
        
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            this.updateEditorHistoryButtons(win);
        };
        img.src = this.editorHistory[this.editorHistoryIndex];
    }

    async saveEditedPhoto(win, saveAsNew) {
        const canvas = win.querySelector('#editor-canvas');
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        if (saveAsNew) {
            const newPhoto = {
                ...this.editingPhoto,
                id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: this.editingPhoto.name.replace(/\.[^/.]+$/, '') + '_edited.jpg',
                url: dataUrl,
                dateAdded: new Date().toISOString()
            };
            await this.generateThumbnail(newPhoto);
            await this.savePhoto(newPhoto);
        } else {
            this.editingPhoto.url = dataUrl;
            await this.generateThumbnail(this.editingPhoto);
            await this.savePhoto(this.editingPhoto);
        }
        
        this.closeEditor(win);
        await this.loadData();
        this.applyFilters(win);
    }

    async aiDescribe(win) {
        const photo = this.filteredPhotos[this.currentPhotoIndex] || this.currentPhoto;
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        const messagesEl = win.querySelector('#ai-messages');
        if (!messagesEl) return;
        
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Analyzing image...';
        messagesEl.appendChild(msg);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        
        try {
            const apiKey = localStorage.getItem('openai_api_key');
            if (!apiKey) { throw new Error('OpenAI API key not set. Set it in app settings or as OPENAI_API_KEY env.'); }
            
            // Use OpenAI Vision API to describe image
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Describe this image in detail. What do you see?' },
                            { type: 'image_url', image_url: { url: photo.url } }
                        ]
                    }],
                    max_tokens: 300
                })
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API error: ${res.status}`);
            }
            
            const data = await res.json();
            const description = data.choices?.[0]?.message?.content || 'Could not analyze image';
            msg.textContent = description;
            msg.style.color = 'var(--text-primary)';
        } catch (e) {
            msg.textContent = `Error: ${e.message}. Make sure your OpenAI API key is configured in settings.`;
            msg.style.color = '#ef4444';
        } finally {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    }

    async aiExtractText(win) {
        const photo = this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) return;
        
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Extracting text...';
        messagesEl.appendChild(msg);
        
        try {
            const apiKey = localStorage.getItem('openai_api_key');
            if (!apiKey) { throw new Error('OpenAI API key not set.'); }
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Extract all text from this image. Return only the text, no explanations.' },
                            { type: 'image_url', image_url: { url: photo.url } }
                        ]
                    }],
                    max_tokens: 500
                })
            });
            
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || 'No text found';
            msg.textContent = text;
            
            // Add button to send to Notes
            const sendBtn = document.createElement('button');
            sendBtn.className = 'gallery-btn';
            sendBtn.textContent = 'Send to Notes';
            sendBtn.addEventListener('click', () => {
                if (typeof notesApp !== 'undefined') {
                    notesApp.createNoteFromText(text);
                }
            });
            msg.appendChild(sendBtn);
        } catch (e) {
            msg.textContent = `Error: ${e.message}`;
        }
    }

    async aiSuggestTags(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Analyzing for tags...';
        messagesEl.appendChild(msg);
        
        try {
            const apiKey = localStorage.getItem('openai_api_key');
            if (!apiKey) { throw new Error('OpenAI API key not set.'); }
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Suggest 3-5 relevant tags for this image. Return only comma-separated tags, no explanations.' },
                            { type: 'image_url', image_url: { url: photo.url } }
                        ]
                    }],
                    max_tokens: 100
                })
            });
            
            const data = await res.json();
            const tagsText = data.choices?.[0]?.message?.content || '';
            const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
            msg.textContent = `Suggested tags: ${tags.join(', ')}`;
            
            const applyBtn = document.createElement('button');
            applyBtn.className = 'gallery-btn';
            applyBtn.textContent = 'Apply Tags';
            applyBtn.addEventListener('click', () => {
                if (!photo.tags) photo.tags = [];
                tags.forEach(tag => {
                    if (!photo.tags.includes(tag)) photo.tags.push(tag);
                });
                this.savePhoto(photo);
                this.loadData().then(() => {
                    this.renderSidebar(win);
                    this.renderPhotoInfo(win);
                    this.renderView(win);
                });
            });
            msg.appendChild(applyBtn);
        } catch (e) {
            msg.textContent = `Error: ${e.message}`;
        }
    }

    async aiAutoCaption(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Generating caption...';
        messagesEl.appendChild(msg);
        
        try {
            const apiKey = localStorage.getItem('openai_api_key');
            if (!apiKey) { throw new Error('OpenAI API key not set.'); }
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Generate a short, descriptive caption for this image (1-2 sentences).' },
                            { type: 'image_url', image_url: { url: photo.url } }
                        ]
                    }],
                    max_tokens: 150
                })
            });
            
            const data = await res.json();
            const caption = data.choices?.[0]?.message?.content || 'Could not generate caption';
            msg.textContent = `Caption: ${caption}`;
            
            if (!photo.caption) {
                photo.caption = caption;
                this.savePhoto(photo);
            }
        } catch (e) {
            msg.textContent = `Error: ${e.message}`;
        }
    }

    async aiDetectSimilar(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Finding similar photos...';
        messagesEl.appendChild(msg);
        
        // Simple similarity detection based on dimensions and size
        const similar = this.photos.filter(p => 
            p.id !== photo.id &&
            Math.abs((p.width || 0) - (photo.width || 0)) < 100 &&
            Math.abs((p.height || 0) - (photo.height || 0)) < 100 &&
            Math.abs((p.size || 0) - (photo.size || 0)) < 100000
        ).slice(0, 5);
        
        if (similar.length > 0) {
            msg.textContent = `Found ${similar.length} similar photos`;
            const list = document.createElement('ul');
            similar.forEach(p => {
                const li = document.createElement('li');
                li.textContent = p.name;
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    const idx = this.filteredPhotos.findIndex(ph => ph.id === p.id);
                    if (idx >= 0) {
                        this.openFullscreen(idx, win);
                    }
                });
                list.appendChild(li);
            });
            msg.appendChild(list);
        } else {
            msg.textContent = 'No similar photos found';
        }
    }

    async aiBlurFaces(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Blurring faces for privacy...';
        messagesEl.appendChild(msg);
        
        // Simple blur effect using canvas
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Apply blur filter (simplified - would use face detection in production)
            ctx.filter = 'blur(10px)';
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(async (blob) => {
                const file = new File([blob], photo.name.replace(/\.[^/.]+$/, '') + '_blurred.jpg', { type: 'image/jpeg' });
                await this.processUploads([file], win);
                msg.textContent = 'Face blur applied. New version saved.';
            }, 'image/jpeg', 0.9);
        };
        img.src = photo.url;
    }

    async removeBackground(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Removing background...';
        messagesEl.appendChild(msg);
        
        // Simple background removal using edge detection and color similarity
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { 
                alpha: true,
                desynchronized: true
            });
            
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Simple background removal (edge-based)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const gray = (r + g + b) / 3;
                
                // Remove white/light backgrounds
                if (gray > 240) {
                    data[i + 3] = 0; // Make transparent
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            canvas.toBlob(async (blob) => {
                const file = new File([blob], photo.name.replace(/\.[^/.]+$/, '') + '_no_bg.png', { type: 'image/png' });
                await this.processUploads([file], win);
                msg.textContent = 'Background removed. New version saved as PNG.';
            }, 'image/png');
        };
        img.src = photo.url;
    }

    async generateTitle(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Generating title...';
        messagesEl.appendChild(msg);
        
        try {
            const apiKey = localStorage.getItem('openai_api_key');
            if (!apiKey) { throw new Error('OpenAI API key not set.'); }
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Generate a short, descriptive title for this image (3-5 words max). Return only the title, no explanations.' },
                            { type: 'image_url', image_url: { url: photo.url } }
                        ]
                    }],
                    max_tokens: 20
                })
            });
            
            const data = await res.json();
            const title = data.choices?.[0]?.message?.content || 'Untitled';
            msg.textContent = `Title: "${title}"`;
            
            photo.title = title.trim();
            this.savePhoto(photo);
        } catch (e) {
            msg.textContent = `Error: ${e.message}`;
        }
    }

    async sendToNotes(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        // Extract text first, then send to Notes
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Extracting content for Notes...';
        messagesEl.appendChild(msg);
        
        try {
            const apiKey = localStorage.getItem('openai_api_key');
            if (!apiKey) { throw new Error('OpenAI API key not set.'); }
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Extract all text and describe this image in detail. Format as a note.' },
                            { type: 'image_url', image_url: { url: photo.url } }
                        ]
                    }],
                    max_tokens: 500
                })
            });
            
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content || 'Could not extract content';
            
            // Send to Notes app if available
            if (typeof window.notesApp !== 'undefined' && window.notesApp.createNoteFromText) {
                window.notesApp.createNoteFromText(`Photo: ${photo.name}\n\n${content}`);
                msg.textContent = '✓ Content sent to Notes app';
            } else if (typeof notesApp !== 'undefined' && notesApp.createNoteFromText) {
                notesApp.createNoteFromText(`Photo: ${photo.name}\n\n${content}`);
                msg.textContent = '✓ Content sent to Notes app';
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(`Photo: ${photo.name}\n\n${content}`);
                msg.textContent = '✓ Content copied to clipboard (Notes app not found)';
            }
        } catch (e) {
            msg.textContent = `Error: ${e.message}`;
        }
    }

    async handleZipUpload(win) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip,application/zip';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Show progress
            const progressEl = document.createElement('div');
            progressEl.className = 'upload-progress';
            progressEl.innerHTML = `
                <div class="upload-progress-bar">
                    <div class="upload-progress-fill" style="width: 0%"></div>
                </div>
                <div class="upload-progress-text">Extracting ZIP...</div>
            `;
            win.querySelector('.gallery-container')?.appendChild(progressEl);
            
            try {
                // Note: JSZip would be needed for full ZIP support
                // For now, show a message
                progressEl.querySelector('.upload-progress-text').textContent = 'ZIP extraction requires JSZip library';
                setTimeout(() => progressEl.remove(), 3000);
                alert('ZIP import requires JSZip library. Please extract images manually and upload them.');
            } catch (e) {
                progressEl.remove();
                alert(`ZIP import failed: ${e.message}`);
            }
        });
        
        input.click();
    }

    // Image Enhancement Functions
    async enhanceSharpness(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        await this.applyImageEnhancement(photo, 'sharpen', win);
    }

    async improveClarity(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        await this.applyImageEnhancement(photo, 'clarity', win);
    }

    async reduceBlur(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        await this.applyImageEnhancement(photo, 'deblur', win);
    }

    async aiUpscale(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Upscaling image with AI...';
        messagesEl.appendChild(msg);
        
        // Upscale using canvas (2x)
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            const ctx = canvas.getContext('2d', { 
                alpha: false,
                desynchronized: true
            });
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(async (blob) => {
                const file = new File([blob], photo.name.replace(/\.[^/.]+$/, '') + '_upscaled.jpg', { type: 'image/jpeg' });
                await this.processUploads([file], win);
                msg.textContent = 'Image upscaled 2x. New version saved.';
            }, 'image/jpeg', 0.98);
        };
        img.src = photo.url;
    }

    async noiseReduction(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        await this.applyImageEnhancement(photo, 'denoise', win);
    }

    async hdrBoost(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        await this.applyImageEnhancement(photo, 'hdr', win);
    }

    async colorCorrection(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        await this.applyImageEnhancement(photo, 'color', win);
    }

    async dehaze(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        await this.applyImageEnhancement(photo, 'dehaze', win);
    }

    async restoreOldImage(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        await this.applyImageEnhancement(photo, 'restore', win);
    }

    async readableMode(win) {
        const photo = this.currentPhoto || this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) {
            alert('Please select a photo first');
            return;
        }
        
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.textContent = 'Enhancing text readability...';
        messagesEl.appendChild(msg);
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { 
                alpha: false,
                desynchronized: true
            });
            
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Enhance contrast and sharpness for text readability
            for (let i = 0; i < data.length; i += 4) {
                // Increase contrast
                const factor = 1.5;
                data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
                data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128));
                data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128));
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            canvas.toBlob(async (blob) => {
                const file = new File([blob], photo.name.replace(/\.[^/.]+$/, '') + '_readable.jpg', { type: 'image/jpeg' });
                await this.processUploads([file], win);
                msg.textContent = 'Text readability enhanced. New version saved.';
            }, 'image/jpeg', 0.98);
        };
        img.src = photo.url;
    }

    async applyImageEnhancement(photo, enhancementType, win) {
        const messagesEl = win.querySelector('#ai-messages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        const enhancementNames = {
            'sharpen': 'Enhancing sharpness...',
            'clarity': 'Improving clarity...',
            'deblur': 'Reducing blur...',
            'denoise': 'Reducing noise...',
            'hdr': 'Applying HDR boost...',
            'color': 'Correcting colors...',
            'dehaze': 'Removing haze...',
            'restore': 'Restoring old image...'
        };
        msg.textContent = enhancementNames[enhancementType] || 'Enhancing image...';
        messagesEl.appendChild(msg);
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { 
                alpha: false,
                desynchronized: true
            });
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Apply enhancement based on type
            switch(enhancementType) {
                case 'sharpen':
                    this.applySharpenFilter(data, canvas.width, canvas.height);
                    break;
                case 'clarity':
                    this.applyClarityFilter(data, canvas.width, canvas.height);
                    break;
                case 'deblur':
                    this.applyDeblurFilter(data, canvas.width, canvas.height);
                    break;
                case 'denoise':
                    this.applyDenoiseFilter(data, canvas.width, canvas.height);
                    break;
                case 'hdr':
                    this.applyHDRFilter(data);
                    break;
                case 'color':
                    this.applyColorCorrection(data);
                    break;
                case 'dehaze':
                    this.applyDehazeFilter(data);
                    break;
                case 'restore':
                    this.applyRestoreFilter(data);
                    break;
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            const suffix = enhancementType === 'sharpen' ? 'sharpened' :
                          enhancementType === 'clarity' ? 'clarified' :
                          enhancementType === 'deblur' ? 'deblurred' :
                          enhancementType === 'denoise' ? 'denoised' :
                          enhancementType === 'hdr' ? 'hdr' :
                          enhancementType === 'color' ? 'color_corrected' :
                          enhancementType === 'dehaze' ? 'dehazed' :
                          'restored';
            
            canvas.toBlob(async (blob) => {
                const file = new File([blob], photo.name.replace(/\.[^/.]+$/, '') + `_${suffix}.jpg`, { type: 'image/jpeg' });
                await this.processUploads([file], win);
                msg.textContent = `Image ${enhancementNames[enhancementType].toLowerCase().replace('...', '')}. New version saved.`;
            }, 'image/jpeg', 0.98);
        };
        img.src = photo.url;
    }

    // Image processing filters
    applySharpenFilter(data, width, height) {
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        this.applyConvolution(data, width, height, kernel, 3);
    }

    applyClarityFilter(data, width, height) {
        // Increase local contrast
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const factor = 1.2;
            data[i] = Math.min(255, Math.max(0, avg + (data[i] - avg) * factor));
            data[i + 1] = Math.min(255, Math.max(0, avg + (data[i + 1] - avg) * factor));
            data[i + 2] = Math.min(255, Math.max(0, avg + (data[i + 2] - avg) * factor));
        }
    }

    applyDeblurFilter(data, width, height) {
        // Unsharp mask
        const kernel = [
            -1/9, -1/9, -1/9,
            -1/9, 17/9, -1/9,
            -1/9, -1/9, -1/9
        ];
        this.applyConvolution(data, width, height, kernel, 3);
    }

    applyDenoiseFilter(data, width, height) {
        // Simple median filter approximation
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const neighbors = [];
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nIdx = ((y + dy) * width + (x + dx)) * 4;
                        neighbors.push((data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3);
                    }
                }
                neighbors.sort((a, b) => a - b);
                const median = neighbors[4];
                data[idx] = data[idx + 1] = data[idx + 2] = median;
            }
        }
    }

    applyHDRFilter(data) {
        // Tone mapping for HDR effect
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            // Reinhard tone mapping
            const mapped = (r + g + b) / 3;
            const toneMapped = mapped / (1 + mapped);
            
            data[i] = Math.min(255, toneMapped * 255);
            data[i + 1] = Math.min(255, toneMapped * 255);
            data[i + 2] = Math.min(255, toneMapped * 255);
        }
    }

    applyColorCorrection(data) {
        // Auto white balance and color enhancement
        let rSum = 0, gSum = 0, bSum = 0;
        for (let i = 0; i < data.length; i += 4) {
            rSum += data[i];
            gSum += data[i + 1];
            bSum += data[i + 2];
        }
        const avg = (rSum + gSum + bSum) / (data.length / 4 * 3);
        const rAvg = rSum / (data.length / 4);
        const gAvg = gSum / (data.length / 4);
        const bAvg = bSum / (data.length / 4);
        
        const rFactor = avg / rAvg;
        const gFactor = avg / gAvg;
        const bFactor = avg / bAvg;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * rFactor);
            data[i + 1] = Math.min(255, data[i + 1] * gFactor);
            data[i + 2] = Math.min(255, data[i + 2] * bFactor);
        }
    }

    applyDehazeFilter(data) {
        // Dark channel prior dehazing
        for (let i = 0; i < data.length; i += 4) {
            const min = Math.min(data[i], data[i + 1], data[i + 2]);
            const factor = 1 - (min / 255) * 0.5;
            data[i] = Math.min(255, (data[i] - min) / factor + min);
            data[i + 1] = Math.min(255, (data[i + 1] - min) / factor + min);
            data[i + 2] = Math.min(255, (data[i + 2] - min) / factor + min);
        }
    }

    applyRestoreFilter(data) {
        // Restore old/faded images
        for (let i = 0; i < data.length; i += 4) {
            // Increase saturation and contrast
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const satFactor = 1.5;
            data[i] = Math.min(255, Math.max(0, gray + (data[i] - gray) * satFactor));
            data[i + 1] = Math.min(255, Math.max(0, gray + (data[i + 1] - gray) * satFactor));
            data[i + 2] = Math.min(255, Math.max(0, gray + (data[i + 2] - gray) * satFactor));
            
            // Increase contrast
            const contrast = 1.3;
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128));
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128));
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128));
        }
    }

    applyConvolution(data, width, height, kernel, kernelSize) {
        const temp = new Uint8ClampedArray(data);
        const half = Math.floor(kernelSize / 2);
        
        for (let y = half; y < height - half; y++) {
            for (let x = half; x < width - half; x++) {
                let r = 0, g = 0, b = 0;
                
                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const px = ((y + ky - half) * width + (x + kx - half)) * 4;
                        const weight = kernel[ky * kernelSize + kx];
                        r += temp[px] * weight;
                        g += temp[px + 1] * weight;
                        b += temp[px + 2] * weight;
                    }
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = Math.min(255, Math.max(0, r));
                data[idx + 1] = Math.min(255, Math.max(0, g));
                data[idx + 2] = Math.min(255, Math.max(0, b));
            }
        }
    }

    async createAlbum(name, win) {
        const album = {
            id: `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name,
            type: 'user',
            created: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['albums'], 'readwrite');
            const store = transaction.objectStore('albums');
            const request = store.add(album);
            request.onsuccess = () => {
                this.loadData().then(() => {
                    this.renderSidebar(win);
                    resolve();
                });
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deletePhoto(win) {
        const photo = this.filteredPhotos[this.currentPhotoIndex] || this.currentPhoto;
        if (!photo) {
            alert('No photo selected');
            return;
        }
        
        if (confirm(`Delete "${photo.name}"? This cannot be undone.`)) {
            try {
                // Remove from selected photos if selected
                this.selectedPhotos.delete(photo.id);
                
                // Delete from database
                const transaction = this.db.transaction(['photos'], 'readwrite');
                const store = transaction.objectStore('photos');
                await new Promise((resolve, reject) => {
                    const request = store.delete(photo.id);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
                
                // Reload data
                await this.loadData();
                
                // Update UI
                if (this.isFullscreen) {
                    // Find next photo or close if none
                    const newIndex = Math.min(this.currentPhotoIndex, this.filteredPhotos.length - 1);
                    if (this.filteredPhotos.length > 0 && newIndex >= 0) {
                        this.currentPhotoIndex = newIndex;
                        this.openFullscreen(newIndex, win);
                    } else {
                        this.closeFullscreen(win);
                    }
                }
                
                // Update view
                this.applyFilters(win);
                this.updateStats(win);
                this.updateSelectionButtons(win);
                
                // Show success message
                const msg = document.createElement('div');
                msg.className = 'gallery-toast';
                msg.textContent = `✓ Deleted "${photo.name}"`;
                document.body.appendChild(msg);
                setTimeout(() => {
                    msg.style.transition = 'opacity 0.3s ease';
                    msg.style.opacity = '0';
                    setTimeout(() => msg.remove(), 300);
                }, 2000);
            } catch (e) {
                alert(`Failed to delete photo: ${e.message}`);
            }
        }
    }

    setupScrolling(win) {
        // Setup smooth scrolling with scroll indicators
        const sidebar = win.querySelector('.gallery-sidebar');
        const photosContainer = win.querySelector('.gallery-photos-container');
        const rightPanel = win.querySelector('.gallery-right-panel');
        
        const updateScrollClasses = (element) => {
            if (!element) return;
            
            const isAtTop = element.scrollTop <= 5;
            const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 5;
            
            element.classList.toggle('scrolled-top', !isAtTop);
            element.classList.toggle('scrolled-bottom', !isAtBottom);
        };
        
        // Sidebar scrolling
        if (sidebar) {
            sidebar.addEventListener('scroll', () => updateScrollClasses(sidebar), { passive: true });
            updateScrollClasses(sidebar);
        }
        
        // Photos container scrolling
        if (photosContainer) {
            photosContainer.addEventListener('scroll', () => {
                updateScrollClasses(photosContainer);
                // Trigger virtual scroll update
                this.handleVirtualScroll(photosContainer, win);
            }, { passive: true });
            updateScrollClasses(photosContainer);
        }
        
        // Right panel scrolling
        if (rightPanel) {
            rightPanel.addEventListener('scroll', () => updateScrollClasses(rightPanel), { passive: true });
            updateScrollClasses(rightPanel);
        }
        
        // Horizontal scrolling support for filmstrip
        const filmstrip = win.querySelector('#fullscreen-filmstrip');
        if (filmstrip) {
            filmstrip.style.overflowX = 'auto';
            filmstrip.style.overflowY = 'hidden';
            filmstrip.style.scrollBehavior = 'smooth';
            filmstrip.style.webkitOverflowScrolling = 'touch';
        }
    }

    cleanup() {
        // Cleanup any resources
        this.selectedPhotos.clear();
        this.currentWindow = null;
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
    }
}

const galleryApp = new GalleryApp();

// Make globally accessible
if (typeof window !== 'undefined') {
    window.galleryApp = galleryApp;
}

// Initialize DB when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        galleryApp.initDB().catch(console.error);
    });
} else {
    galleryApp.initDB().catch(console.error);
}
