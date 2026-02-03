// Virtual File System (VFS) - The Brain of AegisDesk Files
// Complete file system abstraction with IndexedDB persistence
// Handles: folders, files, metadata, tags, permissions, trash, history

class VirtualFileSystem {
    constructor() {
        this.dbName = 'AegisDeskVFS';
        this.dbVersion = 1;
        this.db = null;
        this.initialized = false;
        
        // Default folder structure
        this.defaultFolders = [
            { name: 'Documents', type: 'folder', path: '/Documents', parent: '/', icon: 'document' },
            { name: 'Downloads', type: 'folder', path: '/Downloads', parent: '/', icon: 'download' },
            { name: 'Music', type: 'folder', path: '/Music', parent: '/', icon: 'music' },
            { name: 'Pictures', type: 'folder', path: '/Pictures', parent: '/', icon: 'image' },
            { name: 'Videos', type: 'folder', path: '/Videos', parent: '/', icon: 'video' },
            { name: 'Trash', type: 'folder', path: '/Trash', parent: '/', icon: 'trash', system: true }
        ];
        
        this.init();
    }
    
    async init() {
        if (this.initialized) return;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('VFS IndexedDB error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                this.ensureDefaultStructure().then(resolve).catch(reject);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Files store
                if (!db.objectStoreNames.contains('files')) {
                    const filesStore = db.createObjectStore('files', { keyPath: 'id' });
                    filesStore.createIndex('path', 'path', { unique: false });
                    filesStore.createIndex('parent', 'parent', { unique: false });
                    filesStore.createIndex('name', 'name', { unique: false });
                    filesStore.createIndex('type', 'type', { unique: false });
                    filesStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                    filesStore.createIndex('created', 'created', { unique: false });
                    filesStore.createIndex('modified', 'modified', { unique: false });
                }
                
                // File data store (blobs)
                if (!db.objectStoreNames.contains('fileData')) {
                    const dataStore = db.createObjectStore('fileData', { keyPath: 'fileId' });
                    dataStore.createIndex('size', 'size', { unique: false });
                }
                
                // Tags store
                if (!db.objectStoreNames.contains('tags')) {
                    const tagsStore = db.createObjectStore('tags', { keyPath: 'name' });
                    tagsStore.createIndex('color', 'color', { unique: false });
                }
                
                // Smart folders store
                if (!db.objectStoreNames.contains('smartFolders')) {
                    db.createObjectStore('smartFolders', { keyPath: 'id' });
                }
                
                // Favorites store
                if (!db.objectStoreNames.contains('favorites')) {
                    const favStore = db.createObjectStore('favorites', { keyPath: 'path' });
                    favStore.createIndex('added', 'added', { unique: false });
                }
            };
        });
    }
    
    async ensureDefaultStructure() {
        const root = await this.getFolder('/');
        if (!root) {
            // Create root folder
            await this.createFolder('/', 'Root', true);
            
            // Create default folders
            for (const folder of this.defaultFolders) {
                await this.createFolder(folder.parent, folder.name, false, folder);
            }
        }
    }
    
    // File operations
    async createFile(parentPath, name, fileData, metadata = {}) {
        await this.init();
        
        const path = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
        const id = this.generateId();
        const now = Date.now();
        
        // Determine file type
        const fileType = this.getFileType(name, fileData?.type);
        
        // Store file data if provided
        let fileDataId = null;
        if (fileData instanceof File || fileData instanceof Blob) {
            fileDataId = await this.storeFileData(id, fileData);
        }
        
        const file = {
            id,
            name,
            path,
            parent: parentPath,
            type: 'file',
            fileType, // document, image, video, audio, code, pdf, etc.
            size: fileData?.size || metadata.size || 0,
            mimeType: fileData?.type || metadata.mimeType || 'application/octet-stream',
            created: metadata.created || now,
            modified: metadata.modified || now,
            fileDataId,
            tags: metadata.tags || [],
            permissions: metadata.permissions || { read: true, write: true },
            metadata: {
                ...metadata,
                originalName: name
            }
        };
        
        const transaction = this.db.transaction(['files'], 'readwrite');
        await transaction.objectStore('files').put(file);
        
        return file;
    }
    
    async createFolder(parentPath, name, isRoot = false, metadata = {}) {
        await this.init();
        
        const path = isRoot ? '/' : (parentPath === '/' ? `/${name}` : `${parentPath}/${name}`);
        const id = isRoot ? 'root' : this.generateId();
        const now = Date.now();
        
        // Check if folder already exists
        if (!isRoot) {
            const existing = await this.getFile(path);
            if (existing) {
                throw new Error(`Folder "${name}" already exists`);
            }
        }
        
        const folder = {
            id,
            name: isRoot ? 'Root' : name,
            path,
            parent: isRoot ? null : parentPath,
            type: 'folder',
            created: metadata.created || now,
            modified: metadata.modified || now,
            tags: metadata.tags || [],
            permissions: metadata.permissions || { read: true, write: true },
            icon: metadata.icon || 'folder',
            system: metadata.system || false
        };
        
        const transaction = this.db.transaction(['files'], 'readwrite');
        await transaction.objectStore('files').put(folder);
        
        return folder;
    }
    
    async getFile(path) {
        await this.init();
        const transaction = this.db.transaction(['files'], 'readonly');
        const index = transaction.objectStore('files').index('path');
        const request = index.get(path);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getFolder(path) {
        const file = await this.getFile(path);
        if (file && file.type === 'folder') {
            return file;
        }
        return null;
    }
    
    async listFolder(path = '/', options = {}) {
        await this.init();
        const transaction = this.db.transaction(['files'], 'readonly');
        const index = transaction.objectStore('files').index('parent');
        const request = index.getAll(path);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                let files = request.result || [];
                
                // Filter out trashed files unless viewing trash
                if (path !== '/Trash') {
                    files = files.filter(f => !f.trashed);
                }
                
                // Apply filters
                if (options.fileType) {
                    files = files.filter(f => f.fileType === options.fileType);
                }
                
                if (options.tags && options.tags.length > 0) {
                    files = files.filter(f => 
                        options.tags.some(tag => f.tags.includes(tag))
                    );
                }
                
                // Sort
                const sortBy = options.sortBy || 'name';
                const sortOrder = options.sortOrder || 'asc';
                files.sort((a, b) => {
                    let aVal = a[sortBy];
                    let bVal = b[sortBy];
                    
                    if (sortBy === 'name') {
                        aVal = aVal.toLowerCase();
                        bVal = bVal.toLowerCase();
                    }
                    
                    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
                    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
                    return 0;
                });
                
                resolve(files);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    async renameFile(path, newName) {
        await this.init();
        const file = await this.getFile(path);
        if (!file) throw new Error('File not found');
        
        const newPath = file.parent === '/' ? `/${newName}` : `${file.parent}/${newName}`;
        
        // Check if new name already exists
        const existing = await this.getFile(newPath);
        if (existing) throw new Error(`File "${newName}" already exists`);
        
        // Update file
        file.name = newName;
        file.path = newPath;
        file.modified = Date.now();
        
        const transaction = this.db.transaction(['files'], 'readwrite');
        await transaction.objectStore('files').put(file);
        
        // Update all children paths if it's a folder
        if (file.type === 'folder') {
            await this.updateChildrenPaths(path, newPath);
        }
        
        return file;
    }
    
    async updateChildrenPaths(oldParentPath, newParentPath) {
        const children = await this.listFolder(oldParentPath);
        for (const child of children) {
            const newPath = `${newParentPath}/${child.name}`;
            child.path = newPath;
            child.parent = newParentPath;
            
            const transaction = this.db.transaction(['files'], 'readwrite');
            await transaction.objectStore('files').put(child);
            
            if (child.type === 'folder') {
                await this.updateChildrenPaths(child.path, newPath);
            }
        }
    }
    
    async deleteFile(path, permanent = false) {
        await this.init();
        const file = await this.getFile(path);
        if (!file) throw new Error('File not found');
        
        if (permanent) {
            // Permanent delete
            const transaction = this.db.transaction(['files', 'fileData'], 'readwrite');
            await transaction.objectStore('files').delete(file.id);
            
            if (file.fileDataId) {
                try {
                    await transaction.objectStore('fileData').delete(file.fileDataId);
                } catch (e) {
                    // Ignore if fileData doesn't exist
                }
            }
            
            // Delete children if folder
            if (file.type === 'folder') {
                const children = await this.listFolder(path);
                for (const child of children) {
                    await this.deleteFile(child.path, true);
                }
            }
        } else {
            // Move to trash
            const trashPath = '/Trash';
            const trashFolder = await this.getFolder(trashPath);
            if (!trashFolder) {
                await this.createFolder('/', 'Trash', false, { system: true });
            }
            
            file.trashed = true;
            file.trashedAt = Date.now();
            file.originalPath = file.path;
            file.path = `${trashPath}/${file.name}`;
            file.parent = trashPath;
            
            const transaction = this.db.transaction(['files'], 'readwrite');
            await transaction.objectStore('files').put(file);
            
            // Move children if folder
            if (file.type === 'folder') {
                const children = await this.listFolder(path);
                for (const child of children) {
                    await this.deleteFile(child.path, false);
                }
            }
        }
    }
    
    async restoreFromTrash(path) {
        const file = await this.getFile(path);
        if (!file || !file.trashed) throw new Error('File not in trash');
        
        const originalPath = file.originalPath || file.path;
        file.trashed = false;
        file.trashedAt = null;
        file.path = originalPath;
        file.parent = file.path.split('/').slice(0, -1).join('/') || '/';
        delete file.originalPath;
        
        const transaction = this.db.transaction(['files'], 'readwrite');
        await transaction.objectStore('files').put(file);
    }
    
    async copyFile(sourcePath, destinationPath, newName = null) {
        const source = await this.getFile(sourcePath);
        if (!source) throw new Error('Source file not found');
        
        const name = newName || source.name;
        const destPath = destinationPath === '/' ? `/${name}` : `${destinationPath}/${name}`;
        
        // Get file data if exists
        let fileData = null;
        if (source.fileDataId) {
            fileData = await this.getFileData(source.fileDataId);
        }
        
        // Create copy
        const copy = await this.createFile(
            destinationPath,
            name,
            fileData,
            {
                ...source.metadata,
                created: Date.now(),
                modified: Date.now()
            }
        );
        
        // Copy children if folder
        if (source.type === 'folder') {
            const children = await this.listFolder(sourcePath);
            for (const child of children) {
                const childDestPath = `${destPath}/${child.name}`;
                await this.copyFile(child.path, destPath, child.name);
            }
        }
        
        return copy;
    }
    
    async moveFile(sourcePath, destinationPath) {
        const source = await this.getFile(sourcePath);
        if (!source) throw new Error('Source file not found');
        
        const destPath = destinationPath === '/' ? `/${source.name}` : `${destinationPath}/${source.name}`;
        
        // Update file location
        source.parent = destinationPath;
        source.path = destPath;
        source.modified = Date.now();
        
        const transaction = this.db.transaction(['files'], 'readwrite');
        await transaction.objectStore('files').put(source);
        
        // Update children if folder
        if (source.type === 'folder') {
            await this.updateChildrenPaths(sourcePath, destPath);
        }
    }
    
    // File data operations
    async storeFileData(fileId, fileData) {
        await this.init();
        const dataId = `data_${fileId}`;
        
        const transaction = this.db.transaction(['fileData'], 'readwrite');
        await transaction.objectStore('fileData').put({
            fileId: dataId,
            data: fileData,
            size: fileData.size || 0,
            stored: Date.now()
        });
        
        return dataId;
    }
    
    async getFileData(fileDataId) {
        await this.init();
        const transaction = this.db.transaction(['fileData'], 'readonly');
        const request = transaction.objectStore('fileData').get(fileDataId);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.data : null);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    // Tags operations
    async createTag(name, color = '#6366f1') {
        await this.init();
        const tag = {
            name,
            color,
            created: Date.now()
        };
        
        const transaction = this.db.transaction(['tags'], 'readwrite');
        await transaction.objectStore('tags').put(tag);
        return tag;
    }
    
    async getTags() {
        await this.init();
        const transaction = this.db.transaction(['tags'], 'readonly');
        const request = transaction.objectStore('tags').getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
    
    async addTagToFile(path, tagName) {
        const file = await this.getFile(path);
        if (!file) throw new Error('File not found');
        
        if (!file.tags.includes(tagName)) {
            file.tags.push(tagName);
            file.modified = Date.now();
            
            const transaction = this.db.transaction(['files'], 'readwrite');
            await transaction.objectStore('files').put(file);
        }
        
        return file;
    }
    
    async removeTagFromFile(path, tagName) {
        const file = await this.getFile(path);
        if (!file) throw new Error('File not found');
        
        file.tags = file.tags.filter(t => t !== tagName);
        file.modified = Date.now();
        
        const transaction = this.db.transaction(['files'], 'readwrite');
        await transaction.objectStore('files').put(file);
        
        return file;
    }
    
    // Favorites operations
    async addFavorite(path) {
        await this.init();
        const favorite = {
            path,
            added: Date.now()
        };
        
        const transaction = this.db.transaction(['favorites'], 'readwrite');
        await transaction.objectStore('favorites').put(favorite);
        return favorite;
    }
    
    async removeFavorite(path) {
        await this.init();
        const transaction = this.db.transaction(['favorites'], 'readwrite');
        await transaction.objectStore('favorites').delete(path);
    }
    
    async getFavorites() {
        await this.init();
        const transaction = this.db.transaction(['favorites'], 'readonly');
        const request = transaction.objectStore('favorites').getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Search
    async search(query, options = {}) {
        await this.init();
        const transaction = this.db.transaction(['files'], 'readonly');
        const request = transaction.objectStore('files').getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                let files = request.result || [];
                const lowerQuery = query.toLowerCase();
                
                // Filter trashed files
                if (!options.includeTrash) {
                    files = files.filter(f => !f.trashed);
                }
                
                // Search by name
                files = files.filter(f => 
                    f.name.toLowerCase().includes(lowerQuery) ||
                    f.path.toLowerCase().includes(lowerQuery) ||
                    f.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
                );
                
                // Apply filters
                if (options.fileType) {
                    files = files.filter(f => f.fileType === options.fileType);
                }
                
                if (options.path) {
                    files = files.filter(f => f.path.startsWith(options.path));
                }
                
                // Sort by relevance (simple: name matches first)
                files.sort((a, b) => {
                    const aScore = a.name.toLowerCase().indexOf(lowerQuery);
                    const bScore = b.name.toLowerCase().indexOf(lowerQuery);
                    return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
                });
                
                resolve(files.slice(0, options.limit || 100));
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    // Utilities
    getFileType(filename, mimeType) {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        
        if (['pdf'].includes(ext)) return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
        if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) return 'video';
        if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio';
        if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'md'].includes(ext)) return 'code';
        if (['txt', 'md', 'rtf'].includes(ext)) return 'text';
        if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'document';
        
        // Check mime type as fallback
        if (mimeType) {
            if (mimeType.startsWith('image/')) return 'image';
            if (mimeType.startsWith('video/')) return 'video';
            if (mimeType.startsWith('audio/')) return 'audio';
            if (mimeType.startsWith('text/')) return 'text';
            if (mimeType === 'application/pdf') return 'pdf';
        }
        
        return 'file';
    }
    
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    generateId() {
        return `vfs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async getRecentFiles(limit = 20) {
        await this.init();
        const transaction = this.db.transaction(['files'], 'readonly');
        const request = transaction.objectStore('files').index('modified').openCursor(null, 'prev');
        
        const files = [];
        return new Promise((resolve, reject) => {
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && files.length < limit) {
                    if (!cursor.value.trashed) {
                        files.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(files);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
}

// Create singleton instance
const vfs = new VirtualFileSystem();
if (typeof window !== 'undefined') {
    window.vfs = vfs;
}
