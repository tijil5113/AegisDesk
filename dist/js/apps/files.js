// Files App - Enhanced file explorer with full features
class FilesApp {
    constructor() {
        this.windowId = 'files';
        this.files = storage.get('files', []);
        this.fileHandles = storage.get('fileHandles', []); // Store file handles (permissions)
        this.directoryHandle = null;
        this.supportsFileSystemAccess = 'showDirectoryPicker' in window;
        this.navigationHistory = []; // Store navigation path
        this.currentPath = storage.get('files_current_path', []); // Current breadcrumb path
        this.clipboard = storage.get('files_clipboard', null); // For copy/cut/paste
        this.clipboardAction = storage.get('files_clipboard_action', null); // 'copy' or 'cut'
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Files',
            width: 900,
            height: 600,
            class: 'app-files',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                <path d="M14 2v6h6"></path>
                <path d="M12 18v-6"></path>
                <path d="M9 15h6"></path>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
    }

    render() {
        const breadcrumbHTML = this.renderBreadcrumb();
        const filesHTML = this.files.length > 0 ? this.files.map((file, index) => `
            <div class="file-item" data-index="${index}" data-type="${file.type}">
                <div class="file-icon">
                    ${file.type === 'folder' ? 
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path></svg>' :
                        this.getFileIcon(file.name)
                    }
                </div>
                <div class="file-name">${this.escapeHtml(file.name)}</div>
                <div class="file-size">${file.size || '-'}</div>
                <div class="file-date">${file.date || new Date().toLocaleDateString()}</div>
            </div>
        `).join('') : this.renderEmpty();

        return `
            <div class="files-container">
                <div class="files-toolbar">
                    <button class="files-btn" id="go-back" ${this.navigationHistory.length === 0 ? 'disabled' : ''} title="Go Back">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Back
                    </button>
                    <button class="files-btn" id="go-forward" title="Go Forward">Forward</button>
                    ${this.supportsFileSystemAccess ? `
                        <button class="files-btn" id="select-folder">Select Folder</button>
                    ` : ''}
                    <button class="files-btn" id="new-folder">New Folder</button>
                    <button class="files-btn" id="upload-file">Upload File</button>
                    <button class="files-btn" id="paste-btn" ${this.clipboard ? '' : 'disabled'} title="Paste">Paste</button>
                    <button class="files-btn" id="refresh">Refresh</button>
                    <button class="files-btn" id="exit-btn" title="Exit">Exit</button>
                </div>
                ${breadcrumbHTML}
                ${!this.supportsFileSystemAccess ? `
                    <div class="files-info-banner">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>File System Access API not supported. Using browser-based file storage.</span>
                    </div>
                ` : ''}
                <div class="files-list">
                    ${filesHTML}
                </div>
            </div>
        `;
    }

    renderBreadcrumb() {
        if (this.currentPath.length === 0) {
            return '<div class="files-breadcrumb"><span class="breadcrumb-item active">Home</span></div>';
        }

        const items = this.currentPath.map((path, index) => {
            const isLast = index === this.currentPath.length - 1;
            return `<span class="breadcrumb-item ${isLast ? 'active' : ''}" data-index="${index}">${this.escapeHtml(path)}</span>`;
        }).join('<span class="breadcrumb-separator">›</span>');

        return `<div class="files-breadcrumb">
            <span class="breadcrumb-item" data-index="-1">Home</span>
            ${this.currentPath.length > 0 ? '<span class="breadcrumb-separator">›</span>' + items : ''}
        </div>`;
    }

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>',
            txt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>',
            doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>',
            docx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>',
            image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'
        };

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
            return iconMap.image;
        }

        return iconMap[ext] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><path d="M14 2v6h6"></path></svg>';
    }
    
    renderEmpty() {
        return `
            <div class="files-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 004.43 2H4a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                <p>No files yet. Select a folder or upload files to get started.</p>
            </div>
        `;
    }

    attachEvents(window) {
        const content = window.querySelector('.window-content');
        
        // Toolbar buttons
        const goBackBtn = content.querySelector('#go-back');
        const goForwardBtn = content.querySelector('#go-forward');
        const selectFolderBtn = content.querySelector('#select-folder');
        const newFolderBtn = content.querySelector('#new-folder');
        const uploadFileBtn = content.querySelector('#upload-file');
        const pasteBtn = content.querySelector('#paste-btn');
        const refreshBtn = content.querySelector('#refresh');
        const exitBtn = content.querySelector('#exit-btn');
        const fileList = content.querySelector('.files-list');
        const breadcrumb = content.querySelector('.files-breadcrumb');
        
        // Navigation
        if (goBackBtn) {
            goBackBtn.addEventListener('click', () => {
                this.goBack(window);
            });
        }

        if (goForwardBtn) {
            goForwardBtn.addEventListener('click', () => {
                // Forward navigation would require storing forward history
                // For now, this is a placeholder
            });
        }

        // Breadcrumb navigation
        if (breadcrumb) {
            breadcrumb.addEventListener('click', (e) => {
                const item = e.target.closest('.breadcrumb-item');
                if (item) {
                    const index = parseInt(item.dataset.index);
                    this.navigateToPath(window, index);
                }
            });
        }
        
        // Select folder (File System Access API)
        if (selectFolderBtn) {
            selectFolderBtn.addEventListener('click', async () => {
                await this.selectFolder();
                this.refresh(window);
            });
        }
        
        // New folder
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => {
                this.createNewFolder(window);
            });
        }
        
        // Upload file
        if (uploadFileBtn) {
            uploadFileBtn.addEventListener('click', () => {
                this.uploadFile(window);
            });
        }

        // Paste
        if (pasteBtn) {
            pasteBtn.addEventListener('click', () => {
                this.pasteFile(window);
            });
        }
        
        // Refresh
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refresh(window);
            });
        }

        // Exit
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                windowManager.closeWindow(window);
            });
        }
        
        // File item clicks and context menu
        if (fileList) {
            fileList.addEventListener('click', (e) => {
                const fileItem = e.target.closest('.file-item');
                if (fileItem && !e.target.closest('.file-action-btn')) {
                    const index = parseInt(fileItem.dataset.index);
                    const file = this.files[index];
                    if (file) {
                        if (file.type === 'folder') {
                            this.openFolder(file, window);
                        } else {
                            this.openFile(file);
                        }
                    }
                }
            });
            
            // Context menu for file operations
            fileList.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const fileItem = e.target.closest('.file-item');
                if (fileItem) {
                    const index = parseInt(fileItem.dataset.index);
                    this.showFileContextMenu(e, index, window);
                }
            });
        }
    }

    navigateToPath(window, index) {
        if (index === -1) {
            // Navigate to root
            this.currentPath = [];
            this.loadRootDirectory(window);
        } else {
            // Navigate to path at index
            this.currentPath = this.currentPath.slice(0, index + 1);
            // Would need to load directory at this path
        }
        this.refresh(window);
    }

    loadRootDirectory(window) {
        // Reset to root directory
        // This would reload the root files
        this.refresh(window);
    }

    goBack(window) {
        if (this.navigationHistory.length > 0) {
            const previousState = this.navigationHistory.pop();
            this.files = previousState.files;
            this.currentPath = previousState.path;
            this.refresh(window);
        }
    }

    createNewFolder(window) {
        const name = prompt('Enter folder name:');
        if (!name || !name.trim()) return;
        
        const folder = {
            name: name.trim(),
            type: 'folder',
            size: '-',
            date: new Date().toLocaleDateString(),
            id: Date.now().toString()
        };
        
        this.files.push(folder);
        this.save();
        this.refresh(window);
    }

    showFileContextMenu(e, index, window) {
        const file = this.files[index];
        if (!file) return;
        
        // Remove existing context menu
        const existing = document.querySelector('.file-context-menu');
        if (existing) existing.remove();
        
        // Calculate menu position to ensure it stays within viewport
        const menuWidth = 220;
        const estimatedMenuItemHeight = 38; // Approximate height per item
        const menuItemCount = 18; // Approximate number of items
        const estimatedMenuHeight = menuItemCount * estimatedMenuItemHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 10;
        const taskbarHeight = 56;
        
        let menuTop = e.clientY;
        let menuLeft = e.clientX;
        
        // Adjust horizontal position if menu goes off-screen
        if (menuLeft + menuWidth > viewportWidth - padding) {
            menuLeft = viewportWidth - menuWidth - padding;
        }
        if (menuLeft < padding) {
            menuLeft = padding;
        }
        
        // Calculate available height
        const availableHeightBelow = viewportHeight - menuTop - taskbarHeight - padding;
        const availableHeightAbove = menuTop - padding;
        const maxMenuHeight = Math.min(estimatedMenuHeight, viewportHeight - taskbarHeight - (padding * 2));
        
        // Adjust vertical position if menu goes off-screen
        if (menuTop + estimatedMenuHeight > viewportHeight - taskbarHeight - padding) {
            // Position above cursor if there's more space
            if (availableHeightAbove > availableHeightBelow) {
                menuTop = Math.max(padding, menuTop - maxMenuHeight);
            } else {
                // Position below but limit height
                menuTop = Math.min(menuTop, viewportHeight - taskbarHeight - maxMenuHeight - padding);
            }
        }
        
        // Ensure menu doesn't go above viewport
        if (menuTop < padding) {
            menuTop = padding;
        }
        
        const menu = document.createElement('div');
        menu.className = 'file-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${menuTop}px;
            left: ${menuLeft}px;
            background: rgba(30, 41, 59, 0.98);
            backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 4px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            min-width: ${menuWidth}px;
            max-height: ${Math.min(maxMenuHeight, viewportHeight - menuTop - taskbarHeight - padding)}px;
            overflow-y: auto;
            overflow-x: hidden;
        `;

        const menuItems = [
            { action: 'open', label: 'Open', icon: 'open' },
            { action: 'open-with', label: 'Open With...', icon: 'open' },
            { separator: true },
            { action: 'cut', label: 'Cut', icon: 'cut' },
            { action: 'copy', label: 'Copy', icon: 'copy' },
            { action: 'paste', label: 'Paste', icon: 'paste', disabled: !this.clipboard },
            { separator: true },
            { action: 'rename', label: 'Rename', icon: 'rename' },
            { action: 'delete', label: 'Delete', icon: 'delete', danger: true },
            { separator: true },
            { action: 'properties', label: 'Properties', icon: 'properties' },
            { separator: true },
            { action: 'download', label: 'Download', icon: 'download', show: file.type === 'file' },
            { action: 'share', label: 'Share', icon: 'share', show: file.type === 'file' },
            { separator: true },
            { action: 'add-new-folder', label: 'New Folder', icon: 'folder' },
            { action: 'add-new-file', label: 'New File', icon: 'file' },
            { separator: true },
            { action: 'go-back-menu', label: 'Go Back', icon: 'back', disabled: this.navigationHistory.length === 0 },
            { action: 'refresh-menu', label: 'Refresh', icon: 'refresh' },
            { separator: true },
            { action: 'exit', label: 'Exit', icon: 'exit', danger: true }
        ];

        let menuHTML = '';
        menuItems.forEach(item => {
            if (item.separator) {
                menuHTML += '<div class="context-menu-separator"></div>';
            } else if (item.show !== false) {
                menuHTML += `
                    <button class="context-menu-item ${item.danger ? 'danger' : ''}" 
                            data-action="${item.action}" 
                            ${item.disabled ? 'disabled' : ''}>
                        ${item.label}
                    </button>
                `;
            }
        });
        
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);
        
        menu.querySelectorAll('.context-menu-item').forEach(btn => {
            if (btn.disabled) {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.style.cssText = `
                    width: 100%;
                    padding: 10px 16px;
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    text-align: left;
                    cursor: pointer;
                    border-radius: 4px;
                    font-size: 13px;
                    transition: all 0.2s ease;
                `;
                
                btn.addEventListener('mouseenter', () => {
                    if (!btn.disabled) {
                        btn.style.background = btn.classList.contains('danger') 
                            ? 'rgba(239, 68, 68, 0.2)' 
                            : 'rgba(99, 102, 241, 0.2)';
                    }
                });
                
                btn.addEventListener('mouseleave', () => {
                    if (!btn.disabled) {
                        btn.style.background = 'transparent';
                    }
                });
                
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!btn.disabled) {
                        this.handleContextMenuAction(btn.dataset.action, index, window);
                        menu.remove();
                    }
                });
            }
        });
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }, { once: true });
        }, 100);
    }

    handleContextMenuAction(action, index, window) {
        const file = this.files[index];
        
            switch (action) {
            case 'open':
                if (file.type === 'folder') {
                    this.openFolder(file, window);
                } else {
                    this.openFile(file);
                }
                break;
            case 'open-with':
                // Open with dialog (placeholder)
                alert('Open with feature coming soon!');
                break;
            case 'cut':
                this.clipboard = file;
                this.clipboardAction = 'cut';
                this.refresh(window);
                break;
            case 'copy':
                this.clipboard = file;
                this.clipboardAction = 'copy';
                this.refresh(window);
                break;
            case 'paste':
                this.pasteFile(window);
                break;
            case 'rename':
                this.renameFile(index, window);
                break;
            case 'delete':
                this.deleteFile(index, window);
                break;
            case 'properties':
                this.showProperties(file, window);
                break;
            case 'download':
                this.downloadFile(file);
                break;
            case 'share':
                this.shareFile(file);
                break;
            case 'add-new-folder':
                this.createNewFolder(window);
                break;
            case 'add-new-file':
                this.createNewFile(window);
                break;
            case 'go-back-menu':
                this.goBack(window);
                break;
            case 'refresh-menu':
                this.refresh(window);
                break;
            case 'exit':
                windowManager.closeWindow(window);
                break;
        }
    }

    pasteFile(window) {
        if (!this.clipboard) return;

        if (this.clipboardAction === 'cut') {
            // Move file
            const index = this.files.findIndex(f => f.id === this.clipboard.id);
            if (index !== -1) {
                this.files[index].name = this.clipboard.name + ' (moved)';
                // In a real implementation, you'd move the file
            }
            this.clipboard = null;
            this.clipboardAction = null;
        } else {
            // Copy file
            const newFile = {
                ...this.clipboard,
                name: this.clipboard.name + ' (copy)',
                id: Date.now().toString(),
                date: new Date().toLocaleDateString()
            };
            this.files.push(newFile);
        }

        this.save();
        this.refresh(window);
    }

    createNewFile(window) {
        const name = prompt('Enter file name:');
        if (!name || !name.trim()) return;
        
        const newFile = {
            name: name.trim(),
            type: 'file',
            size: '0 Bytes',
            date: new Date().toLocaleDateString(),
            id: Date.now().toString(),
            content: '' // Empty file
        };
        
        this.files.push(newFile);
        this.save();
        this.refresh(window);
    }

    showProperties(file, window) {
        const properties = `
Name: ${file.name}
Type: ${file.type}
Size: ${file.size || 'Unknown'}
Date: ${file.date || 'Unknown'}
${file.url ? `Location: ${file.url}` : ''}
        `.trim();

        alert(properties);
    }

    shareFile(file) {
        if (file.url) {
            if (navigator.share) {
                navigator.share({
                    title: file.name,
                    url: file.url
                }).catch(err => console.log('Error sharing:', err));
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(file.url).then(() => {
                    alert('File URL copied to clipboard!');
                });
            }
        }
    }

    downloadFile(file) {
        if (file.url) {
            const a = document.createElement('a');
            a.href = file.url;
            a.download = file.name;
            a.click();
        } else if (file.handle && file.handle.kind === 'file') {
            file.handle.getFile().then(fileData => {
                const url = URL.createObjectURL(fileData);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                a.click();
                URL.revokeObjectURL(url);
            });
        }
    }
    
    renameFile(index, window) {
        const file = this.files[index];
        if (!file) return;
        
        const newName = prompt('Enter new name:', file.name);
        if (!newName || !newName.trim() || newName === file.name) return;
        
        file.name = newName.trim();
        this.save();
        this.refresh(window);
    }
    
    deleteFile(index, window) {
        const file = this.files[index];
        if (!file) return;
        
        if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
            this.files.splice(index, 1);
            this.save();
            this.refresh(window);
        }
    }
    
    async selectFolder() {
        if (!this.supportsFileSystemAccess) {
            alert('File System Access API is not supported in this browser.');
            return;
        }
        
        try {
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            
            // Read directory contents
            await this.readDirectory(this.directoryHandle);
            this.currentPath = [];
            this.navigationHistory = [];
            this.save();
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error selecting folder:', error);
                alert('Could not access folder. Please ensure you grant permission.');
            }
        }
    }
    
    async readDirectory(directoryHandle) {
        this.files = [];
        
        try {
            for await (const [name, handle] of directoryHandle.entries()) {
                const file = {
                    name: name,
                    type: handle.kind === 'directory' ? 'folder' : 'file',
                    handle: handle, // Store handle for later access
                    date: new Date().toLocaleDateString(),
                    id: Date.now().toString() + Math.random()
                };
                
                if (handle.kind === 'file') {
                    try {
                        const fileHandle = await directoryHandle.getFileHandle(name);
                        const fileData = await fileHandle.getFile();
                        file.size = this.formatFileSize(fileData.size);
                        file.mimeType = fileData.type;
                    } catch (err) {
                        file.size = 'Unknown';
                    }
                } else {
                    file.size = '-';
                }
                
                this.files.push(file);
            }
        } catch (error) {
            console.error('Error reading directory:', error);
        }
    }
    
    async openFolder(folder, window) {
        console.log('Opening folder:', folder);
        
        // Save current state to history
        this.navigationHistory.push({
            files: [...this.files],
            path: [...this.currentPath]
        });

        if (folder.handle && folder.handle.kind === 'directory') {
            try {
                this.currentPath.push(folder.name);
                this.directoryHandle = folder.handle;
                await this.readDirectory(folder.handle);
                this.save();
                this.refresh(window);
            } catch (error) {
                console.error('Error opening folder:', error);
                alert('Could not access folder. Permission may have been revoked.');
                // Restore previous state on error
                const previousState = this.navigationHistory.pop();
                if (previousState) {
                    this.files = previousState.files;
                    this.currentPath = previousState.path;
                    this.refresh(window);
                }
            }
        } else {
            // Virtual folder navigation - create a subfolder view
            this.currentPath.push(folder.name);
            
            // For virtual folders, filter files by folder
            const currentFolderId = folder.id;
            const subFolderFiles = this.files.filter(f => 
                (f.folder === currentFolderId || f.parentFolder === currentFolderId) && f.id !== currentFolderId
            );
            
            if (subFolderFiles.length > 0) {
                this.files = subFolderFiles;
            } else {
                // Empty folder - clear files to show empty state
                this.files = [];
            }
            
            this.save();
            this.refresh(window);
        }
    }
    
    async openFile(file) {
        console.log('Opening file:', file);
        let fileUrl = '';
        let mimeType = '';

        try {
            // Try multiple methods to get file data
            if (file.handle && file.handle.kind === 'file') {
                // File from File System Access API
                try {
                    const fileHandle = await file.handle.getFile();
                    fileUrl = URL.createObjectURL(fileHandle);
                    mimeType = fileHandle.type;
                    console.log('File opened from handle, URL:', fileUrl, 'MIME:', mimeType);
                } catch (error) {
                    console.error('Error opening file from handle:', error);
                    // Continue to try other methods
                }
            }
            
            // If we don't have a URL yet, try IndexedDB
            if (!fileUrl && file.fileId) {
                try {
                    const blob = await this.getFileFromIndexedDB(file.fileId);
                    fileUrl = URL.createObjectURL(blob);
                    mimeType = file.mimeType || blob.type || '';
                    console.log('File opened from IndexedDB, URL:', fileUrl, 'MIME:', mimeType);
                } catch (error) {
                    console.error('Error retrieving file from IndexedDB:', error);
                    // Continue to try other methods
                }
            }
            
            // Try existing URL (even if it might be expired, let the viewer try)
            if (!fileUrl && file.url) {
                fileUrl = file.url;
                mimeType = file.mimeType || '';
                console.log('File opened from stored URL:', fileUrl, 'MIME:', mimeType);
                
                // Try to validate the URL is still accessible
                try {
                    const response = await fetch(fileUrl, { method: 'HEAD' });
                    if (!response.ok) {
                        console.warn('File URL may be expired, but will try to open anyway');
                    }
                } catch (e) {
                    console.warn('Could not validate file URL, but will try to open anyway:', e);
                }
            }
            
            // Try blob reference
            if (!fileUrl && file.blob) {
                fileUrl = URL.createObjectURL(file.blob);
                mimeType = file.mimeType || file.blob.type || '';
                console.log('File opened from blob, URL:', fileUrl, 'MIME:', mimeType);
            }
            
            // Try to find file in IndexedDB by name (for legacy files)
            if (!fileUrl && file.name) {
                try {
                    const blob = await this.findFileInIndexedDBByName(file.name);
                    fileUrl = URL.createObjectURL(blob);
                    mimeType = file.mimeType || blob.type || '';
                    console.log('File found in IndexedDB by name, URL:', fileUrl);
                } catch (error) {
                    console.log('File not found in IndexedDB by name:', error.message);
                    // Continue to try other methods
                }
            }
            
            // If we still don't have a URL, check if it's a text file we can create
            if (!fileUrl && file.content !== undefined) {
                // File has text content
                const blob = new Blob([file.content], { type: file.mimeType || 'text/plain' });
                fileUrl = URL.createObjectURL(blob);
                mimeType = file.mimeType || 'text/plain';
                console.log('File opened from content, URL:', fileUrl);
            }
            
            // Final check - if we have a URL, open it (even if it might fail, let the viewer handle it)
            if (fileUrl) {
                this.openFileViewer(file, fileUrl, mimeType);
            } else {
                console.error('File has no accessible data:', file);
                // Show a more helpful error message
                const errorMsg = `Cannot open "${file.name}". The file data may have been lost.\n\n` +
                    `Please try:\n` +
                    `1. Re-uploading the file\n` +
                    `2. Selecting the folder again if using File System Access API\n` +
                    `3. Checking if the file still exists in the original location`;
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Error opening file: ' + error.message);
        }
    }
    
    openFileViewer(file, fileUrl, mimeType) {
        try {
            const viewerUrl = `file-viewer.html?name=${encodeURIComponent(file.name)}&url=${encodeURIComponent(fileUrl)}&type=${encodeURIComponent(file.type)}&mime=${encodeURIComponent(mimeType)}`;
            const viewerWindow = window.open(viewerUrl, '_blank', 'width=1000,height=700,scrollbars=yes');
            
            if (!viewerWindow) {
                alert('Popup blocked! Please allow popups for this site to view files.');
            }
        } catch (error) {
            console.error('Error opening file viewer:', error);
            alert('Error opening file viewer: ' + error.message);
        }
    }
    
    async uploadFile(window) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        
        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            
            for (const file of files) {
                try {
                    // Convert file to base64 for storage (for files < 10MB)
                    let fileDataUrl = null;
                    let fileBase64 = null;
                    
                    if (file.size < 10 * 1024 * 1024) { // 10MB limit
                        fileBase64 = await this.fileToBase64(file);
                    } else {
                        // For large files, use blob URL (temporary)
                        fileDataUrl = URL.createObjectURL(file);
                    }
                    
                    // Store file data in IndexedDB
                    const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                    await this.storeFileInIndexedDB(fileId, file, fileBase64);
                    
                    const fileData = {
                        name: file.name,
                        type: 'file',
                        size: this.formatFileSize(file.size),
                        date: new Date().toLocaleDateString(),
                        url: fileDataUrl, // Temporary blob URL for large files
                        fileId: fileId, // IndexedDB key
                        mimeType: file.type,
                        id: fileId,
                        hasBase64: !!fileBase64
                    };
                    
                    this.files.push(fileData);
                } catch (error) {
                    console.error('Error uploading file:', error);
                    alert(`Error uploading ${file.name}: ${error.message}`);
                }
            }
            
            this.save();
            this.refresh(window);
        });
        
        input.click();
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async storeFileInIndexedDB(fileId, file, base64Data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AegisDeskFiles', 2);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['files'], 'readwrite');
                const store = transaction.objectStore('files');
                store.put({
                    id: fileId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64Data || null,
                    lastModified: file.lastModified || Date.now()
                });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    const objectStore = db.createObjectStore('files', { keyPath: 'id' });
                    objectStore.createIndex('name', 'name', { unique: false });
                } else {
                    // Upgrade existing store
                    const objectStore = e.target.transaction.objectStore('files');
                    if (!objectStore.indexNames.contains('name')) {
                        objectStore.createIndex('name', 'name', { unique: false });
                    }
                }
            };
        });
    }
    
    async getFileFromIndexedDB(fileId) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AegisDeskFiles', 2);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('files')) {
                    reject(new Error('File store not found'));
                    return;
                }
                
                const transaction = db.transaction(['files'], 'readonly');
                const store = transaction.objectStore('files');
                const getRequest = store.get(fileId);
                
                getRequest.onsuccess = () => {
                    const fileData = getRequest.result;
                    if (fileData) {
                        if (fileData.data) {
                            // Convert base64 data URL back to blob
                            fetch(fileData.data)
                                .then(res => res.blob())
                                .then(blob => resolve(blob))
                                .catch(reject);
                        } else {
                            reject(new Error('File data not available'));
                        }
                    } else {
                        reject(new Error('File not found'));
                    }
                };
                
                getRequest.onerror = () => reject(getRequest.error);
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    const objectStore = db.createObjectStore('files', { keyPath: 'id' });
                    objectStore.createIndex('name', 'name', { unique: false });
                }
            };
        });
    }
    
    async findFileInIndexedDBByName(fileName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AegisDeskFiles', 2);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('files')) {
                    reject(new Error('File store not found'));
                    return;
                }
                
                const transaction = db.transaction(['files'], 'readonly');
                const store = transaction.objectStore('files');
                
                // Try to use name index if available
                let getRequest;
                if (store.indexNames.contains('name')) {
                    const index = store.index('name');
                    getRequest = index.get(fileName);
                } else {
                    // Fallback: iterate through all files
                    getRequest = store.openCursor();
                    getRequest.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            if (cursor.value.name === fileName) {
                                const fileData = cursor.value;
                                if (fileData.data) {
                                    fetch(fileData.data)
                                        .then(res => res.blob())
                                        .then(blob => resolve(blob))
                                        .catch(reject);
                                    return;
                                }
                            }
                            cursor.continue();
                        } else {
                            reject(new Error('File not found'));
                        }
                    };
                    getRequest.onerror = () => reject(getRequest.error);
                    return;
                }
                
                getRequest.onsuccess = () => {
                    const fileData = getRequest.result;
                    if (fileData) {
                        if (fileData.data) {
                            fetch(fileData.data)
                                .then(res => res.blob())
                                .then(blob => resolve(blob))
                                .catch(reject);
                        } else {
                            reject(new Error('File data not available'));
                        }
                    } else {
                        reject(new Error('File not found'));
                    }
                };
                
                getRequest.onerror = () => reject(getRequest.error);
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    const objectStore = db.createObjectStore('files', { keyPath: 'id' });
                    objectStore.createIndex('name', 'name', { unique: false });
                }
            };
        });
    }
    
    formatFileSize(bytes) {
        if (typeof bytes === 'string') return bytes;
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    refresh(window) {
        const content = window.querySelector('.window-content');
        content.innerHTML = this.render();
        this.attachEvents(window);
    }
    
    save() {
        // Save metadata (file handles cannot be serialized, but fileId can)
        const fileMetadata = this.files.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size,
            date: f.date,
            url: f.url, // Blob URLs may expire, but we'll try
            fileId: f.fileId, // IndexedDB key for retrieval
            mimeType: f.mimeType,
            id: f.id,
            hasBase64: f.hasBase64
        }));
        storage.set('files', fileMetadata);
        storage.set('files_current_path', this.currentPath);
        storage.set('files_clipboard', this.clipboard);
        storage.set('files_clipboard_action', this.clipboardAction);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const filesApp = new FilesApp();