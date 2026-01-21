// Enhanced Storage Manager with IndexedDB fallback
class StorageManager {
    constructor() {
        this.prefix = 'aegisdesk_';
        this.db = null;
        this.dbName = 'AegisDeskDB';
        this.dbVersion = 1;
        this.initIndexedDB();
    }

    async initIndexedDB() {
        if (!('indexedDB' in window)) return;
        
        try {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = () => console.warn('IndexedDB not available');
            request.onsuccess = () => {
                this.db = request.result;
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('data')) {
                    db.createObjectStore('data');
                }
            };
        } catch (e) {
            console.warn('IndexedDB initialization failed:', e);
        }
    }

    set(key, value) {
        try {
            const data = JSON.stringify(value);
            const size = new Blob([data]).size;
            
            // Use IndexedDB for large data (>1MB)
            if (size > 1024 * 1024 && this.db) {
                return this.setIndexedDB(key, value);
            }
            
            localStorage.setItem(this.prefix + key, data);
            return true;
        } catch (e) {
            // Quota exceeded - try IndexedDB
            if (e.name === 'QuotaExceededError' && this.db) {
                return this.setIndexedDB(key, value);
            }
            console.error('Storage set error:', e);
            return false;
        }
    }

    async setIndexedDB(key, value) {
        if (!this.db) return false;
        try {
            const transaction = this.db.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');
            await store.put(value, this.prefix + key);
            return true;
        } catch (e) {
            console.error('IndexedDB set error:', e);
            return false;
        }
    }

    get(key, defaultValue = null) {
        try {
            // Try localStorage first
            const item = localStorage.getItem(this.prefix + key);
            if (item !== null) {
                return JSON.parse(item);
            }
            
            // Try IndexedDB if available
            if (this.db) {
                return this.getIndexedDB(key, defaultValue);
            }
            
            return defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    }

    async getIndexedDB(key, defaultValue) {
        if (!this.db) return defaultValue;
        try {
            const transaction = this.db.transaction(['data'], 'readonly');
            const store = transaction.objectStore('data');
            const request = store.get(this.prefix + key);
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    resolve(request.result !== undefined ? request.result : defaultValue);
                };
                request.onerror = () => resolve(defaultValue);
            });
        } catch (e) {
            return defaultValue;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    }

    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }

    getAll() {
        const items = {};
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    const cleanKey = key.replace(this.prefix, '');
                    items[cleanKey] = this.get(cleanKey);
                }
            });
        } catch (e) {
            console.error('Storage getAll error:', e);
        }
        return items;
    }
}

const storage = new StorageManager();

